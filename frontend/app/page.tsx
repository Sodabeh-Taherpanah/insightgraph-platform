import Link from 'next/link';

export default function HomePage() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      <div className='container mx-auto px-4 py-16'>
        <div className='text-center mb-16'>
          <h1 className='text-5xl font-bold text-gray-900 mb-4'>
            InsightGraph AI
          </h1>
          <p className='text-xl text-gray-600 max-w-2xl mx-auto'>
            Transform your documents into interactive knowledge graphs powered
            by AI. Extract insights, discover connections, and explore your data
            like never before.
          </p>
        </div>

        <div className='grid md:grid-cols-4 gap-8 max-w-6xl mx-auto'>
          <div className='bg-white rounded-lg shadow-lg p-8 text-center hover:shadow-xl transition-shadow'>
            <div className='w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <svg
                className='w-8 h-8 text-blue-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
                />
              </svg>
            </div>
            <h3 className='text-xl font-semibold mb-2'>Upload Documents</h3>
            <p className='text-gray-600 mb-4'>
              Upload text files or paste content to automatically extract
              knowledge triplets and build your graph.
            </p>
            <Link
              href='/upload'
              className='inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors'
            >
              Start Uploading
            </Link>
          </div>

          <div className='bg-white rounded-lg shadow-lg p-8 text-center hover:shadow-xl transition-shadow'>
            <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <svg
                className='w-8 h-8 text-green-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                />
              </svg>
            </div>
            <h3 className='text-xl font-semibold mb-2'>Search Insights</h3>
            <p className='text-gray-600 mb-4'>
              Search through your documents with powerful Elasticsearch to find
              relevant information quickly.
            </p>
            <Link
              href='/search'
              className='inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors'
            >
              Start Searching
            </Link>
          </div>

          <div className='bg-white rounded-lg shadow-lg p-8 text-center hover:shadow-xl transition-shadow'>
            <div className='w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <svg
                className='w-8 h-8 text-orange-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
                />
              </svg>
            </div>
            <h3 className='text-xl font-semibold mb-2'>Ask AI</h3>
            <p className='text-gray-600 mb-4'>
              Ask questions about your documents and get intelligent answers
              powered by AI with source references.
            </p>
            <Link
              href='/ask'
              className='inline-block bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors'
            >
              Start Asking
            </Link>
          </div>

          <div className='bg-white rounded-lg shadow-lg p-8 text-center hover:shadow-xl transition-shadow'>
            <div className='w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <svg
                className='w-8 h-8 text-purple-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                />
              </svg>
            </div>
            <h3 className='text-xl font-semibold mb-2'>Explore Graph</h3>
            <p className='text-gray-600 mb-4'>
              Visualize relationships between concepts with an interactive graph
              powered by React Flow.
            </p>
            <Link
              href='/graph'
              className='inline-block bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors'
            >
              View Graph
            </Link>
          </div>
        </div>

        <div className='text-center mt-16'>
          <div className='bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto'>
            <h2 className='text-2xl font-semibold mb-4'>How It Works</h2>
            <div className='grid md:grid-cols-5 gap-6 text-left'>
              <div className='text-center'>
                <div className='w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 text-blue-600 font-bold'>
                  1
                </div>
                <p className='text-sm text-gray-600'>
                  Upload documents or paste text content
                </p>
              </div>
              <div className='text-center'>
                <div className='w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 text-green-600 font-bold'>
                  2
                </div>
                <p className='text-sm text-gray-600'>
                  AI extracts knowledge triplets (subject-predicate-object)
                </p>
              </div>
              <div className='text-center'>
                <div className='w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2 text-purple-600 font-bold'>
                  3
                </div>
                <p className='text-sm text-gray-600'>
                  Relationships are stored in the knowledge graph
                </p>
              </div>
              <div className='text-center'>
                <div className='w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2 text-orange-600 font-bold'>
                  4
                </div>
                <p className='text-sm text-gray-600'>
                  Search and explore insights interactively
                </p>
              </div>
              <div className='text-center'>
                <div className='w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2 text-red-600 font-bold'>
                  5
                </div>
                <p className='text-sm text-gray-600'>
                  Ask AI questions for contextual answers
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
