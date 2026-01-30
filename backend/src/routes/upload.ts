import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { ingestDocument } from '../services/ingestService';
import { parseUploadedFile } from '../utils/fileParser';
import logger from '../utils/logger';
export const router = express.Router();
/**
 * POST /upload
 * Accepts:
 *  - file (optional)
 *  - text (optional)
 *  - title (optional)
 */
const upload = multer();

// Zod schema for upload validation
const uploadSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  text: z.string().min(1).max(10000),
});

// File upload schema (if file is provided)
const fileUploadSchema = z.object({
  title: z.string().min(1).max(100).optional(),
});

router.post('/', upload.single('file'), async (req, res) => {
  logger.info('Upload request received', {
    hasFile: !!req.file,
    body: req.body,
  });

  try {
    let title = String(req.body.title || 'doc-' + Date.now());
    let text = String(req.body.text || '');

    // If file uploaded, parse it based on file type
    if (req.file) {
      try {
        const parsed = await parseUploadedFile(
          req.file.buffer,
          req.file.originalname,
        );
        text = parsed.text;
        // Use parsed filename as title if not provided
        if (!req.body.title) {
          title = parsed.title;
        }
        logger.info('File parsed', {
          filename: req.file.originalname,
          fileType: parsed.fileType,
          textLength: text.length,
        });
      } catch (parseErr) {
        logger.warn('File parsing failed', {
          filename: req.file.originalname,
          error:
            parseErr instanceof Error ? parseErr.message : String(parseErr),
        });
        return res.status(400).json({
          error:
            parseErr instanceof Error
              ? parseErr.message
              : 'Failed to parse file',
        });
      }

      const fileValidation = fileUploadSchema.safeParse(req.body);
      if (!fileValidation.success) {
        logger.warn('File upload validation failed', {
          errors: fileValidation.error.issues,
        });
        return res.status(400).json({
          error: 'Invalid file upload data',
          details: fileValidation.error.issues,
        });
      }
    } else {
      // Validate text upload
      const validation = uploadSchema.safeParse(req.body);
      if (!validation.success) {
        logger.warn('Text upload validation failed', {
          errors: validation.error.issues,
        });
        return res.status(400).json({
          error: 'Invalid upload data',
          details: validation.error.issues,
        });
      }
    }

    if (!text.trim()) {
      logger.warn('No text provided in upload');
      return res.status(400).json({ error: 'no text or file uploaded' });
    }

    // Use ingest service
    const result = await ingestDocument(title, text);

    logger.info('Upload successful', { id: result.indexed });
    res.json({
      ok: true,
      ...result,
    });
  } catch (err: any) {
    logger.error('Upload error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: err.message || 'upload failed' });
  }
});
