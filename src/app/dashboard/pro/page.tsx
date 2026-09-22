import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { authOptions } from '@/lib/auth';
import { formatCents } from '@/lib/utils';
import { prisma } from '@/lib/prisma';

import { ProProfileForm } from './profile-form';

export default async function ProDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'PRO') redirect('/dashboard/customer');

  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  const proProfile = await prisma.proProfile.findUnique({
    where: { userId: session.user.id },
    include: { categories: true, quotes: { include: { request: true } } },
  });

  if (!proProfile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Set up your pro profile</h1>
        <p className="mb-6 text-gray-600">
          Complete your profile so customers can find and request quotes from you.
        </p>
        <Card>
          <CardContent>
            <ProProfileForm categories={categories} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const categoryIds = proProfile.categories.map((c) => c.categoryId);
  const leads = await prisma.serviceRequest.findMany({
    where: {
      categoryId: { in: categoryIds },
      status: { in: ['OPEN', 'QUOTED'] },
    },
    include: { category: true, property: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const quotedRequestIds = new Set(proProfile.quotes.map((q) => q.requestId));

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{proProfile.businessName}</h1>
          <p className="text-sm text-gray-500">
            {proProfile.avgRating.toFixed(1)} ★ ({proProfile.reviewCount} reviews)
          </p>
        </div>
        <Link href={`/pros/${proProfile.id}`} className="text-sm font-medium text-brand-600 hover:underline">
          View public profile
        </Link>
      </div>

      <h2 className="mb-4 text-lg font-bold text-gray-900">Job leads in your categories</h2>
      {leads.length === 0 ? (
        <p className="mb-8 text-gray-500">No open leads right now — check back soon.</p>
      ) : (
        <div className="mb-8 flex flex-col gap-3">
          {leads.map((r) => (
            <Link key={r.id} href={`/requests/${r.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {r.category.icon} {r.category.name}
                      </span>
                      <Badge status={r.status} />
                      {quotedRequestIds.has(r.id) && (
                        <span className="text-xs font-medium text-brand-600">You quoted</span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900">{r.title}</p>
                    <p className="text-sm text-gray-500">
                      {r.property.city}, {r.property.state} {r.property.zip}
                    </p>
                  </div>
                  {(r.budgetMinCents || r.budgetMaxCents) && (
                    <span className="text-sm text-gray-600">
                      {r.budgetMinCents ? formatCents(r.budgetMinCents) : '—'}–
                      {r.budgetMaxCents ? formatCents(r.budgetMaxCents) : '—'}
                    </span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
