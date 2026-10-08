import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function CustomerDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  if (session.user.role === 'ADMIN') redirect('/admin');
  if (session.user.role !== 'CUSTOMER') redirect('/dashboard/pro');

  const requests = await prisma.serviceRequest.findMany({
    where: { customerId: session.user.id },
    include: { category: true, quotes: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Your requests</h1>
        <div className="flex gap-2">
          <Link href="/request/upload">
            <Button variant="outline">Upload a repair list</Button>
          </Link>
          <Link href="/request/new">
            <Button>Post a new job</Button>
          </Link>
        </div>
      </div>

      {requests.length === 0 ? (
        <p className="text-gray-500">You haven't posted any repair jobs yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <Link key={r.id} href={`/requests/${r.id}`}>
              <Card className="transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
                <CardContent className="flex items-center justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {r.category.icon} {r.category.name}
                      </span>
                      <Badge status={r.status} />
                    </div>
                    <p className="font-semibold text-gray-900">{r.title}</p>
                  </div>
                  <span className="text-sm text-gray-500">{r.quotes.length} quote(s)</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
