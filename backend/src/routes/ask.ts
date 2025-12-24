import { Router } from 'express';
import { z } from 'zod';
import { searchDocuments, DocumentSource } from '../services/searchService';
import { answerQuestionWithContext } from '../services/aiService';
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

    // Concatenate content from top results as context
    const context = searchResults
      .slice(0, 5)
      .map((doc) => doc.source.text)
      .join('\n\n');

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
