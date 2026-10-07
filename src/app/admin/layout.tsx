import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getAdminSession } from '@/lib/admin';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect('/');

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center gap-6 border-b border-gray-200 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Admin</h1>
        <nav className="flex gap-4 text-sm font-medium text-gray-600">
          <Link href="/admin" className="hover:text-gray-900">
            Overview
          </Link>
          <Link href="/admin/users" className="hover:text-gray-900">
            Users
          </Link>
          <Link href="/admin/pros" className="hover:text-gray-900">
            Pros
          </Link>
          <Link href="/admin/requests" className="hover:text-gray-900">
            Listings
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
