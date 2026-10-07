import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { prisma } from '@/lib/prisma';

import { CancelButton } from './cancel-button';

export default async function AdminRequestsPage() {
  const requests = await prisma.serviceRequest.findMany({
    include: { category: true, customer: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-gray-900">Listings ({requests.length})</h2>
      <div className="flex flex-col gap-2">
        {requests.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex items-center justify-between">
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
              {r.status !== 'CANCELLED' && <CancelButton requestId={r.id} />}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
