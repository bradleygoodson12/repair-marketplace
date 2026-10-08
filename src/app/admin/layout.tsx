import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getAdminSession } from '@/lib/admin';
import { AdminNav } from './admin-nav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect('/');

  return (
    <div>
      <div className="bg-gray-950">
        <div className="mx-auto flex max-w-6xl items-center gap-8 px-4 py-6">
          <Link href="/admin" className="text-lg font-bold text-white">
            Admin
          </Link>
          <AdminNav />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
