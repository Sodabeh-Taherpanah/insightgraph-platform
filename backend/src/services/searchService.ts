import { Client } from '@elastic/elasticsearch';
import {
  CACHE_TTL,
  cacheKey,
  getCached,
  invalidatePattern,
  setCached,
} from './redisService';

const ES_NODE = process.env.ES_NODE || 'http://localhost:9200';
const INDEX = process.env.ES_INDEX || 'insightgraph';
// Elasticsearch is used as a full-text search engine (keyword/text matching)
const client = new Client({ node: ES_NODE });

interface DocumentSource {
  title: string;
  text: string;
  createdAt: string;
  // Chunk metadata (optional - for chunked documents)
  sourceId?: string; // Original document ID
  sourceTitle?: string; // Original document title
  chunkIndex?: number;
  startPosition?: number;
  endPosition?: number;
  totalChunks?: number;
}

export type { DocumentSource };

/**
 * Ensure index exists with enhanced mapping for chunked documents
 */
export async function ensureIndex() {
  const exists = await client.indices.exists({ index: INDEX });
  if (!exists) {
    await client.indices.create({
      index: INDEX,
      body: {
        mappings: {
          properties: {
            title: { type: 'text' },
            text: { type: 'text' },
            createdAt: { type: 'date' },
            // Chunk metadata
            sourceId: { type: 'keyword' },
            sourceTitle: { type: 'text' },
            chunkIndex: { type: 'integer' },
            startPosition: { type: 'integer' },
            endPosition: { type: 'integer' },
            totalChunks: { type: 'integer' },
          },
        },
      } as any,
    });
  }
}

export async function indexDocument(doc: {
  id: string;
  title: string;
  text: string;
  createdAt: string;
  sourceId?: string;
  sourceTitle?: string;
  chunkIndex?: number;
  startPosition?: number;
  endPosition?: number;
  totalChunks?: number;
}) {
  await ensureIndex();
  await client.index({
    index: INDEX,
    id: doc.id,
    document: doc,
    refresh: true,
  });

  // Invalidate search/context cache so new docs are visible immediately.
  await invalidatePattern('search:*');
  await invalidatePattern('context:*');

  return { id: doc.id };
}

export async function searchDocuments(query: string, size = 10) {
  await ensureIndex();

  const key = cacheKey('search', query, size);
  const cached = await getCached<any[]>(key);
  if (cached) return cached;

  const resp = await client.search({
    index: INDEX,
    size,
    query: {
      multi_match: {
        query,
        fields: ['title^2', 'text'],
      },
    },
    highlight: {
      pre_tags: [''],
      post_tags: [''],
      fields: {
        text: { number_of_fragments: 3, fragment_size: 200 },
        title: { number_of_fragments: 1, fragment_size: 120 },
      },
    },
  });
  //formats Elasticsearch results into a simple array (id, score, source, highlights), caches it in Redis
  // Return highlights where available to support lightweight RAG.
  const hits = resp.hits.hits.map((h) => ({
    id: h._id,
    score: h._score,
    source: h._source as DocumentSource,
    highlights: (h.highlight && (h.highlight.text || h.highlight.title)) || [],
  }));

  await setCached(key, hits, CACHE_TTL);
  return hits;
}

/**
 * Retrieve a trimmed context for a query using highlights from ES.
 * Returns concatenated top fragments from top documents.
 */
export async function retrieveContext(
  query: string,
  topDocs = 5,
  fragmentsPerDoc = 3,
) {
  await ensureIndex();

  const key = cacheKey('context', query, topDocs, fragmentsPerDoc);
  const cached = await getCached<string>(key);
  if (cached) return cached;

  const resp = await client.search({
    index: INDEX,
    size: topDocs,
    query: {
      multi_match: {
        query,
        fields: ['title^2', 'text'],
      },
    },
    highlight: {
      pre_tags: [''],
      post_tags: [''],
      fields: {
        text: { number_of_fragments: fragmentsPerDoc, fragment_size: 200 },
        title: { number_of_fragments: 1, fragment_size: 120 },
      },
    },
  });

  const fragments: string[] = [];
  for (const h of resp.hits.hits) {
    if (h.highlight) {
      const txt = h.highlight.text || [];
      for (const frag of txt.slice(0, fragmentsPerDoc)) {
        fragments.push(frag);
      }
    } else if (h._source && (h._source as any).text) {
      // Fallback: take the first 200 chars when no highlight exists.
      fragments.push(((h._source as any).text as string).slice(0, 200));
    }
  }

  // Join with separators and cap overall context length.
  const joined = fragments.join('\n\n').slice(0, 16000);
  await setCached(key, joined, CACHE_TTL);
  return joined;
}
