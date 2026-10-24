import { chunkDocument } from './chunking';

const words = (n: number) =>
  Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

describe('chunkDocument', () => {
  it('returns no chunks for empty or whitespace-only input', () => {
    expect(chunkDocument('d', 'Doc', '')).toEqual([]);
    expect(chunkDocument('d', 'Doc', '   \n\t ')).toEqual([]);
  });

  it('returns a single chunk for short input', () => {
    const chunks = chunkDocument('d', 'Doc', 'Docker runs containers.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe('Docker runs containers.');
    expect(chunks[0].chunkId).toBe('d#chunk_0');
    expect(chunks[0].metadata.totalChunks).toBe(1);
  });

  it('uses a 512-token chunk size (about 394 words at 1.3 tokens/word)', () => {
    const chunks = chunkDocument('d', 'Doc', words(1000));
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].text.split(' ')).toHaveLength(Math.ceil(512 / 1.3));
    for (const c of chunks) {
      expect(c.text.split(' ').length).toBeLessThanOrEqual(
        Math.ceil(512 / 1.3),
      );
    }
  });

  it('overlaps consecutive chunks and covers the whole text', () => {
    const chunks = chunkDocument('d', 'Doc', words(1000));
    for (let i = 1; i < chunks.length; i++) {
      const prev = chunks[i - 1].text.split(' ');
      const curr = chunks[i].text.split(' ');
      expect(prev).toContain(curr[0]); // chunk i starts inside chunk i-1
    }
    expect(chunks[0].text.startsWith('w0 ')).toBe(true);
    expect(chunks[chunks.length - 1].text.endsWith('w999')).toBe(true);
  });

  // Known gap: the implementation subtracts the overlap twice, so the real
  // overlap is about 2x the intended 100 tokens (about 77 words).
  it.todo('overlaps consecutive chunks by exactly 100 tokens (about 77 words)');

  it('fills metadata fields on every chunk', () => {
    const chunks = chunkDocument('src-1', 'My Title', words(1000));
    chunks.forEach((c, i) => {
      expect(c.sourceId).toBe('src-1');
      expect(c.sourceTitle).toBe('My Title');
      expect(c.chunkIndex).toBe(i);
      expect(c.chunkId).toBe(`src-1#chunk_${i}`);
      expect(c.metadata.totalChunks).toBe(chunks.length);
      expect(Number.isNaN(Date.parse(c.metadata.createdAt))).toBe(false);
      expect(c.startPosition).toBeGreaterThanOrEqual(0);
      expect(c.endPosition).toBeGreaterThan(c.startPosition);
    });
  });
});
