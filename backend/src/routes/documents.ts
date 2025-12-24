import express from 'express';
import { Client } from '@elastic/elasticsearch';
import { z } from 'zod';
import logger from '../utils/logger';
import { NotFoundError, ValidationError, AppError } from '../utils/errors';

const ES_NODE = process.env.ES_NODE || 'http://localhost:9200';
const INDEX = process.env.ES_INDEX || 'insightgraph';

const client = new Client({ node: ES_NODE });

export const router = express.Router();

// Zod schema for document ID
const documentIdSchema = z.string().min(1).max(200);

/**
 * GET /documents/:id
 * Retrieve a document by ID from Elasticsearch
 */
router.get('/:id', async (req, res) => {
  const idValidation = documentIdSchema.safeParse(req.params.id);
  if (!idValidation.success) {
    throw new ValidationError('Invalid document ID', idValidation.error.issues);
  }

  const id = idValidation.data;

  try {
    logger.info('Retrieving document', { id });

    const response = await client.get({
      index: INDEX,
      id,
    });

    const document = {
      id: response._id,
      ...(response._source as object),
    };

    logger.info('Document retrieved', { id });
    res.json(document);
  } catch (err: any) {
    if (err.statusCode === 404) {
      throw new NotFoundError('Document');
    }

    logger.error('Document retrieval error', { id, error: err.message });
    throw new AppError('Failed to retrieve document', 500);
  }
});
