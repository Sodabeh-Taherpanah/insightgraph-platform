'use client';

import Link from 'next/link';
import SearchBox from '@/components/SearchBox';

export default function SearchPage() {
  return (
    <div className='mx-auto max-w-3xl'>
      <h2 className='text-2xl font-semibold mb-2'>Search</h2>
      <p className='text-gray-600 mb-4'>
        Find the exact passages in your uploaded documents that contain your
        words. Results are ranked by keyword match (score), with no AI
        involved. To get a written answer instead, use{' '}
        <Link href='/ask' className='text-blue-600 underline'>
          Ask
        </Link>
        .
      </p>
      <p className='text-sm text-gray-600 mb-4'>
        Score = how well the passage matches your words (higher is better)
      </p>
      <SearchBox />
    </div>
  );
}
