import { Router } from 'express';
import { z } from 'zod';
import axios from 'axios';
import {
  searchDocuments,
  retrieveContext,
  DocumentSource,
} from '../services/searchService';
import {
  answerQuestionWithContext,
  answerQuestionStreaming,
} from '../services/aiService';
import logger from '../utils/logger';
import { AppError } from '../utils/errors';

export const router = Router();

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

/**
 * POST /ask
 * Standard endpoint - returns full answer at once
 */
router.post('/', async (req, res) => {
  try {
    const { question } = askSchema.parse(req.body);

    logger.info('Processing question', { question });

    // Search for relevant documents
    const searchResults = (await searchDocuments(question)) as SearchResult[];
    if (searchResults.length === 0) {
      return res.json({
        answer: 'No relevant documents found to answer this question.',
        sources: [],
      });
    }

    // Build trimmed context using ES highlights (lightweight RAG)
    const context = await retrieveContext(question, 5, 3);

    // Get answer from AI
    const answer = await answerQuestionWithContext(context, question);

    logger.info('Question answered', {
      question,
      resultCount: searchResults.length,
    });

    res.json({
      answer,
      sources: searchResults.slice(0, 5).map((doc) => ({
        id: doc.id,
        title: doc.source.title,
        score: doc.score,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in /ask', { errors: error.issues });
      return res
        .status(400)
        .json({ error: 'Invalid input', details: error.issues });
    }

    logger.error('Error in /ask', { error });
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /ask/stream
 * Streaming endpoint - returns tokens progressively via Server-Sent Events
 */
router.post('/stream', async (req, res) => {
  try {
    const { question } = askSchema.parse(req.body);

    logger.info('Processing streaming question', { question });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Search for relevant documents
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

    // Build trimmed context using ES highlights (lightweight RAG)
    const context = await retrieveContext(question, 5, 3);

    // Stream the answer token by token
    await answerQuestionStreaming(context, question, (token: string) => {
      res.write(
        `data: ${JSON.stringify({ type: 'answer', content: token })}\n\n`,
      );
    });

    // Send sources after answer completes
    const sources = searchResults.slice(0, 5).map((doc) => ({
      id: doc.id,
      title: doc.source.title,
      score: doc.score,
    }));

    res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);

    // Signal completion
    res.write('data: [DONE]\n\n');
    res.end();

    logger.info('Streaming question completed', {
      question,
      resultCount: searchResults.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in /ask/stream', { errors: error.issues });
      res.write(
        `data: ${JSON.stringify({ type: 'error', error: 'Invalid input', details: error.issues })}\n\n`,
      );
      res.end();
      return;
    }

    logger.error('Error in /ask/stream', { error });
    const message =
      error instanceof AppError ? error.message : 'Internal server error';
    res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`);
    res.end();
  }
});
