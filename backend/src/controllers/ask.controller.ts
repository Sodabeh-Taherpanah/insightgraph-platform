import { Body, Controller, Post, Res } from '@nestjs/common';
import { z } from 'zod';
import type { Response } from 'express';
import {
  searchDocuments,
  retrieveContext,
  type DocumentSource,
} from '../services/searchService';
import {
  answerQuestionWithContext,
  answerQuestionStreaming,
} from '../services/aiService';
import logger from '../utils/logger';
import { AppError } from '../utils/errors';

const askSchema = z.object({
  question: z
    .string()
    .min(1, 'Question is required')
    .max(500, 'Question too long'),
});

interface SearchResult {
  id: string;
  score: number;
  source: DocumentSource;
}

@Controller('ask')
export class AskController {
  @Post()
  async ask(@Body() body: unknown) {
    const { question } = askSchema.parse(body);

    logger.info('Processing question', { question });

    const searchResults = (await searchDocuments(question)) as SearchResult[];
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
      sources: searchResults.slice(0, 5).map((doc) => ({
        id: doc.id,
        title: doc.source.title,
        score: doc.score,
      })),
    };
  }

  @Post('stream')
  async askStream(@Body() body: unknown, @Res() res: Response) {
    try {
      const { question } = askSchema.parse(body);

      logger.info('Processing streaming question', { question });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const searchResults = (await searchDocuments(question)) as SearchResult[];

      if (searchResults.length === 0) {
        res.write(
          `data: ${JSON.stringify({ type: 'answer', content: 'No relevant documents found to answer this question.' })}\n\n`,
        );
        res.write(
          `data: ${JSON.stringify({ type: 'sources', sources: [] })}\n\n`,
        );
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      const context = await retrieveContext(question, 5, 3);

      await answerQuestionStreaming(context, question, (token: string) => {
        res.write(
          `data: ${JSON.stringify({ type: 'answer', content: token })}\n\n`,
        );
      });

      const sources = searchResults.slice(0, 5).map((doc) => ({
        id: doc.id,
        title: doc.source.title,
        score: doc.score,
      }));

      res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();

      logger.info('Streaming question completed', {
        question,
        resultCount: searchResults.length,
      });
    } catch (error) {
      logger.error('Error in /ask/stream', { error });
      const message =
        error instanceof AppError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Internal server error';

      res.write(
        `data: ${JSON.stringify({ type: 'error', error: message })}\n\n`,
      );
      res.end();
    }
  }
}
