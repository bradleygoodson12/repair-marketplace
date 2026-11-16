import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { prisma } from '@/lib/prisma';

import { CancelButton } from './cancel-button';
import { InviteProForm } from './invite-pro-form';

export default async function AdminRequestsPage() {
  const requests = await prisma.serviceRequest.findMany({
    include: { category: true, customer: true, quotes: { select: { proProfileId: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // Fetched once for every category present on this page, rather than once
  // per request row, to avoid N+1 queries on a 100-row listing.
  const categoryIds = [...new Set(requests.map((r) => r.categoryId))];
  const prosByCategory = new Map<string, { id: string; businessName: string }[]>();
  if (categoryIds.length > 0) {
    const proCategories = await prisma.proProfileCategory.findMany({
      where: { categoryId: { in: categoryIds }, proProfile: { verified: true } },
      include: { proProfile: { select: { id: true, businessName: true } } },
    });
    for (const pc of proCategories) {
      const list = prosByCategory.get(pc.categoryId) ?? [];
      list.push(pc.proProfile);
      prosByCategory.set(pc.categoryId, list);
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-gray-900">Listings ({requests.length})</h2>
      <div className="flex flex-col gap-2">
        {requests.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Link href={`/requests/${r.id}`} className="font-semibold text-gray-900 hover:underline">
                    {r.title}
                  </Link>
                  <Badge status={r.status} />
                </div>
                <p className="text-sm text-gray-500">
                  {r.category.icon} {r.category.name} · {r.customer.name} ({r.customer.email}) ·{' '}
                  {formatDate(r.createdAt)}
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                {(r.status === 'OPEN' || r.status === 'QUOTED') && (
                  <InviteProForm
                    requestId={r.id}
                    pros={(prosByCategory.get(r.categoryId) ?? []).filter(
                      (p) => !r.quotes.some((q) => q.proProfileId === p.id),
                    )}
                  />
                )}
                {r.status !== 'CANCELLED' && <CancelButton requestId={r.id} />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
