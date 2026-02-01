'use client';

import { useState, useEffect } from 'react';

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
      const response = await fetch('http://localhost:3001/ask/stream', {
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
                  setAnswer((prev) => prev + data.content);
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
        <div className='flex flex-col items-center p-4'>
          <h1 className='text-2xl font-bold mb-4'>Ask a Question</h1>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder='Type your question here...'
            className='w-full p-2 border rounded mb-4'
          />
          <button
            onClick={handleAsk}
            disabled={isLoading}
            className='px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50'
          >
            {isLoading ? 'Loading...' : 'Ask'}
          </button>
          <div className='mt-4 w-full'>
            <h2 className='text-xl font-semibold'>Answer:</h2>
            <p className='whitespace-pre-wrap border p-2 rounded bg-gray-100'>
              {answer || 'Your answer will appear here.'}
            </p>
            {sources.length > 0 && (
              <div className='mt-4'>
                <h3 className='text-lg font-semibold'>Sources:</h3>
                <ul className='list-disc pl-5'>
                  {sources.map((source: { title: string }, index: number) => (
                    <li key={index}>{source.title}</li>
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
