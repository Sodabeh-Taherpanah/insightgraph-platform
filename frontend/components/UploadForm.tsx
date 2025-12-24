'use client';

import { useState } from 'react';

export default function UploadForm() {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);

    const formData = new FormData();
    if (title) formData.append('title', title);
    if (file) formData.append('file', file);
    else formData.append('text', text);

    const res = await fetch('http://localhost:4000/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setResponse(data);
    setLoading(false);
  };

  return (
    <div className='p-4'>
      <form
        onSubmit={handleSubmit}
        className='flex flex-col space-y-4 max-w-xl mx-auto'
      >
        <input
          type='text'
          placeholder='Document title (optional)'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className='border p-2 rounded'
        />
        <textarea
          placeholder='Paste text here...'
          value={text}
          onChange={(e) => setText(e.target.value)}
          className='border p-2 rounded h-32'
          disabled={!!file}
        />
        <div className='flex items-center space-x-2'>
          <input
            type='file'
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className='border p-2 rounded flex-1'
          />
          {file && (
            <button
              type='button'
              onClick={() => setFile(null)}
              className='text-red-500 hover:text-red-700'
            >
              ✕
            </button>
          )}
        </div>
        <button
          type='submit'
          disabled={loading || (!text.trim() && !file)}
          className='bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400'
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      {response && (
        <div className='mt-6 bg-white border border-gray-200 rounded-lg p-4'>
          {response.ok ? (
            <div>
              <h3 className='text-green-600 font-semibold mb-2'>
                ✅ Upload Successful!
              </h3>
              <p className='text-sm text-gray-600 mb-2'>
                Document ID:{' '}
                <code className='bg-gray-100 px-1 rounded'>
                  {response.indexed}
                </code>
              </p>
              <p className='text-sm text-gray-600 mb-2'>
                Triplets extracted: {response.triplets?.length || 0}
              </p>
              <details className='mt-4'>
                <summary className='cursor-pointer text-sm font-medium'>
                  View Details
                </summary>
                <pre className='mt-2 bg-gray-50 p-2 rounded text-xs overflow-auto max-h-40'>
                  {JSON.stringify(response, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <div>
              <h3 className='text-red-600 font-semibold mb-2'>
                ❌ Upload Failed
              </h3>
              <p className='text-sm text-red-700'>{response.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
