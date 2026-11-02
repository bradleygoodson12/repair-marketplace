import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { AccountProfileForm } from '@/components/account-profile-form';
import { Button } from '@/components/ui/button';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import { PropertyGroup } from './property-group';

export default async function CustomerDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  if (session.user.role === 'ADMIN') redirect('/admin');
  if (session.user.role !== 'CUSTOMER') redirect('/dashboard/pro');

  const [user, requests, unreadNotifications] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.user.id } }),
    prisma.serviceRequest.findMany({
      where: { customerId: session.user.id },
      include: { category: true, quotes: true, property: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where: { userId: session.user.id, read: false } }),
  ]);

  // One card per property/job address rather than one per individual repair
  // item — a document upload can create many ServiceRequests (one per line
  // item) for the same address, which used to flood this list. Order of
  // first appearance follows `requests`, already sorted newest-first.
  const propertyOrder: string[] = [];
  const byProperty = new Map<string, { address: string; requests: typeof requests }>();
  for (const r of requests) {
    if (!byProperty.has(r.propertyId)) {
      propertyOrder.push(r.propertyId);
      const addressParts = [r.property.addressLine1, r.property.city, r.property.state, r.property.zip].filter(Boolean);
      byProperty.set(r.propertyId, { address: addressParts.join(', '), requests: [] });
    }
    byProperty.get(r.propertyId)!.requests.push(r);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Your requests</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/notifications" className="mr-2 text-sm font-medium text-brand-600 hover:underline">
            Notifications
            {unreadNotifications > 0 && (
              <span className="ml-1.5 rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold text-gray-950">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </Link>
          <Link href="/request/upload">
            <Button variant="outline">Upload a repair list</Button>
          </Link>
          <Link href="/request/new">
            <Button>Post a new job</Button>
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <AccountProfileForm email={user.email} initialImage={user.image} initialPhone={user.phone} />
      </div>

      {requests.length === 0 ? (
        <p className="text-gray-500">You haven't posted any repair jobs yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {propertyOrder.map((propertyId) => {
            const group = byProperty.get(propertyId)!;
            return (
              <PropertyGroup
                key={propertyId}
                address={group.address}
                requests={group.requests.map((r) => ({
                  id: r.id,
                  title: r.title,
                  status: r.status,
                  postedAsAgent: r.postedAsAgent,
                  clientName: r.clientName,
                  quoteCount: r.quotes.length,
                  category: { icon: r.category.icon, name: r.category.name },
                }))}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
