import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { ZodError } from 'zod';
import type { Request, Response } from 'express';
import logger from '../../utils/logger';
import { AppError } from '../../utils/errors';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof ZodError) {
      response.status(HttpStatus.BAD_REQUEST).json({
        error: 'Invalid input',
        details: exception.issues,
      });
      return;
    }

    if (exception instanceof AppError) {
      logger.warn('Application error', {
        message: exception.message,
        statusCode: exception.statusCode,
        url: request.url,
        method: request.method,
      });

      response.status(exception.statusCode).json({
        error: exception.message,
        ...(Object.prototype.hasOwnProperty.call(exception, 'details')
          ? { details: (exception as any).details }
          : {}),
      });
      return;
    }

    const err = exception as any;
    const statusCode =
      err?.status || err?.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
    const message = err?.message || 'Internal server error';

    logger.error('Unhandled error', {
      message,
      stack: err?.stack,
      statusCode,
      url: request.url,
      method: request.method,
    });

    response.status(statusCode).json({ error: message });
  }
}
