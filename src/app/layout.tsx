import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/navbar';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'FixItPro | Home Repair Marketplace',
  description: 'Find trusted, vetted pros for any home repair job — get quotes, book, and pay all in one place.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navbar />
          <main className="min-h-screen">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
