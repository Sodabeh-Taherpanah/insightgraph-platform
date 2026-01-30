import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import logger from './logger';

export interface ParsedFile {
  text: string;
  title: string;
  fileType: string;
}

/**
 * Normalize extracted text for better readability and consistent storage.
 * - Normalize line endings
 * - Ensure bullets start on their own line
 * - Collapse excessive whitespace and newlines
 */
export function normalizeText(input: string): string {
  if (!input) return input;
  let text = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Ensure bullets start on their own line (insert newline before • or - if needed)
  text = text.replace(/([^\n])\s*(?=([•\-]\s))/g, '$1\n');

  // Normalize bullet prefixes (use a single bullet char)
  text = text.replace(/^[ \t]*[\u2022\-]\s*/gm, '• ');

  // Collapse multiple spaces
  text = text.replace(/[ \t]{2,}/g, ' ');

  // Collapse multiple blank lines to at most one blank line
  text = text.replace(/\n{3,}/g, '\n\n');

  // Trim each line
  text = text
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .trim();

  return text;
}

/**
 * Extract text from uploaded file based on its extension
 */
export async function parseUploadedFile(
  buffer: Buffer,
  originalFilename: string,
): Promise<ParsedFile> {
  const filename = originalFilename.toLowerCase();
  const ext = filename.split('.').pop() || '';

  logger.info('Parsing file', { filename, ext });

  try {
    if (ext === 'docx' || ext === 'doc') {
      return await parseDocx(buffer, filename);
    } else if (ext === 'xlsx' || ext === 'xls') {
      return await parseExcel(buffer, filename);
    } else if (ext === 'pdf') {
      return await parsePdf(buffer, filename);
    } else if (ext === 'txt' || ext === 'md') {
      return {
        text: buffer.toString('utf-8'),
        title: filename,
        fileType: ext,
      };
    } else {
      // Try to read as UTF-8 text
      const text = buffer.toString('utf-8');
      if (text.length > 0 && !isGarbled(text)) {
        return {
          text,
          title: filename,
          fileType: 'text',
        };
      }
      throw new Error(
        `Unsupported file type: .${ext}. Supported: .txt, .md, .docx, .xlsx, .pdf`,
      );
    }
  } catch (err) {
    logger.error('File parsing failed', {
      filename,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Parse DOCX (Word document)
 */
async function parseDocx(
  buffer: Buffer,
  filename: string,
): Promise<ParsedFile> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value,
      title: filename,
      fileType: 'docx',
    };
  } catch (err) {
    throw new Error(
      `Failed to parse DOCX: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Parse XLSX (Excel spreadsheet)
 */
async function parseExcel(
  buffer: Buffer,
  filename: string,
): Promise<ParsedFile> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const allText: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const csvText = XLSX.utils.sheet_to_csv(worksheet);
      allText.push(`Sheet: ${sheetName}\n${csvText}`);
    }

    return {
      text: allText.join('\n\n'),
      title: filename,
      fileType: 'xlsx',
    };
  } catch (err) {
    throw new Error(
      `Failed to parse XLSX: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Parse PDF: try `pdf-parse` first, then fall back to `pdfjs-dist`.
 */
async function parsePdf(buffer: Buffer, filename: string): Promise<ParsedFile> {
  // Try pdf-parse first (keeps previous behavior)
  try {
    const mod = await import('pdf-parse');
    // possible shapes: function, { default: fn }, { parse: fn }, etc.
    let pdfParseFn: any = null;
    if (typeof mod === 'function') pdfParseFn = mod as any;
    else if (typeof (mod as any).default === 'function')
      pdfParseFn = (mod as any).default;
    else if (typeof (mod as any).parse === 'function')
      pdfParseFn = (mod as any).parse;
    else {
      for (const k of Object.keys(mod as any)) {
        if (typeof (mod as any)[k] === 'function') {
          pdfParseFn = (mod as any)[k];
          break;
        }
      }
    }

    if (typeof pdfParseFn === 'function') {
      const data = await pdfParseFn(buffer);
      return {
        text: data?.text || '',
        title: filename,
        fileType: 'pdf',
      };
    }
  } catch (e) {
    logger.warn('pdf-parse failed, will fallback to pdfjs-dist', {
      error: e instanceof Error ? e.message : String(e),
    });
  }

  // Fallback to pdfjs-dist with polyfills for Node.js environment
  try {
    // Polyfill DOMMatrix and Path2D for Node.js
    if (typeof (globalThis as any).DOMMatrix === 'undefined') {
      (globalThis as any).DOMMatrix = class DOMMatrix {
        a = 1;
        b = 0;
        c = 0;
        d = 1;
        e = 0;
        f = 0;
        constructor(values?: number[]) {
          if (values && values.length >= 6) {
            this.a = values[0];
            this.b = values[1];
            this.c = values[2];
            this.d = values[3];
            this.e = values[4];
            this.f = values[5];
          }
        }
      };
    }
    if (typeof (globalThis as any).Path2D === 'undefined') {
      (globalThis as any).Path2D = class Path2D {
        constructor(public path?: any) {}
      };
    }

    const importPaths = [
      'pdfjs-dist/legacy/build/pdf',
      'pdfjs-dist/legacy/build/pdf.min',
      'pdfjs-dist',
      'pdfjs-dist/build/pdf',
    ];

    let pdfjs: any = null;
    let lastError: any = null;

    for (const p of importPaths) {
      try {
        pdfjs = await import(p as any);
        if (pdfjs) break;
      } catch (e) {
        lastError = e;
        // try next
      }
    }

    if (!pdfjs)
      throw (
        lastError || new Error('pdfjs-dist not found after all import paths')
      );

    // Determine getDocument function from possible export shapes
    let getDocument: any = null;
    if (typeof pdfjs === 'function') {
      getDocument = pdfjs as any;
    } else if (typeof pdfjs.getDocument === 'function') {
      getDocument = pdfjs.getDocument;
    } else if (pdfjs.default) {
      if (typeof pdfjs.default === 'function') getDocument = pdfjs.default;
      else if (typeof pdfjs.default.getDocument === 'function')
        getDocument = pdfjs.default.getDocument;
    }

    if (!getDocument || typeof getDocument !== 'function') {
      throw new Error('pdfjs-dist getDocument not available');
    }

    // Ensure we pass a plain Uint8Array
    const rawData = new Uint8Array(buffer);
    const loadingTask = getDocument({ data: rawData });
    const pdf = await loadingTask.promise;
    const numPages = (pdf && pdf.numPages) || 0;
    const texts: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = (content.items || [])
        .map((it: any) => it.str || '')
        .join(' ');
      texts.push(pageText);
    }

    return {
      text: texts.join('\n\n'),
      title: filename,
      fileType: 'pdf',
    };
  } catch (err) {
    throw new Error(
      `Failed to parse PDF: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Check if string looks like garbled binary data
 */
function isGarbled(text: string): boolean {
  // Count non-printable characters in the first N chars
  const N = Math.min(text.length, 1000);
  let garbledCount = 0;
  for (let i = 0; i < N; i++) {
    const code = text.charCodeAt(i);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) garbledCount++;
  }
  return garbledCount / N > 0.1; // more than 10% non-printable
}
