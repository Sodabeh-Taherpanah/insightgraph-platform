import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { ingestDocument } from '../services/ingestService';
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

    // If file uploaded, read contents and validate
    if (req.file) {
      text = req.file.buffer.toString('utf8');
      const fileValidation = fileUploadSchema.safeParse(req.body);
      if (!fileValidation.success) {
        logger.warn('File upload validation failed', {
          errors: fileValidation.error.issues,
        });
        return res
          .status(400)
          .json({
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
        return res
          .status(400)
          .json({
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
