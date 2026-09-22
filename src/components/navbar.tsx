'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold text-brand-600">
          FixIt<span className="text-gray-900">Pro</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
          <Link href="/categories" className="hover:text-gray-900">Browse services</Link>
          <Link href="/how-it-works" className="hover:text-gray-900">How it works</Link>
          <Link href="/pro/signup" className="hover:text-gray-900">Become a pro</Link>
        </nav>

        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link
                href={session.user.role === 'PRO' ? '/dashboard/pro' : '/dashboard/customer'}
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Dashboard
              </Link>
              <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/' })}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900">
                Log in
              </Link>
              <Link href="/signup">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
