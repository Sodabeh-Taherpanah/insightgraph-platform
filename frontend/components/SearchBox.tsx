'use client';

import Link from 'next/link';
import { useState } from 'react';
import { API_BASE } from '../lib/api';

interface SearchHit {
  id: string;
  score: number | null;
  source: {
    title: string;
    text: string;
    sourceTitle?: string;
    chunkIndex?: number;
    totalChunks?: number;
  };
}

type Status = 'idle' | 'loading' | 'done' | 'unavailable';

export default function SearchBox() {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [status, setStatus] = useState<Status>('idle');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setStatus('loading');
    setSearched(q);
    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(`Backend error: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results || []);
      setStatus('done');
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
      setStatus('unavailable');
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch} className='flex gap-2 mb-6'>
        <input
          type='text'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search your documents...'
          className='border p-2 flex-1 min-w-0 rounded'
        />
        <button
          type='submit'
          disabled={status === 'loading' || !query.trim()}
          className='bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50'
        >
          Search
        </button>
      </form>

      {status === 'loading' && <p className='text-gray-600'>Searching...</p>}

      {status === 'unavailable' && (
        <p
          role='alert'
          className='border border-red-200 bg-red-50 text-red-700 p-4 rounded-lg'
        >
          The backend is unavailable. Make sure it is running and try again.
        </p>
      )}

      {status === 'done' && results.length === 0 && (
        <p className='text-gray-600'>No results for “{searched}”.</p>
      )}

      {status === 'done' && results.length > 0 && (
        <ul className='grid grid-cols-1 gap-4'>
          {results.map((hit) => {
            const { source } = hit;
            const title = source.sourceTitle || source.title;
            return (
              <li
                key={hit.id}
                className='bg-white border border-gray-200 rounded-lg p-4 shadow-sm'
              >
                <div className='flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-2'>
                  <h3 className='font-semibold text-blue-600 break-words'>
                    {title}
                  </h3>
                  <span className='text-xs text-gray-500'>
                    {typeof source.chunkIndex === 'number' &&
                      `Chunk ${source.chunkIndex + 1}${
                        source.totalChunks ? ` of ${source.totalChunks}` : ''
                      } · `}
                    Score {(hit.score ?? 0).toFixed(2)}
                  </span>
                </div>
                <p className='text-sm text-gray-700 whitespace-pre-wrap break-words line-clamp-6'>
                  {source.text}
                </p>
                <Link
                  href={`/documents/${encodeURIComponent(hit.id)}`}
                  className='inline-block mt-3 text-sm text-blue-600 hover:underline'
                >
                  View full chunk
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
