import { indexDocument } from './searchService';
import { extractTripletsFromText } from './aiService';
import { graph } from './graphService';
import logger from '../utils/logger';

export interface IngestResult {
  indexed: string;
  triplets: Array<{ subject: string; predicate: string; object: string }>;
  graph: { nodes: any[]; edges: any[] };
}

export async function ingestDocument(
  title: string,
  text: string
): Promise<IngestResult> {
  logger.info('Starting document ingestion', {
    title,
    textLength: text.length,
  });

  try {
    // 1️⃣ Index document in Elasticsearch
    const doc = {
      id: title,
      title,
      text,
      createdAt: new Date().toISOString(),
    };
    await indexDocument(doc);
    logger.info('Document indexed', { id: doc.id });

    // 2️⃣ Extract knowledge triplets from text
    const triplets = await extractTripletsFromText(text);
    logger.info('Triplets extracted', { count: triplets.length });

    const addedNodes: any[] = [];
    const addedEdges: any[] = [];
    const nodeMap = new Map<string, string>(); // label -> nodeId

    for (const { subject, predicate, object } of triplets) {
      // Add subject node if not exists
      let subjectId = nodeMap.get(subject);
      if (!subjectId) {
        const subjectNode = await graph.addNode({
          type: 'entity',
          label: subject,
          properties: { source: title },
        });
        subjectId = subjectNode.id;
        nodeMap.set(subject, subjectId);
        addedNodes.push({ id: subjectId, label: subject, type: 'entity' });
      }

      // Add object node if not exists
      let objectId = nodeMap.get(object);
      if (!objectId) {
        const objectNode = await graph.addNode({
          type: 'entity',
          label: object,
          properties: { source: title },
        });
        objectId = objectNode.id;
        nodeMap.set(object, objectId);
        addedNodes.push({ id: objectId, label: object, type: 'entity' });
      }

      // Add edge
      const edge = await graph.addEdge({
        fromNodeId: subjectId,
        toNodeId: objectId,
        type: 'relation',
        properties: { relation: predicate, source: title },
      });
      addedEdges.push({
        id: edge.id,
        from: subjectId,
        to: objectId,
        relation: predicate,
        source: title,
      });
    }

    logger.info('Document ingestion completed', {
      nodesAdded: addedNodes.length,
      edgesAdded: addedEdges.length,
    });

    return {
      indexed: doc.id,
      triplets,
      graph: { nodes: addedNodes, edges: addedEdges },
    };
  } catch (error) {
    logger.error('Document ingestion failed', { title, error });
    throw error;
  }
}
