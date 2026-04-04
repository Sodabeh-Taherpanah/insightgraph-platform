import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { searchDocuments } from '../services/searchService';

const searchSchema = z.object({
  q: z.string().min(1).max(200),
});

@Controller('search')
export class SearchController {
  @Get()
  async search(@Query() query: unknown) {
    const validation = searchSchema.safeParse(query);
    if (!validation.success) {
      return {
        error: 'Invalid search query',
        details: validation.error.issues,
      };
    }

    const q = validation.data.q;
    const results = await searchDocuments(q);
    return { query: q, results };
  }
}
