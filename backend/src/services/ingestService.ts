import { Injectable } from '@nestjs/common';
import { indexDocument } from './searchService';
import { normalizeText } from '../utils/fileParser';
import { chunkDocument } from '../utils/chunking';
import logger from '../utils/logger';

export interface IngestResult {
  indexed: string;
  chunksCreated: number;
}

@Injectable()
export class IngestService {
  async ingestDocument(title: string, text: string): Promise<IngestResult> {
    logger.info('Starting document ingestion', {
      title,
      textLength: text.length,
    });

    try {
      const cleaned = normalizeText(text);
      const chunks = chunkDocument(title, title, cleaned);
      logger.info('Document chunked', {
        title,
        chunkCount: chunks.length,
        avgChunkSize:
          chunks.length > 0
            ? Math.round(
                chunks.reduce((sum, c) => sum + c.text.length, 0) /
                  chunks.length,
              )
            : 0,
      });

      let indexedCount = 0;
      for (const chunk of chunks) {
        await indexDocument({
          id: chunk.chunkId,
          title: `${chunk.sourceTitle} (Part ${chunk.chunkIndex + 1}/${chunk.metadata.totalChunks})`,
          text: chunk.text,
          createdAt: chunk.metadata.createdAt,
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

      return {
        indexed: title,
        chunksCreated: indexedCount,
      };
    } catch (error) {
      logger.error('Document ingestion failed', { title, error });
      throw error;
    }
  }
}
