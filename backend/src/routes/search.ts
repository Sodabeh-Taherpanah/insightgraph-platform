import express from 'express';
import { z } from 'zod';
import { searchDocuments } from '../services/searchService';

export const router = express.Router();

// Zod schema for search query
const searchSchema = z.object({
  q: z.string().min(1).max(200),
});

/**
 * Query:
 *  GET /search?q=your+query
 */
router.get('/', async (req, res) => {
  const validation = searchSchema.safeParse(req.query);
  if (!validation.success) {
    return res
      .status(400)
      .json({
        error: 'Invalid search query',
        details: validation.error.issues,
      });
  }

  const q = validation.data.q;

  try {
    const results = await searchDocuments(q);
    res.json({ query: q, results });
  } catch (err: any) {
    console.error('search error:', err);
    res.status(500).json({ error: err.message || 'search failed' });
  }
});
