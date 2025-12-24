import { Client } from '@elastic/elasticsearch';

const ES_NODE = process.env.ES_NODE || 'http://localhost:9200';
const INDEX = process.env.ES_INDEX || 'insightgraph';

const client = new Client({ node: ES_NODE });

interface DocumentSource {
  title: string;
  text: string;
  createdAt: string;
}

export type { DocumentSource };

/**
 * Ensure index exists (simple mapping for text)
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
}) {
  await ensureIndex();
  await client.index({
    index: INDEX,
    id: doc.id,
    document: doc,
    refresh: true,
  });
  return { id: doc.id };
}

export async function searchDocuments(query: string, size = 10) {
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
  });

  const hits = resp.hits.hits.map((h) => ({
    id: h._id,
    score: h._score,
    source: h._source as DocumentSource,
  }));

  return hits;
}
