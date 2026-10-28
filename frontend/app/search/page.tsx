'use client';

import SearchBox from '@/components/SearchBox';

export default function SearchPage() {
  return (
    <div className='mx-auto max-w-3xl'>
      <h2 className='text-2xl font-semibold mb-4'>Search</h2>
      <SearchBox />
    </div>
  );
}
