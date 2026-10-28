import Link from 'next/link';

export default function HomePage() {
  return (
    <div className='mx-auto max-w-4xl py-6 md:py-12'>
      <div className='text-center mb-10 md:mb-14'>
        <h1 className='text-3xl md:text-5xl font-bold text-gray-900 mb-4'>
          Ask your documents
        </h1>
        <p className='text-lg md:text-xl text-gray-600 max-w-2xl mx-auto'>
          Upload a document, ask a question in plain language, and get an answer
          with the exact passages it came from.
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <div className='bg-white rounded-lg shadow p-6 text-center hover:shadow-lg transition-shadow'>
          <div className='w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4'>
            <svg
              className='w-7 h-7 text-blue-600'
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
          <h3 className='text-xl font-semibold mb-2'>Upload</h3>
          <p className='text-gray-600 mb-4'>Add text or a file.</p>
          <Link
            href='/upload'
            className='inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors'
          >
            Upload
          </Link>
        </div>

        <div className='bg-white rounded-lg shadow p-6 text-center hover:shadow-lg transition-shadow'>
          <div className='w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4'>
            <svg
              className='w-7 h-7 text-orange-600'
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
          <h3 className='text-xl font-semibold mb-2'>Ask</h3>
          <p className='text-gray-600 mb-4'>Ask a question in plain language.</p>
          <Link
            href='/ask'
            className='inline-block bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors'
          >
            Ask
          </Link>
        </div>

        <div className='bg-white rounded-lg shadow p-6 text-center hover:shadow-lg transition-shadow'>
          <div className='w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
            <svg
              className='w-7 h-7 text-green-600'
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
          <h3 className='text-xl font-semibold mb-2'>Search</h3>
          <p className='text-gray-600 mb-4'>Find passages by keyword.</p>
          <Link
            href='/search'
            className='inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors'
          >
            Search
          </Link>
        </div>
      </div>

      <div className='bg-white rounded-lg shadow p-6 md:p-8 mt-10 md:mt-14'>
        <h2 className='text-2xl font-semibold mb-6 text-center'>How it works</h2>
        <ol className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          <li className='flex md:flex-col items-center gap-3 md:text-center'>
            <span className='w-10 h-10 shrink-0 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold'>
              1
            </span>
            <span className='text-gray-700'>Upload your text</span>
          </li>
          <li className='flex md:flex-col items-center gap-3 md:text-center'>
            <span className='w-10 h-10 shrink-0 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold'>
              2
            </span>
            <span className='text-gray-700'>Ask a question</span>
          </li>
          <li className='flex md:flex-col items-center gap-3 md:text-center'>
            <span className='w-10 h-10 shrink-0 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold'>
              3
            </span>
            <span className='text-gray-700'>Check the sources</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
