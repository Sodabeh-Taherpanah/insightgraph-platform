/**
 * Document chunking utility for RAG
 * Splits documents into overlapping chunks for better context retrieval
 */

const TOKENS_PER_WORD = 1.3; // Approximate tokens per word
const CHUNK_SIZE_TOKENS = 512; // Chunk size in tokens
const OVERLAP_TOKENS = 100; // Overlap between chunks

// Convert token count to approximate word count
function tokensToWords(tokens: number): number {
  return Math.ceil(tokens / TOKENS_PER_WORD);
}

export interface DocumentChunk {
  chunkId: string; // docId#chunk_0, docId#chunk_1, etc.
  sourceId: string; // Original document ID
  sourceTitle: string; // Original document title
  chunkIndex: number; // 0-based index
  text: string; // Actual chunk content
  startPosition: number; // Character position in original text
  endPosition: number; // Character position in original text
  metadata: {
    totalChunks: number;
    createdAt: string;
  };
}

/**
 * Split document text into overlapping chunks
 * @param docId - Document identifier
 * @param title - Document title
 * @param text - Full document text
 * @returns Array of document chunks
 */
export function chunkDocument(
  docId: string,
  title: string,
  text: string,
): DocumentChunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: DocumentChunk[] = [];
  const words = text.split(/\s+/).filter((w) => w.length > 0);

  const chunkSizeWords = tokensToWords(CHUNK_SIZE_TOKENS);
  const overlapWords = tokensToWords(OVERLAP_TOKENS);

  let chunkIndex = 0;
  let wordIndex = 0;

  while (wordIndex < words.length) {
    // Determine chunk boundaries
    const chunkStartWord = Math.max(
      0,
      wordIndex - (chunkIndex > 0 ? overlapWords : 0),
    );
    const chunkEndWord = Math.min(
      words.length,
      chunkStartWord + chunkSizeWords,
    );

    // Extract chunk words
    const chunkWords = words.slice(chunkStartWord, chunkEndWord);
    const chunkText = chunkWords.join(' ');

    // Find character positions in original text
    const startIdx = text.indexOf(chunkWords[0]);
    const endIdx =
      text.lastIndexOf(chunkWords[chunkWords.length - 1]) +
      chunkWords[chunkWords.length - 1].length;

    chunks.push({
      chunkId: `${docId}#chunk_${chunkIndex}`,
      sourceId: docId,
      sourceTitle: title,
      chunkIndex,
      text: chunkText,
      startPosition: Math.max(0, startIdx),
      endPosition: Math.min(text.length, endIdx),
      metadata: {
        totalChunks: 0, // Will be set after all chunks are created
        createdAt: new Date().toISOString(),
      },
    });

    wordIndex = chunkEndWord - overlapWords;
    chunkIndex++;

    // Safety: prevent infinite loops on very short documents
    if (chunkEndWord >= words.length) break;
  }

  // Set total chunk count in metadata
  const totalChunks = chunks.length;
  chunks.forEach((chunk) => {
    chunk.metadata.totalChunks = totalChunks;
  });

  return chunks;
}

/**
 * Example: Split document into chunks
 * const chunks = chunkDocument('doc1', 'My Document', 'Long document text...');
 * chunks.forEach(chunk => console.log(chunk.chunkId, chunk.text.slice(0, 50)));
 */
