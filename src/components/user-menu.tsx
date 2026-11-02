'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';

interface UserMenuProps {
  name: string;
  role: string;
}

export function UserMenu({ name, role }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const firstName = name.split(' ')[0] || name;
  const dashboardHref = role === 'ADMIN' ? '/admin' : role === 'PRO' ? '/dashboard/pro' : '/dashboard/customer';
  const dashboardLabel = role === 'ADMIN' ? 'Admin' : 'Dashboard';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-white"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Hello, {firstName}
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-52 rounded-lg border border-gray-800 bg-gray-950 py-1.5 shadow-lg shadow-black/40"
        >
          <Link
            href={dashboardHref}
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-900 hover:text-white"
          >
            {dashboardLabel}
          </Link>
          {role === 'CUSTOMER' && (
            <>
              <Link
                href="/how-it-works"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-900 hover:text-white"
              >
                How it works
              </Link>
              <Link
                href="/pro/signup"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-900 hover:text-white"
              >
                Become a pro
              </Link>
            </>
          )}
          <div className="my-1.5 border-t border-gray-800" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              signOut({ callbackUrl: '/' });
            }}
            className="block w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-900 hover:text-white"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
