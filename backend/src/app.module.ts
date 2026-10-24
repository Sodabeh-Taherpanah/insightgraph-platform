import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AskController } from './controllers/ask.controller';
import { UploadController } from './controllers/upload.controller';
import { SearchController } from './controllers/search.controller';
import { DocumentsController } from './controllers/documents.controller';
import { GraphController } from './controllers/graph.controller';
import { AskService } from './services/askService';
import { IngestService } from './services/ingestService';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      //rate limit
      {
        ttl: seconds(60), // time to live in milliseconds
        limit: 60, // maximum number of requests per IP
      },
    ]),
  ],
  controllers: [
    AskController,
    UploadController,
    SearchController,
    DocumentsController,
    GraphController,
  ],
  providers: [
    AskService,
    IngestService,
    {
      provide: APP_GUARD, // global guard for rate limiting and all incoming requests
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
