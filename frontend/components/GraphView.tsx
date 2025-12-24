'use client';

import { useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';

export default function GraphView() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGraph = () => {
    setLoading(true);
    setError(null);
    fetch('http://localhost:4000/graph')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch graph data');
        return res.json();
      })
      .then((data) => {
        // Convert to React Flow format
        const rfNodes: Node[] = data.nodes.map((n: any, i: number) => ({
          id: n.id || `node-${i}`,
          data: { label: n.label || n.type || 'Node' },
          position: { x: Math.random() * 800, y: Math.random() * 600 },
          type: 'default',
          style: {
            background: n.type === 'entity' ? '#e3f2fd' : '#f3e5f5',
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '10px',
          },
        }));

        const rfEdges: Edge[] = data.edges.map((e: any, i: number) => ({
          id: `edge-${i}`,
          source: e.from || e.source,
          target: e.to || e.target,
          label: e.relation || e.type || '',
          type: 'smoothstep',
          style: { stroke: '#666', strokeWidth: 2 },
          labelStyle: { fontSize: '12px', fill: '#333' },
        }));

        setNodes(rfNodes);
        setEdges(rfEdges);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load graph:', err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadGraph();
  }, []);

  if (error) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <div className='text-center'>
          <div className='text-red-600 mb-4'>
            <svg
              className='w-12 h-12 mx-auto mb-2'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z'
              />
            </svg>
          </div>
          <h3 className='text-lg font-semibold mb-2'>Failed to Load Graph</h3>
          <p className='text-gray-600 mb-4'>{error}</p>
          <button
            onClick={loadGraph}
            className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors'
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='h-screen w-full'>
      <div className='p-4 bg-gray-100 border-b flex justify-between items-center'>
        <div>
          <h2 className='text-2xl font-bold'>Knowledge Graph Visualization</h2>
          <p className='text-sm text-gray-600'>
            Drag nodes, zoom, and explore relationships
          </p>
        </div>
        <button
          onClick={loadGraph}
          className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors'
        >
          Refresh
        </button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        attributionPosition='bottom-left'
      >
        <Background color='#f0f0f0' gap={20} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
