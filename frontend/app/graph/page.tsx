'use client';

import GraphView from '@/components/GraphView';

export default function GraphPage() {
  return (
    <div className='h-full w-full'>
      <h2 className='text-2xl font-semibold mb-4'>Knowledge Graph</h2>
      <GraphView />
    </div>
  );
}
