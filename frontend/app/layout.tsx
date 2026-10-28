import '../styles/globals.css';
import { ReactNode } from 'react';
import Navbar from '@/components/Navbar';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en'>
      <body className='flex min-h-screen flex-col'>
        <Navbar />
        <main className='flex-1 p-4 md:p-6'>{children}</main>
      </body>
    </html>
  );
}
