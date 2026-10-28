import { Injectable } from '@nestjs/common';
import {
  answerQuestionStreaming,
  answerQuestionWithContext,
} from './aiService';
import {
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
      sources: this.mapSources(searchResults),
    };
  }

  async streamQuestion(
    question: string,
    onToken: (token: string) => void,
  ): Promise<AskStreamResponse> {
    logger.info('Processing streaming question', { question });

    const searchResults = await this.searchForQuestion(question);
    if (searchResults.length === 0) {
      return {
        answer: 'No relevant documents found to answer this question.',
        sources: [],
      };
    }

    const context = await retrieveContext(question, 5, 3);

    await answerQuestionStreaming(context, question, onToken);

    logger.info('Streaming question completed', {
      question,
      resultCount: searchResults.length,
    });

    return {
      sources: this.mapSources(searchResults),
    };
  }

  private async searchForQuestion(question: string): Promise<SearchResult[]> {
    return (await searchDocuments(question)) as SearchResult[];
  }

  private mapSources(searchResults: SearchResult[]): AskSource[] {
    return searchResults.slice(0, 5).map((doc) => ({
      id: doc.id,
      title: doc.source.title,
      score: doc.score,
    }));
  }
}
