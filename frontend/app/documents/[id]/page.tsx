'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { API_BASE } from '../../../lib/api';

interface Doc {
  id: string;
  title?: string;
  text?: string;
  createdAt?: string;
}

export default function DocumentPage() {
  const params = useParams();
  const id = params?.id as string;
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_BASE}/documents/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Status ${r.status}`);
        return r.json();
      })
      .then((data) => setDoc(data))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [id]);

  function downloadTxt() {
    if (!doc) return;
    const blob = new Blob([doc.text || ''], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title || doc.id}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Summary UI state
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [useStream, setUseStream] = useState(true);
  const esRef = useRef<EventSource | null>(null);

  async function fetchSummary() {
    if (!id) return;
    setIsSummarizing(true);
    setSummary(null);
    try {
      if (useStream) {
        // start SSE stream
        const url = `${API_BASE}/documents/${id}/summary/stream`;
        const es = new EventSource(url);
        esRef.current = es;
        setSummary('');
        es.onmessage = (e) => {
          if (e.data === '[DONE]') {
            es.close();
            esRef.current = null;
            setIsSummarizing(false);
            return;
          }
          try {
            const obj = JSON.parse(e.data);
            if (obj.type === 'summary') {
              setSummary((s) => (s || '') + obj.content);
            }
          } catch (err) {
            // ignore non-json messages
          }
        };
        es.onerror = () => {
          if (esRef.current) {
            esRef.current.close();
            esRef.current = null;
          }
          setIsSummarizing(false);
        };
      } else {
        const resp = await fetch(`${API_BASE}/documents/${id}/summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!resp.ok) throw new Error(`Status ${resp.status}`);
        const data = await resp.json();
        setSummary(data.summary || null);
      }
    } catch (err) {
      setSummary(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setIsSummarizing(false);
    }
  }

  function stopSummary() {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setIsSummarizing(false);
  }

  useEffect(() => {
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, []);

  function formatContent(text: string | undefined) {
    if (!text) return null;

    // First, normalize bullets - add newlines before bullets if not present
    let normalizedText = text.replace(/([^\n])(•|-\s+[A-Z])/g, '$1\n$2');

    const lines = normalizedText.split('\n');
    const elements: React.ReactNode[] = [];
    let currentParagraph: string[] = [];
    let bulletItems: string[] = [];

    const flushParagraph = (key: string) => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join(' ').trim();
        if (text) {
          elements.push(
            <p key={key} className='mb-3 text-gray-700 leading-relaxed'>
              {text}
            </p>,
          );
        }
        currentParagraph = [];
      }
    };

    const flushBullets = (key: string) => {
      if (bulletItems.length > 0) {
        elements.push(
          <ul key={key} className='mb-4 ml-6 space-y-2'>
            {bulletItems.map((item, idx) => (
              <li
                key={`${key}-li-${idx}`}
                className='text-gray-700 leading-relaxed list-disc'
              >
                {item}
              </li>
            ))}
          </ul>,
        );
        bulletItems = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines but use them as separators
      if (!trimmed) {
        flushParagraph(`p-${i}`);
        flushBullets(`ul-${i}`);
        continue;
      }

      // Section header (ALL CAPS)
      if (
        trimmed === trimmed.toUpperCase() &&
        trimmed.length > 2 &&
        /[A-Z]/.test(trimmed) &&
        trimmed.length < 80
      ) {
        flushParagraph(`p-${i}`);
        flushBullets(`ul-${i}`);
        elements.push(
          <h2
            key={`h-${i}`}
            className='text-lg font-bold text-gray-900 mt-6 mb-3 border-b-2 border-blue-400 pb-2'
          >
            {trimmed}
          </h2>,
        );
        continue;
      }

      // Job titles with dates (e.g., "Company Name Jan 2024 - Aug 2024")
      if (
        /\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/.test(
          trimmed,
        )
      ) {
        flushParagraph(`p-${i}`);
        flushBullets(`ul-${i}`);
        elements.push(
          <h3
            key={`h3-${i}`}
            className='text-base font-semibold text-gray-800 mt-5 mb-2'
          >
            {trimmed}
          </h3>,
        );
        continue;
      }

      // Bullet point
      if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
        const bulletText = trimmed.replace(/^[•-]\s*/, '').trim();
        if (bulletText) {
          bulletItems.push(bulletText);
        }
        continue;
      }

      // Regular line - if we have bullets, flush them first
      if (bulletItems.length > 0) {
        flushBullets(`ul-${i}`);
      }
      currentParagraph.push(trimmed);
    }

    // Flush remaining content
    flushParagraph(`p-final`);
    flushBullets(`ul-final`);

    return elements;
  }

  if (loading) return <div className='p-8'>Loading...</div>;
  if (error) return <div className='p-8 text-red-600'>Error: {error}</div>;
  if (!doc) return <div className='p-8'>Document not found</div>;

  return (
    <div className='container mx-auto p-8 max-w-4xl'>
      <div className='bg-white shadow-lg rounded-lg p-8'>
        <div className='flex justify-between items-start mb-6'>
          <div className='flex-1'>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>
              {doc.title || doc.id}
            </h1>
            {doc.createdAt && (
              <p className='text-sm text-gray-500'>
                {new Date(doc.createdAt).toLocaleString()}
              </p>
            )}
          </div>
          <div className='ml-6 flex flex-col items-end space-y-2'>
            <div className='flex items-center space-x-2'>
              <button
                onClick={downloadTxt}
                className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium'
              >
                Download .txt
              </button>
              <label className='flex items-center space-x-2 text-sm'>
                <input
                  type='checkbox'
                  checked={useStream}
                  onChange={() => setUseStream((v) => !v)}
                  className='w-4 h-4'
                />
                <span>Stream</span>
              </label>
            </div>

            <div className='flex items-center space-x-2'>
              <button
                onClick={fetchSummary}
                disabled={isSummarizing}
                className='bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium disabled:opacity-50'
              >
                {isSummarizing ? 'Summarizing...' : 'Summarize'}
              </button>
              {isSummarizing && (
                <button
                  onClick={stopSummary}
                  className='bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600 transition-colors font-medium'
                >
                  Stop
                </button>
              )}
            </div>
          </div>
        </div>

        <hr className='my-6 border-gray-200' />

        {/* Summary display */}
        <div className='mb-6'>
          <div className='bg-gray-50 border border-gray-100 rounded-md p-4'>
            <h4 className='text-sm font-semibold text-gray-800 mb-2'>
              Summary
            </h4>
            <div className='min-h-[56px] text-sm text-gray-700 whitespace-pre-wrap'>
              {summary ? (
                <>{summary}</>
              ) : (
                <span className='text-gray-400'>No summary generated yet.</span>
              )}
            </div>
          </div>
        </div>

        <div className='prose prose-sm max-w-none text-gray-800 leading-relaxed'>
          {formatContent(doc.text)}
        </div>
      </div>
    </div>
  );
}
