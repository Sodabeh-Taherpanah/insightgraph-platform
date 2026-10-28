import { Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Client } from '@elastic/elasticsearch';
import { z } from 'zod';
import logger from '../utils/logger';
import { summarizeText, summarizeTextStreaming } from '../services/aiService';
import { NotFoundError, ValidationError, AppError } from '../utils/errors';

const ES_NODE = process.env.ES_NODE || 'http://localhost:9200';
const INDEX = process.env.ES_INDEX || 'insightgraph';
const client = new Client({ node: ES_NODE });

const documentIdSchema = z.string().min(1).max(200);

@Controller('documents')
export class DocumentsController {
  @Get(':id')
  async getDocument(@Param('id') idParam: string) {
    const idValidation = documentIdSchema.safeParse(idParam);
    if (!idValidation.success) {
      throw new ValidationError(
        'Invalid document ID',
        idValidation.error.issues,
      );
    }

    const id = idValidation.data;

    try {
      logger.info('Retrieving document', { id });
      const response = await client.get({ index: INDEX, id });
      const document = {
        id: response._id,
        ...(response._source as object),
      };
      logger.info('Document retrieved', { id });
      return document;
    } catch (err: any) {
      if (err.statusCode === 404) {
        throw new NotFoundError('Document');
      }
      logger.error('Document retrieval error', { id, error: err.message });
      throw new AppError('Failed to retrieve document', 500);
    }
  }

  @Post(':id/summary')
  async summarize(@Param('id') idParam: string) {
    const idValidation = documentIdSchema.safeParse(idParam);
    if (!idValidation.success) {
      throw new ValidationError(
        'Invalid document ID',
        idValidation.error.issues,
      );
    }

    const id = idValidation.data;

    try {
      logger.info('Retrieving document for summary', { id });
      const response = await client.get({ index: INDEX, id });
      const docText = (response._source as any)?.text as string;
      if (!docText) {
        throw new NotFoundError('Document text');
      }

      const summary = await summarizeText(docText);
      return { id, summary };
    } catch (err: any) {
      logger.error('Summary generation failed', { id, error: err.message });
      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError('Failed to generate summary', 500);
    }
  }

  @Get(':id/summary/stream')
  async summarizeStream(@Param('id') idParam: string, @Res() res: Response) {
    const idValidation = documentIdSchema.safeParse(idParam);
    if (!idValidation.success) {
      throw new ValidationError(
        'Invalid document ID',
        idValidation.error.issues,
      );
    }

    const id = idValidation.data;

    try {
      logger.info('Retrieving document for streaming summary', { id });
      const response = await client.get({ index: INDEX, id });
      const docText = (response._source as any)?.text as string;
      if (!docText) {
        res.status(404).json({ error: 'Document text not found' });
        return;
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      await summarizeTextStreaming(docText, (token: string) => {
        res.write(
          `data: ${JSON.stringify({ type: 'summary', content: token })}\n\n`,
        );
      });

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err: any) {
      logger.error('Streaming summary failed', { id, error: err.message });
      res.write(
        `data: ${JSON.stringify({ type: 'error', error: 'Failed to generate summary' })}\n\n`,
      );
      res.end();
    }
  }
}
