import fs from 'fs';
import path from 'path';
import { Client } from '@elastic/elasticsearch';
import logger from '../utils/logger';
import {
  CACHE_TTL,
  cacheKey,
  getCached,
  invalidatePattern,
  setCached,
} from './redisService';

const ES_NODE = process.env.ES_NODE || 'http://localhost:9200';
const INDEX = process.env.ES_INDEX || 'insightgraph';
// TEMP: latency measurement
const CONTEXT_CHUNKS = Number(process.env.CONTEXT_CHUNKS) || 3;
// TEMP: latency measurement ("score" = ES score order, default; "index" = by chunkIndex)
const CONTEXT_ORDER = process.env.CONTEXT_ORDER === 'index' ? 'index' : 'score';
// TEMP: latency measurement (chunk count per query; unknown on a Redis hit after restart)
export const contextChunkCounts = new Map<string, number>();
// TEMP: latency measurement (chunk ids in the order they were used, per query)
export const contextChunkIds = new Map<string, string[]>();
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

type StoredDocument = DocumentSource & { id: string };

// Local fallback used when Elasticsearch is unreachable: documents are kept in
// a JSON file and searched by simple keyword counting.
const LOCAL_FILE = path.resolve('./data/documents.json');
const ES_RETRY_MS = 30_000;
let esDownUntil = 0;
let localDocs: Map<string, StoredDocument> | null = null;

function isConnectionError(err: any): boolean {
  return [
    'ConnectionError',
    'NoLivingConnectionsError',
    'TimeoutError',
  ].includes(err?.name);
}

/**
 * Run the Elasticsearch operation, or the local one if Elasticsearch is
 * unreachable (skipping Elasticsearch for ES_RETRY_MS after a failure).
 */
async function withFallback<T>(
  es: () => Promise<T>,
  local: () => T | Promise<T>,
): Promise<T> {
  if (Date.now() < esDownUntil) return local();
  try {
    return await es();
  } catch (err: any) {
    if (!isConnectionError(err)) throw err;
    esDownUntil = Date.now() + ES_RETRY_MS;
    logger.warn('Elasticsearch unreachable, using local document store', {
      node: ES_NODE,
    });
    return local();
  }
}

function loadLocal(): Map<string, StoredDocument> {
  if (localDocs) return localDocs;
  localDocs = new Map();
  try {
    if (fs.existsSync(LOCAL_FILE)) {
      const list: StoredDocument[] = JSON.parse(
        fs.readFileSync(LOCAL_FILE, 'utf8'),
      );
      for (const d of list) localDocs.set(d.id, d);
    }
  } catch (e) {
    logger.error('Failed to load local document store', { error: String(e) });
  }
  return localDocs;
}

function saveLocal() {
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
  fs.writeFileSync(
    LOCAL_FILE,
    JSON.stringify([...loadLocal().values()], null, 2),
  );
}

const STOPWORDS = new Set(
  'a an the is are was were be to of in on for and or how what when who why does do did get gets many much long'.split(
    ' ',
  ),
);
const words = (s: string) => s.toLowerCase().match(/\w+/g) ?? [];

function localSearch(query: string, size: number) {
  const terms = words(query).filter((t) => !STOPWORDS.has(t));
  const count = (haystack: string[], term: string) =>
    haystack.filter((w) => w === term).length;

  const hits = [];
  for (const doc of loadLocal().values()) {
    const text = words(doc.text);
    const title = words(doc.title);
    let score = 0;
    for (const term of terms) {
      score += count(text, term) + 2 * count(title, term);
    }
    if (score === 0) continue;
    hits.push({
      id: doc.id,
      score,
      source: doc as DocumentSource,
      // whole chunk: a snippet can cut off the sentence that answers the question
      highlights: [doc.text],
    });
  }
  hits.sort((a, b) => b.score - a.score);

  // The same text may be uploaded under several titles; keep the best copy.
  const seen = new Set<string>();
  return hits
    .filter((h) => !seen.has(h.source.text) && !!seen.add(h.source.text))
    .slice(0, size);
}

/**
 * Fetch a document by id from Elasticsearch, or the local store as fallback.
 * Mimics the ES get response; throws an error with statusCode 404 if missing.
 */
export async function getDocumentById(id: string) {
  return withFallback(
    () =>
      client.get({ index: INDEX, id }) as Promise<{
        _id: string;
        _source?: any;
      }>,
    () => {
      const doc = loadLocal().get(id);
      if (!doc)
        throw Object.assign(new Error('Not found'), { statusCode: 404 });
      return { _id: doc.id, _source: doc };
    },
  );
}

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
  await withFallback(
    async () => {
      await ensureIndex();
      await client.index({
        index: INDEX,
        id: doc.id,
        document: doc,
        refresh: true,
      });
    },
    () => {
      loadLocal().set(doc.id, doc);
      saveLocal();
    },
  );

  // Invalidate search/context cache so new docs are visible immediately.
  await invalidatePattern('search:*');
  await invalidatePattern('context:*');

  return { id: doc.id };
}

export async function searchDocuments(query: string, size = 10) {
  const key = cacheKey('search', query, size);
  const cached = await getCached<any[]>(key);
  if (cached) return cached;

  return withFallback(
    () => searchEs(query, size, key),
    () => localSearch(query, size),
  );
}

async function searchEs(query: string, size: number, key: string) {
  await ensureIndex();
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
  // TEMP: latency measurement (CONTEXT_CHUNKS in the key so a changed value never serves a stale context)
  const key = cacheKey(
    'context',
    query,
    topDocs,
    fragmentsPerDoc,
    CONTEXT_CHUNKS,
    CONTEXT_ORDER,
  );
  const cached = await getCached<string>(key);
  if (cached) return cached;

  return withFallback(
    () => contextEs(query, topDocs, fragmentsPerDoc, key),
    () =>
      localSearch(query, 3)
        .flatMap((h) => h.highlights.slice(0, fragmentsPerDoc))
        .join('\n\n')
        .slice(0, 16000),
  );
}

async function contextEs(
  query: string,
  topDocs: number,
  fragmentsPerDoc: number,
  key: string,
) {
  await ensureIndex();
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

  let fragments: string[] = [];
  let chunkIds: string[] = []; // TEMP: latency measurement
  const chunkIndexes: (number | undefined)[] = []; // TEMP: latency measurement
  // Send whole chunks: 200-char highlight fragments can miss the answer.
  for (const h of resp.hits.hits.slice(0, CONTEXT_CHUNKS)) {
    const txt = (h._source as any)?.text as string | undefined;
    if (txt && !fragments.includes(txt)) {
      fragments.push(txt);
      chunkIds.push(h._id as string); // TEMP: latency measurement
      chunkIndexes.push((h._source as any)?.chunkIndex); // TEMP: latency measurement
    }
  }

  // TEMP: latency measurement - same chunk set => same context string (stable prompt prefix).
  // Ties on chunkIndex (chunks of different documents) break by id so the order is deterministic.
  if (
    CONTEXT_ORDER === 'index' &&
    chunkIndexes.every((c) => typeof c === 'number')
  ) {
    const order = fragments
      .map((_, i) => i)
      .sort(
        (a, b) =>
          (chunkIndexes[a] as number) - (chunkIndexes[b] as number) ||
          chunkIds[a].localeCompare(chunkIds[b]),
      );
    fragments = order.map((i) => fragments[i]);
    chunkIds = order.map((i) => chunkIds[i]);
  }

  // Join with separators and cap overall context length.
  const joined = fragments.join('\n\n').slice(0, 16000);
  contextChunkCounts.set(query, fragments.length); // TEMP: latency measurement
  contextChunkIds.set(query, chunkIds); // TEMP: latency measurement
  await setCached(key, joined, CACHE_TTL);
  return joined;
}
