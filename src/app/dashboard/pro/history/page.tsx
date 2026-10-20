import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import type { Prisma, QuoteStatus, RequestStatus } from '@prisma/client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { authOptions } from '@/lib/auth';
import { formatCents, formatDate } from '@/lib/utils';
import { prisma } from '@/lib/prisma';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;
type FilterValue = (typeof FILTERS)[number]['value'];

const FILTER_TO_QUOTE_STATUS: Partial<Record<FilterValue, QuoteStatus>> = {
  pending: 'PENDING',
  accepted: 'ACCEPTED',
  declined: 'DECLINED',
};
const FILTER_TO_REQUEST_STATUS: Partial<Record<FilterValue, RequestStatus>> = {
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};

export default async function ProJobHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'PRO') redirect('/dashboard/customer');

  const proProfile = await prisma.proProfile.findUnique({ where: { userId: session.user.id } });
  if (!proProfile) redirect('/dashboard/pro');

  const { filter: filterParam } = await searchParams;
  const filter: FilterValue = FILTERS.some((f) => f.value === filterParam) ? (filterParam as FilterValue) : 'all';

  const where: Prisma.QuoteWhereInput = { proProfileId: proProfile.id };
  if (FILTER_TO_QUOTE_STATUS[filter]) where.status = FILTER_TO_QUOTE_STATUS[filter];
  if (FILTER_TO_REQUEST_STATUS[filter]) where.request = { status: FILTER_TO_REQUEST_STATUS[filter] };

  const quotes = await prisma.quote.findMany({
    where,
    include: { request: { include: { category: true, property: true, booking: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Job history</h1>
        <Link href="/dashboard/pro" className="text-sm font-medium text-brand-600 hover:underline">
          Back to dashboard
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === 'all' ? '/dashboard/pro/history' : `/dashboard/pro/history?filter=${f.value}`}
            className={`rounded-full border px-3 py-1 text-sm ${
              filter === f.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-300 text-gray-600'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {quotes.length === 0 ? (
        <p className="text-gray-500">
          {filter === 'all' ? "You haven't quoted any jobs yet." : 'No jobs match this filter.'}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {quotes.map((q) => (
            <Link key={q.id} href={`/requests/${q.request.id}`}>
              <Card className="transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
                <CardContent className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {q.request.category.icon} {q.request.category.name}
                      </span>
                      <Badge status={q.status} />
                      <Badge status={q.request.status} />
                    </div>
                    <p className="font-semibold text-gray-900">{q.request.title}</p>
                    <p className="text-sm text-gray-500">
                      {q.request.property.city}, {q.request.property.state} · Quoted {formatDate(q.createdAt)}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {formatCents(q.priceCents)}
                    {q.isEstimate && <span className="ml-1 text-xs font-normal text-gray-400">(estimate)</span>}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
