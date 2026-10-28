'use client';

import { useState, useEffect } from 'react';
import { API_BASE } from '../../lib/api';

// TEMP: latency measurement
type LatencyMetric = {
  time: string;
  question: string;
  ttft_ms: number | null;
  total_ms: number;
  chunks: number;
  chunks_per_s: number | null;
  answer_chars: number;
  retrieval_ms: number | null;
  context_chunks: number | null;
  context_chars: number | null;
  answer: string;
  prompt_eval_count: number | null;
  prompt_eval_ms: number | null;
  eval_count: number | null;
  eval_ms: number | null;
  load_ms: number | null;
  context_hash: string | null;
  context_chunk_ids: string | null; // ids joined with ';'
  same_ctx_as_prev: boolean;
};

// TEMP: latency measurement
declare global {
  interface Window {
    __metrics?: LatencyMetric[];
    downloadMetrics?: () => void;
    clearMetrics?: () => void;
  }
}

// TEMP: latency measurement
if (typeof window !== 'undefined') {
  const csvCell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  window.downloadMetrics = () => {
    const cols: (keyof LatencyMetric)[] = [
      'time',
      'question',
      'ttft_ms',
      'total_ms',
      'chunks',
      'chunks_per_s',
      'answer_chars',
      'retrieval_ms',
      'context_chunks',
      'context_chars',
      'answer',
      'prompt_eval_count',
      'prompt_eval_ms',
      'eval_count',
      'eval_ms',
      'load_ms',
      'context_hash',
      'context_chunk_ids',
      'same_ctx_as_prev',
    ];
    const rows = (window.__metrics || []).map((m) =>
      cols.map((c) => csvCell(m[c])).join(','),
    );
    const csv = [cols.join(','), ...rows].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'insightgraph-latency.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  window.clearMetrics = () => {
    window.__metrics = [];
  };
}

export default function AskPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleAsk = async () => {
    setIsLoading(true);
    setAnswer('');
    setSources([]);

    try {
      const t0 = performance.now(); // TEMP: latency measurement
      let tFirst: number | null = null; // TEMP: latency measurement
      let chunks = 0; // TEMP: latency measurement
      let answerChars = 0; // TEMP: latency measurement
      let answerText = ''; // TEMP: latency measurement
      let meta: {
        retrieval_ms?: number | null;
        context_chunks?: number | null;
        context_chars?: number | null;
        context_hash?: string | null;
        context_chunk_ids?: string[] | null;
      } = {}; // TEMP: latency measurement
      let stats: {
        prompt_eval_count?: number | null;
        prompt_eval_duration_ms?: number | null;
        eval_count?: number | null;
        eval_duration_ms?: number | null;
        load_duration_ms?: number | null;
      } = {}; // TEMP: latency measurement

      const response = await fetch(`${API_BASE}/ask/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        console.error('Response body reader is undefined.');
        setIsLoading(false);
        return;
      }

      const decoder = new TextDecoder('utf-8');
      let done = false;
      let buffer = '';
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Split by double newlines (SSE format uses \n\n to separate events)
        const events = buffer.split('\n\n');

        // Keep the last incomplete event in the buffer
        buffer = events[events.length - 1];

        // Process all complete events
        for (let i = 0; i < events.length - 1; i++) {
          const event = events[i].trim();
          if (event) {
            try {
              // SSE format: "data: {...JSON...}"
              if (event.startsWith('data: ')) {
                const jsonStr = event.substring(6); // Remove "data: " prefix
                if (jsonStr === '[DONE]') {
                  // Stream completed
                  continue;
                }
                const data = JSON.parse(jsonStr);
                if (data.type === 'answer') {
                  if (tFirst === null) tFirst = performance.now(); // TEMP: latency measurement
                  chunks++; // TEMP: latency measurement
                  answerChars += String(data.content ?? '').length; // TEMP: latency measurement
                  answerText += String(data.content ?? ''); // TEMP: latency measurement
                  setAnswer((prev) => prev + data.content);
                } else if (data.type === 'meta') {
                  meta = data; // TEMP: latency measurement
                } else if (data.type === 'stats') {
                  stats = data; // TEMP: latency measurement
                } else if (data.type === 'sources') {
                  setSources(data.sources);
                } else if (data.type === 'error') {
                  console.error('Backend error:', data.error);
                  setAnswer(`Error: ${data.error}`);
                }
              }
            } catch (error) {
              console.error(
                'Error parsing event:',
                error,
                'Raw event:',
                event.slice(0, 100),
              );
            }
          }
        }
      }

      // TEMP: latency measurement
      const tEnd = performance.now();
      const streamSecs = tFirst === null ? 0 : (tEnd - tFirst) / 1000;
      const metric: LatencyMetric = {
        time: new Date().toISOString(),
        question,
        ttft_ms: tFirst === null ? null : Math.round(tFirst - t0),
        total_ms: Math.round(tEnd - t0),
        chunks,
        chunks_per_s:
          streamSecs > 0 ? Number((chunks / streamSecs).toFixed(1)) : null,
        answer_chars: answerChars,
        retrieval_ms: meta.retrieval_ms ?? null,
        context_chunks: meta.context_chunks ?? null,
        context_chars: meta.context_chars ?? null,
        answer: answerText,
        prompt_eval_count: stats.prompt_eval_count ?? null,
        prompt_eval_ms: stats.prompt_eval_duration_ms ?? null,
        eval_count: stats.eval_count ?? null,
        eval_ms: stats.eval_duration_ms ?? null,
        load_ms: stats.load_duration_ms ?? null,
        context_hash: meta.context_hash ?? null,
        context_chunk_ids: meta.context_chunk_ids
          ? meta.context_chunk_ids.join(';')
          : null,
        same_ctx_as_prev:
          !!meta.context_hash &&
          meta.context_hash === window.__metrics?.at(-1)?.context_hash,
      };
      console.table(metric);
      (window.__metrics ||= []).push(metric);

      setSources((prevSources) => prevSources || []); // Ensure sources is initialized as an array

      setIsLoading(false);
    } catch (error) {
      console.error('Error asking question:', error);
      setAnswer(
        'Error: Could not get answer. Make sure the backend is running on port 5000.',
      );
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isMounted ? (
        <div className='flex items-center justify-center p-4'>
          <p>Loading...</p>
        </div>
      ) : (
        <div className='mx-auto flex w-full max-w-3xl flex-col items-center'>
          <h1 className='text-2xl font-bold mb-4'>Ask a Question</h1>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder='Type your question here...'
            rows={4}
            className='w-full p-2 border rounded mb-4'
          />
          <button
            onClick={handleAsk}
            disabled={isLoading}
            className='w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50'
          >
            {isLoading ? 'Loading...' : 'Ask'}
          </button>
          <div className='mt-4 w-full'>
            <h2 className='text-xl font-semibold'>Answer:</h2>
            <p className='whitespace-pre-wrap break-words border p-2 rounded bg-gray-100'>
              {answer || 'Your answer will appear here.'}
            </p>
            {sources.length > 0 && (
              <div className='mt-4'>
                <h3 className='text-lg font-semibold'>Sources:</h3>
                <ul className='list-disc pl-5'>
                  {sources.map((source: { title: string }, index: number) => (
                    <li key={index} className='break-words'>
                      {source.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
