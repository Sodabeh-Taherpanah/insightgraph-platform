import '../styles/globals.css';
import { ReactNode } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en'>
      <body className='flex h-screen'>
        <Sidebar />
        <div className='flex flex-col flex-1'>
          <Navbar />
          <main className='flex-1 p-6 overflow-y-auto bg-gray-50'>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
