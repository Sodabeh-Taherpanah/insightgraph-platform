import { createHash } from 'crypto'; // TEMP: latency measurement
import { Injectable } from '@nestjs/common';
import {
  answerQuestionStreaming,
  answerQuestionWithContext,
  type LlmStats,
} from './aiService';
import {
  CONTEXT_CHUNKS,
  contextChunkCounts,
  contextChunkIds,
  retrieveContext,
  searchDocuments,
  type DocumentSource,
} from './searchService';
import logger from '../utils/logger';

interface SearchResult {
  id: string;
  score: number;
  source: DocumentSource;
}

interface AskSource {
  id: string;
  title: string;
  score: number;
}

interface AskResponse {
  answer: string;
  sources: AskSource[];
}

interface AskStreamResponse {
  answer?: string;
  sources: AskSource[];
}

// TEMP: latency measurement
export interface StreamMeta {
  retrieval_ms: number;
  context_chunks: number | null;
  context_chars: number;
  context_hash: string;
  context_chunk_ids: string[] | null;
}

@Injectable()
export class AskService {
  async askQuestion(question: string): Promise<AskResponse> {
    logger.info('Processing question', { question });

    const searchResults = await this.searchForQuestion(question);
    if (searchResults.length === 0) {
      return {
        answer: 'No relevant documents found to answer this question.',
        sources: [],
      };
    }

    const context = await retrieveContext(question, 5, 3);
    const answer = await answerQuestionWithContext(context, question);

    logger.info('Question answered', {
      question,
      resultCount: searchResults.length,
    });

    return {
      answer,
      sources: this.mapSources(searchResults, question),
    };
  }

  async streamQuestion(
    question: string,
    onToken: (token: string) => void,
    onMeta?: (meta: StreamMeta) => void, // TEMP: latency measurement
    onStats?: (stats: LlmStats) => void, // TEMP: latency measurement
  ): Promise<AskStreamResponse> {
    const tStart = performance.now(); // TEMP: latency measurement
    logger.info('Processing streaming question', { question });

    const searchResults = await this.searchForQuestion(question);
    if (searchResults.length === 0) {
      return {
        answer: 'No relevant documents found to answer this question.',
        sources: [],
      };
    }

    const context = await retrieveContext(question, 5, 3);

    // TEMP: latency measurement
    onMeta?.({
      retrieval_ms: Math.round(performance.now() - tStart),
      context_chunks: contextChunkCounts.get(question) ?? null,
      context_chars: context.length,
      context_hash: createHash('sha1').update(context).digest('hex').slice(0, 8),
      context_chunk_ids: contextChunkIds.get(question) ?? null,
    });

    await answerQuestionStreaming(context, question, onToken, onStats);

    logger.info('Streaming question completed', {
      question,
      resultCount: searchResults.length,
    });

    return {
      sources: this.mapSources(searchResults, question),
    };
  }

  private async searchForQuestion(question: string): Promise<SearchResult[]> {
    return (await searchDocuments(question)) as SearchResult[];
  }

  // Sources are the chunks that were put in the prompt, in prompt order.
  // retrieveContext records their ids per question; if that is unknown (for
  // example a cached context after a restart), use the first CONTEXT_CHUNKS hits.
  private mapSources(
    searchResults: SearchResult[],
    question: string,
  ): AskSource[] {
    const ids = contextChunkIds.get(question);
    const fromContext = ids
      ? ids
          .map((id) => searchResults.find((r) => r.id === id))
          .filter((r): r is SearchResult => !!r)
      : [];
    const used = fromContext.length
      ? fromContext
      : searchResults.slice(0, CONTEXT_CHUNKS);
    return used.map((doc) => ({
      id: doc.id,
      title: doc.source.title,
      score: doc.score,
    }));
  }
}
