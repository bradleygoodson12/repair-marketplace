'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';

export function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="bg-gray-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-gray-300 md:flex">
          <Link href="/categories" className="transition-colors hover:text-white">
            Browse services
          </Link>
          <Link href="/how-it-works" className="transition-colors hover:text-white">
            How it works
          </Link>
          <Link href="/pro/signup" className="transition-colors hover:text-white">
            Become a pro
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {session ? (
            <>
              {session.user.role === 'ADMIN' ? (
                <Link href="/admin" className="text-sm font-medium text-gray-300 hover:text-white">
                  Admin
                </Link>
              ) : (
                <Link
                  href={session.user.role === 'PRO' ? '/dashboard/pro' : '/dashboard/customer'}
                  className="text-sm font-medium text-gray-300 hover:text-white"
                >
                  Dashboard
                </Link>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="border-gray-700 bg-transparent text-white hover:border-gray-500 hover:bg-gray-900"
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white">
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
