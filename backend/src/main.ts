import 'reflect-metadata';
import express from 'express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initializeGraph } from './services/graphService';
import logger from './utils/logger';
import { AppExceptionFilter } from './common/filters/app-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.use(express.json({ limit: '5mb' }));
  app.useGlobalFilters(new AppExceptionFilter());

  try {
    await initializeGraph();
  } catch (err) {
    logger.error('Failed to initialize graph', { error: err });
    process.exit(1);
  }

  const port = Number(process.env.PORT || 3001);
  await app.listen(port);

  logger.info('Backend server started', { port });
  console.log(`Backend running on http://localhost:${port}`);
}

bootstrap().catch((err) => {
  logger.error('Nest bootstrap failed', { error: err });
  process.exit(1);
});
