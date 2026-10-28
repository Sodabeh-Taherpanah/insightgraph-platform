'use client';

import { useCallback, useEffect, useState } from 'react';
import { API_BASE } from '../lib/api';

type UploadedDoc = {
  id: string;
  title: string;
  createdAt: string;
  chunks: number;
};

export default function UploadForm() {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [history, setHistory] = useState<UploadedDoc[]>([]);
  const [historyError, setHistoryError] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/documents`);
      if (!res.ok) throw new Error(`Backend error: ${res.status}`);
      const data = await res.json();
      setHistory(data.documents ?? []);
      setHistoryError(false);
    } catch {
      setHistoryError(true);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDelete = async (doc: UploadedDoc) => {
    setDeletingId(doc.id);
    setDeleteError(null);
    try {
      const res = await fetch(
        `${API_BASE}/documents/${encodeURIComponent(doc.id)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error(`Backend error: ${res.status}`);
      setConfirmId(null);
      await loadHistory();
    } catch {
      setDeleteError(`Could not delete “${doc.title}”. Try again.`);
    } finally {
      setDeletingId(null);
    }
  };

  // The backend titles a file by its lowercase file name when no title is typed.
  const nextTitle = (title.trim() || file?.name.toLowerCase() || '').trim();
  const duplicate = nextTitle
    ? history.find((d) => d.title.toLowerCase() === nextTitle.toLowerCase())
    : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);

    const formData = new FormData();
    if (title) formData.append('title', title);
    if (file) formData.append('file', file);
    else formData.append('text', text);

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    setResponse(data);
    setLoading(false);
    if (data.ok) loadHistory();
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
            accept='.txt,.md,.pdf,.docx,.xlsx,text/plain,text/markdown'
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className='border p-2 rounded flex-1 min-w-0'
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
        {duplicate && (
          <p className='text-sm text-amber-700' role='status'>
            A document named “{duplicate.title}” was already uploaded on{' '}
            {new Date(duplicate.createdAt).toLocaleString()}. Uploading again
            will replace its chunks.
          </p>
        )}
        <button
          type='submit'
          disabled={loading || (!text.trim() && !file)}
          className='bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400'
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      <section className='mt-8 max-w-xl mx-auto'>
        <h3 className='text-lg font-semibold mb-2'>Uploaded documents</h3>
        {historyError ? (
          <p className='text-sm text-gray-600'>
            Could not load the upload history. Make sure the backend is running.
          </p>
        ) : history.length === 0 ? (
          <p className='text-sm text-gray-600'>No documents uploaded yet.</p>
        ) : (
          <ul className='divide-y border rounded'>
            {history.map((doc) => (
              <li
                key={doc.id}
                className='flex items-start justify-between gap-2 p-2 text-sm'
              >
                <div className='min-w-0'>
                  <p className='font-medium break-words'>{doc.title}</p>
                  <p className='text-gray-600'>
                    {doc.chunks} {doc.chunks === 1 ? 'chunk' : 'chunks'} ·{' '}
                    {new Date(doc.createdAt).toLocaleString()}
                  </p>
                </div>
                {confirmId === doc.id ? (
                  <div className='flex shrink-0 items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => handleDelete(doc)}
                      disabled={deletingId === doc.id}
                      className='text-red-600 hover:text-red-800 disabled:opacity-50'
                    >
                      {deletingId === doc.id ? 'Deleting...' : 'Confirm delete'}
                    </button>
                    <button
                      type='button'
                      onClick={() => setConfirmId(null)}
                      disabled={deletingId === doc.id}
                      className='text-gray-600 hover:text-gray-800'
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type='button'
                    onClick={() => setConfirmId(doc.id)}
                    className='shrink-0 text-red-500 hover:text-red-700'
                  >
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {deleteError && (
          <p className='mt-2 text-sm text-red-600' role='alert'>
            {deleteError}
          </p>
        )}
      </section>

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
