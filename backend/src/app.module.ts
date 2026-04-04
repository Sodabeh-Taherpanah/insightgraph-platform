import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AskController } from './controllers/ask.controller';
import { UploadController } from './controllers/upload.controller';
import { SearchController } from './controllers/search.controller';
import { DocumentsController } from './controllers/documents.controller';
import { GraphController } from './controllers/graph.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
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
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
