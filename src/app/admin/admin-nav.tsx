'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const links = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/pros', label: 'Pros' },
  { href: '/admin/requests', label: 'Listings' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-6 text-sm font-medium">
      {links.map((link) => {
        const active = link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn('transition-colors', active ? 'text-brand-400' : 'text-gray-400 hover:text-white')}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
