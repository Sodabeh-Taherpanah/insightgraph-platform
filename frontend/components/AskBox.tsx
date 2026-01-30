'use client';

import { useState } from 'react';
import { API_BASE } from '../lib/api';

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
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<AskResponse['sources']>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useStreaming, setUseStreaming] = useState(true);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setAnswer('');
    setSources([]);

    try {
      if (useStreaming) {
        await handleStreamingAsk();
      } else {
        await handleStandardAsk();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleStandardAsk = async () => {
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
    setAnswer(data.answer);
    setSources(data.sources);
  };

  const handleStreamingAsk = async () => {
    const res = await fetch('http://localhost:4000/ask/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    });

    if (!res.ok) {
      throw new Error(`Error: ${res.status}`);
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Response body is not readable');
    }

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'answer') {
              setAnswer((prev) => prev + parsed.content);
            } else if (parsed.type === 'sources') {
              setSources(parsed.sources);
            } else if (parsed.type === 'error') {
              throw new Error(parsed.error);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  };

  return (
    <div className='p-4 max-w-4xl mx-auto'>
      <form onSubmit={handleAsk} className='mb-6'>
        <div className='flex gap-2 mb-3'>
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
        </div>
        <label className='flex items-center gap-2 text-sm text-gray-600'>
          <input
            type='checkbox'
            checked={useStreaming}
            onChange={(e) => setUseStreaming(e.target.checked)}
            disabled={loading}
            className='w-4 h-4'
          />
          <span>Use streaming response (real-time tokens)</span>
        </label>
      </form>

      {error && (
        <div className='bg-red-50 border border-red-200 p-4 rounded-lg mb-4'>
          <p className='text-red-700'>{error}</p>
        </div>
      )}

      {(answer || loading) && (
        <div className='space-y-6'>
          <div className='bg-blue-50 border border-blue-200 p-6 rounded-lg'>
            <h3 className='font-semibold text-lg mb-2'>Answer</h3>
            <p className='text-gray-800 leading-relaxed whitespace-pre-wrap'>
              {answer}
              {loading && <span className='animate-pulse'>▌</span>}
            </p>
          </div>

          {sources.length > 0 && (
            <div>
              <h3 className='font-semibold text-lg mb-3'>Sources</h3>
              <div className='space-y-2'>
                {sources.map((source, i) => (
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
