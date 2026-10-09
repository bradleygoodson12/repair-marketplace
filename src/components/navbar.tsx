'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';

const navLinks = [
  { href: '/categories', label: 'Browse services' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/pro/signup', label: 'Become a pro' },
];

export function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-gray-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-gray-300 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 md:flex">
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

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-300 hover:bg-gray-900 hover:text-white md:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-gray-900 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1 text-sm font-medium text-gray-300">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-2 py-2 transition-colors hover:bg-gray-900 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-gray-900 pt-3">
            {session ? (
              <>
                <Link
                  href={session.user.role === 'ADMIN' ? '/admin' : session.user.role === 'PRO' ? '/dashboard/pro' : '/dashboard/customer'}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-2 py-2 text-sm font-medium text-gray-300 hover:bg-gray-900 hover:text-white"
                >
                  {session.user.role === 'ADMIN' ? 'Admin' : 'Dashboard'}
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMenuOpen(false);
                    signOut({ callbackUrl: '/' });
                  }}
                  className="border-gray-700 bg-transparent text-white hover:border-gray-500 hover:bg-gray-900"
                >
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-2 py-2 text-sm font-medium text-gray-300 hover:bg-gray-900 hover:text-white"
                >
                  Log in
                </Link>
                <Link href="/signup" onClick={() => setMenuOpen(false)}>
                  <Button className="w-full">Sign up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
