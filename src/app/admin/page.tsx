import { Card, CardContent } from '@/components/ui/card';
import { SUBSCRIPTION_PRICE_CENTS } from '@/lib/pricing';
import { formatCents } from '@/lib/utils';
import { prisma } from '@/lib/prisma';

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
  const [
    customerCount,
    proCount,
    requestCount,
    openRequestCount,
    bookingCount,
    activeSubscriptions,
    pendingVerificationCount,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.count({ where: { role: 'PRO' } }),
    prisma.serviceRequest.count(),
    prisma.serviceRequest.count({ where: { status: { in: ['OPEN', 'QUOTED'] } } }),
    prisma.booking.count(),
    prisma.proProfile.count({ where: { subscriptionStatus: 'ACTIVE' } }),
    prisma.proProfile.count({ where: { verified: false } }),
  ]);

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-gray-900">Platform overview</h2>
      <p className="mb-4 text-sm text-gray-500">
        Pros pay Repair Bee a monthly subscription. Customers pay pros directly outside the app, so booking totals
        aren't platform revenue.
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Customers" value={customerCount.toLocaleString()} />
        <StatCard label="Pros" value={proCount.toLocaleString()} />
        <StatCard label="Total job requests" value={requestCount.toLocaleString()} />
        <StatCard label="Open requests" value={openRequestCount.toLocaleString()} />
        <StatCard label="Bookings" value={bookingCount.toLocaleString()} />
        <StatCard label="Pending verification" value={pendingVerificationCount.toLocaleString()} />
        <StatCard label="Active subscriptions" value={activeSubscriptions.toLocaleString()} />
        <StatCard
          label="Subscription revenue (est/mo)"
          value={formatCents(activeSubscriptions * SUBSCRIPTION_PRICE_CENTS)}
        />
      </div>
    </div>
  );
}
