import express from 'express';
import cors from 'cors';
import { router as graphRouter } from './routes/graph';
import { router as searchRouter } from './routes/search';
import { router as uploadRouter } from './routes/upload';
import { router as documentsRouter } from './routes/documents';
import { router as askRouter } from './routes/ask';
import { initializeGraph } from './services/graphService';
import logger from './utils/logger';
import { AppError } from './utils/errors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use('/graph', graphRouter);
app.use('/search', searchRouter);
app.use('/upload', uploadRouter);
app.use('/documents', documentsRouter);
app.use('/ask', askRouter);

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    let error = err;

    if (!(error instanceof AppError)) {
      const statusCode = error.statusCode || error.status || 500;
      const message = error.message || 'Something went wrong';
      error = new AppError(message, statusCode);
    }

    logger.error('Unhandled error', {
      message: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      url: req.url,
      method: req.method,
    });

    res.status(error.statusCode).json({
      error: error.message,
      ...(error.details && { details: error.details }),
    });
  }
);

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', { url: req.url, method: req.method });
  res.status(404).json({ error: 'Route not found' });
});

// Initialize graph before starting server
(async () => {
  try {
    await initializeGraph();
    app.listen(4000, () => {
      logger.info('Backend server started', { port: 4000 });
      console.log('🚀 Backend running on http://localhost:4000');
    });
  } catch (err) {
    logger.error('Failed to initialize graph', { error: err });
    process.exit(1);
  }
})();
