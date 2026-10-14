import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { SUBSCRIPTION_PRICE_CENTS } from '@/lib/pricing';
import { formatDate, formatCents } from '@/lib/utils';
import { prisma } from '@/lib/prisma';

const THIRTY_DAYS_AGO_MS = 30 * 24 * 60 * 60 * 1000;

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function AdminOverviewPage() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    customerCount,
    proCount,
    requestCount,
    openRequestCount,
    bookingCount,
    activeSubscriptions,
    payPerQuoteProCount,
    quoteFeeRevenue30d,
    pendingVerificationCount,
    openReportCount,
    newSignupsThisWeek,
    recentUsers,
    recentRequests,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.count({ where: { role: 'PRO' } }),
    prisma.serviceRequest.count(),
    prisma.serviceRequest.count({ where: { status: { in: ['OPEN', 'QUOTED'] } } }),
    prisma.booking.count(),
    prisma.proProfile.count({ where: { subscriptionStatus: 'ACTIVE' } }),
    prisma.proProfile.count({ where: { billingMode: 'PAY_PER_QUOTE' } }),
    prisma.quote.aggregate({
      where: { quoteFeePaidAt: { gte: new Date(Date.now() - THIRTY_DAYS_AGO_MS) } },
      _sum: { quoteFeeRequiredCents: true },
    }),
    prisma.proProfile.count({ where: { verified: false } }),
    prisma.report.count({ where: { status: 'OPEN' } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.serviceRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { category: true, customer: true },
    }),
  ]);

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-gray-900">Platform overview</h2>
      <p className="mb-4 text-sm text-gray-500">
        Pros pay Repair Bee either a monthly subscription or a flat fee per quote they send. Customers pay pros
        directly outside the app, so booking totals aren't platform revenue.
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Customers" value={customerCount.toLocaleString()} />
        <StatCard label="Pros" value={proCount.toLocaleString()} />
        <StatCard label="Total job requests" value={requestCount.toLocaleString()} />
        <StatCard label="Open requests" value={openRequestCount.toLocaleString()} />
        <StatCard label="Bookings" value={bookingCount.toLocaleString()} />
        <StatCard label="Pending verification" value={pendingVerificationCount.toLocaleString()} />
        <StatCard label="Open reports" value={openReportCount.toLocaleString()} />
        <StatCard label="Active subscriptions" value={activeSubscriptions.toLocaleString()} />
        <StatCard
          label="Subscription revenue (est/mo)"
          value={formatCents(activeSubscriptions * SUBSCRIPTION_PRICE_CENTS)}
        />
        <StatCard label="Pay-per-quote pros" value={payPerQuoteProCount.toLocaleString()} />
        <StatCard
          label="Quote fee revenue (30d)"
          value={formatCents(quoteFeeRevenue30d._sum.quoteFeeRequiredCents ?? 0)}
        />
        <StatCard label="New signups (7d)" value={newSignupsThisWeek.toLocaleString()} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h3 className="mb-3 font-semibold text-gray-900">Recent signups</h3>
          <Card>
            <CardContent className="flex flex-col gap-3">
              {recentUsers.length === 0 ? (
                <p className="text-sm text-gray-500">No signups yet.</p>
              ) : (
                recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-900">
                      {u.name} <span className="text-gray-400">({u.role.toLowerCase()})</span>
                    </span>
                    <span className="text-gray-400">{formatDate(u.createdAt)}</span>
                  </div>
                ))
              )}
              <Link href="/admin/users" className="text-xs font-medium text-brand-600 hover:underline">
                View all users
              </Link>
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="mb-3 font-semibold text-gray-900">Recent job posts</h3>
          <Card>
            <CardContent className="flex flex-col gap-3">
              {recentRequests.length === 0 ? (
                <p className="text-sm text-gray-500">No job posts yet.</p>
              ) : (
                recentRequests.map((r) => (
                  <Link
                    key={r.id}
                    href={`/requests/${r.id}`}
                    className="flex items-center justify-between text-sm hover:text-brand-700"
                  >
                    <span className="truncate text-gray-900">
                      {r.category.icon} {r.title}
                    </span>
                    <span className="flex-shrink-0 text-gray-400">{formatDate(r.createdAt)}</span>
                  </Link>
                ))
              )}
              <Link href="/admin/requests" className="text-xs font-medium text-brand-600 hover:underline">
                View all listings
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
