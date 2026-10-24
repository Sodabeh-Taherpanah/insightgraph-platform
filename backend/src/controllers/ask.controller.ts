import { Body, Controller, Post, Res } from '@nestjs/common';
import { z } from 'zod';
import type { Response } from 'express';
import { AskService } from '../services/askService';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

const askSchema = z.object({
  question: z
    .string()
    .min(1, 'Question is required')
    .max(500, 'Question too long'),
});

@Controller('ask')
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post()
  async ask(@Body() body: unknown) {
    const { question } = askSchema.parse(body);
    return this.askService.askQuestion(question);
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

      const result = await this.askService.streamQuestion(question, (token) => {
        res.write(
          `data: ${JSON.stringify({ type: 'answer', content: token })}\n\n`,
        );
      });

      if (result.answer) {
        res.write(
          `data: ${JSON.stringify({ type: 'answer', content: result.answer })}\n\n`,
        );
      }

      res.write(
        `data: ${JSON.stringify({ type: 'sources', sources: result.sources })}\n\n`,
      );
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
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
