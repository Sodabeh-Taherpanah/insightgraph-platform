import { indexDocument } from './searchService';
import { extractTripletsFromText } from './aiService';
import { normalizeText } from '../utils/fileParser';
import { chunkDocument } from '../utils/chunking';
import { graph } from './graphService';
import logger from '../utils/logger';

export interface IngestResult {
  indexed: string;
  chunksCreated: number;
  triplets: Array<{ subject: string; predicate: string; object: string }>;
  graph: { nodes: any[]; edges: any[] };
}

export async function ingestDocument(
  title: string,
  text: string, //raw document text
): Promise<IngestResult> {
  logger.info('Starting document ingestion', {
    title,
    textLength: text.length,
  });

  try {
    // Split document into chunks for better RAG retrieval
    const cleaned = normalizeText(text);
    const chunks = chunkDocument(title, title, cleaned);
    logger.info('Document chunked', {
      title,
      chunkCount: chunks.length,
      avgChunkSize:
        chunks.length > 0
          ? Math.round(
              chunks.reduce((sum, c) => sum + c.text.length, 0) / chunks.length,
            )
          : 0,
    });

    // Index all chunks in Elasticsearch with metadata
    // Stores each chunk in the search index so the app can find relevant text later.
    let indexedCount = 0;
    for (const chunk of chunks) {
      await indexDocument({
        id: chunk.chunkId,
        title: `${chunk.sourceTitle} (Part ${chunk.chunkIndex + 1}/${chunk.metadata.totalChunks})`,
        text: chunk.text,
        createdAt: chunk.metadata.createdAt,
        // Chunk metadata
        sourceId: chunk.sourceId,
        sourceTitle: chunk.sourceTitle,
        chunkIndex: chunk.chunkIndex,
        startPosition: chunk.startPosition,
        endPosition: chunk.endPosition,
        totalChunks: chunk.metadata.totalChunks,
      });
      indexedCount++;
    }
    logger.info('Document chunks indexed', {
      title,
      chunksIndexed: indexedCount,
    });

    //  Extract knowledge triplets from full text (for graph)
    const triplets = await extractTripletsFromText(text);
    logger.info('Triplets extracted', { count: triplets.length });

    const addedNodes: any[] = [];
    //stores the nodes that were actually created during this ingestion
    const addedEdges: any[] = [];
    const nodeMap = new Map<string, string>(); // label -> nodeId
    //nodeMap prevents creating the same node more than once in the same loop
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
      indexed: title,
      chunksCreated: indexedCount,
      triplets,
      graph: { nodes: addedNodes, edges: addedEdges },
    };
  } catch (error) {
    logger.error('Document ingestion failed', { title, error });
    throw error;
  }
}
