'use client';

import { useState } from 'react';

export default function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(
      `http://localhost:4000/search?q=${encodeURIComponent(query)}`
    );
    const data = await res.json();
    setResults(data.results || []);
  };

  return (
    <div className='p-4'>
      <form onSubmit={handleSearch} className='flex gap-2 mb-4'>
        <input
          type='text'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search...'
          className='border p-2 flex-1 rounded'
        />
        <button
          type='submit'
          className='bg-blue-600 text-white px-4 py-2 rounded'
        >
          Search
        </button>
      </form>

      <ul className='space-y-2'>
        {results.map((r, i) => (
          <li
            key={r.id || i}
            className='border border-gray-200 p-4 rounded-lg hover:bg-gray-50'
          >
            <div className='flex justify-between items-start'>
              <div className='flex-1'>
                <h3 className='font-semibold text-lg text-blue-600'>
                  {r.source?.title || r.title}
                </h3>
                <p className='text-sm text-gray-700 mt-1 line-clamp-3'>
                  {r.source?.text || r.text}
                </p>
                <div className='flex items-center gap-4 mt-2 text-xs text-gray-500'>
                  <span>Score: {(r.score || 0).toFixed(2)}</span>
                  <span>ID: {r.id}</span>
                  {r.source?.createdAt && (
                    <span>
                      Created:{' '}
                      {new Date(r.source.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() =>
                  window.open(
                    `http://localhost:4000/documents/${r.id}`,
                    '_blank'
                  )
                }
                className='ml-4 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600'
              >
                View Full
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
