import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { z } from 'zod';
import { ingestDocument } from '../services/ingestService';
import { parseUploadedFile } from '../utils/fileParser';
import logger from '../utils/logger';

const uploadSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  text: z.string().min(1).max(10000).optional(),
  content: z.string().min(1).max(10000).optional(),
});

const fileUploadSchema = z.object({
  title: z.string().min(1).max(100).optional(),
});

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: any,
  ) {
    logger.info('Upload request received', {
      hasFile: !!file,
      body,
    });

    let title = String(body?.title || `doc-${Date.now()}`);
    let text = String(body?.text || body?.content || '');

    if (file) {
      try {
        const parsed = await parseUploadedFile(file.buffer, file.originalname);
        text = parsed.text;
        if (!body?.title) {
          title = parsed.title;
        }
        logger.info('File parsed', {
          filename: file.originalname,
          fileType: parsed.fileType,
          textLength: text.length,
        });
      } catch (parseErr) {
        throw new BadRequestException(
          parseErr instanceof Error ? parseErr.message : 'Failed to parse file',
        );
      }

      const fileValidation = fileUploadSchema.safeParse(body);
      if (!fileValidation.success) {
        throw new BadRequestException({
          error: 'Invalid file upload data',
          details: fileValidation.error.issues,
        });
      }
    } else {
      const validation = uploadSchema.safeParse(body);
      if (!validation.success) {
        throw new BadRequestException({
          error: 'Invalid upload data',
          details: validation.error.issues,
        });
      }

      if (!text.trim()) {
        throw new BadRequestException({
          error: 'Either "text" or "content" field is required',
        });
      }
    }

    const result = await ingestDocument(title, text);

    logger.info('Upload successful', { id: result.indexed });
    return {
      ok: true,
      ...result,
    };
  }
}
