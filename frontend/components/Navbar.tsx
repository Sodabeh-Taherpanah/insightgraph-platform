'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

const LINKS = [
  { href: '/upload', label: 'Upload' },
  { href: '/ask', label: 'Ask' },
  { href: '/search', label: 'Search' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const linkClass = (href: string) =>
    `text-sm hover:text-blue-600 ${
      pathname === href ? 'text-blue-600 font-medium' : 'text-gray-600'
    }`;

  return (
    <header className='relative w-full border-b bg-white p-3 flex items-center justify-between'>
      <div className='flex items-center space-x-4'>
        <Link href='/' className='text-xl font-semibold hover:text-blue-600'>
          InsightGraph AI
        </Link>
        <nav className='hidden md:flex items-center space-x-4'>
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className={linkClass(href)}>
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <div className='flex items-center space-x-3'>
        <div className='flex items-center space-x-2'>
          <button className='w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center'>
            <span className='sr-only'>Profile</span>
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none'>
              <path
                d='M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z'
                fill='#374151'
              />
              <path d='M4 20c0-4 4-6 8-6s8 2 8 6' fill='#374151' />
            </svg>
          </button>
        </div>

        <button
          className='md:hidden p-2'
          onClick={() => setIsOpen(!isOpen)}
          aria-label='Toggle menu'
          aria-expanded={isOpen}
        >
          <svg
            className='w-6 h-6'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d={isOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className='absolute top-full left-0 right-0 z-10 bg-white border-b md:hidden'>
          <nav className='flex flex-col p-4 space-y-3'>
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={linkClass(href)}
                onClick={() => setIsOpen(false)}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
