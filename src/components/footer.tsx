import Link from 'next/link';
import { Logo } from '@/components/logo';

const columns = [
  {
    title: 'For homeowners',
    links: [
      { href: '/categories', label: 'Browse services' },
      { href: '/request/new', label: 'Post a job' },
      { href: '/how-it-works', label: 'How it works' },
    ],
  },
  {
    title: 'For pros',
    links: [
      { href: '/pro/signup', label: 'Become a pro' },
      { href: '/how-it-works', label: 'How it works' },
      { href: '/login', label: 'Pro login' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/login', label: 'Log in' },
      { href: '/signup', label: 'Sign up' },
      { href: '/terms', label: 'Terms of Service' },
      { href: '/privacy', label: 'Privacy Policy' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-gray-900 bg-gray-950">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-gray-400">
              Home repairs, handled by trusted local pros. Get quotes, compare pros, and book with confidence.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 text-sm font-semibold text-white">{col.title}</h3>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-gray-400 transition-colors hover:text-brand-400">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-gray-900 pt-6 text-xs text-gray-500">
          © {new Date().getFullYear()} Repair Bee. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
