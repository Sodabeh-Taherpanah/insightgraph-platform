'use client';

import { useState } from 'react';

interface AskResponse {
  answer: string;
  sources: Array<{
    id: string;
    title: string;
    score: number;
  }>;
}

export default function AskBox() {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('http://localhost:4000/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        throw new Error(`Error: ${res.status}`);
      }

      const data: AskResponse = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='p-4 max-w-4xl mx-auto'>
      <form onSubmit={handleAsk} className='flex gap-2 mb-6'>
        <input
          type='text'
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder='Ask a question about your documents...'
          className='border p-3 flex-1 rounded-lg text-lg'
          disabled={loading}
        />
        <button
          type='submit'
          disabled={loading || !question.trim()}
          className='bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {loading ? 'Asking...' : 'Ask'}
        </button>
      </form>

      {error && (
        <div className='bg-red-50 border border-red-200 p-4 rounded-lg mb-4'>
          <p className='text-red-700'>{error}</p>
        </div>
      )}

      {response && (
        <div className='space-y-6'>
          <div className='bg-blue-50 border border-blue-200 p-6 rounded-lg'>
            <h3 className='font-semibold text-lg mb-2'>Answer</h3>
            <p className='text-gray-800 leading-relaxed'>{response.answer}</p>
          </div>

          {response.sources.length > 0 && (
            <div>
              <h3 className='font-semibold text-lg mb-3'>Sources</h3>
              <div className='space-y-2'>
                {response.sources.map((source, i) => (
                  <div
                    key={source.id}
                    className='border border-gray-200 p-4 rounded-lg hover:bg-gray-50'
                  >
                    <div className='flex justify-between items-start'>
                      <div className='flex-1'>
                        <h4 className='font-medium text-blue-600'>
                          {source.title}
                        </h4>
                        <p className='text-sm text-gray-500 mt-1'>
                          Relevance score: {source.score?.toFixed(2) || 'N/A'}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          window.open(`/documents/${source.id}`, '_blank')
                        }
                        className='text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded'
                      >
                        View Full
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
