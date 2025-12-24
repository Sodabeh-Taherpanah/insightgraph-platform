import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className='w-64 bg-gray-800 text-white min-h-screen p-4 flex flex-col'>
      <div className='mb-6'>
        <div className='flex items-center space-x-2'>
          <div className='w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center font-bold'>
            IG
          </div>
          <div>
            <div className='text-lg font-semibold'>InsightGraph</div>
            <div className='text-sm text-gray-300'>Explorer</div>
          </div>
        </div>
      </div>

      <nav className='flex-1'>
        <ul className='space-y-1'>
          <li>
            <Link
              href='/'
              className='block px-3 py-2 rounded hover:bg-gray-700'
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              href='/upload'
              className='block px-3 py-2 rounded hover:bg-gray-700'
            >
              Upload
            </Link>
          </li>
          <li>
            <Link
              href='/graph'
              className='block px-3 py-2 rounded hover:bg-gray-700'
            >
              Graph
            </Link>
          </li>
          <li>
            <Link
              href='/search'
              className='block px-3 py-2 rounded hover:bg-gray-700'
            >
              Search
            </Link>
          </li>
        </ul>
      </nav>

      <div className='mt-6'>
        <button className='w-full text-left px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500'>
          New Upload
        </button>
      </div>
    </aside>
  );
}
