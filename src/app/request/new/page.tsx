import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { Suspense } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { RequestForm } from './request-form';

export default async function NewRequestPage() {
  const session = await getServerSession(authOptions);
  const [categories, savedProperties] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    session?.user
      ? prisma.property.findMany({
          where: { ownerId: session.user.id },
          orderBy: { createdAt: 'desc' },
          distinct: ['addressLine1', 'city', 'state', 'zip'],
          take: 5,
        })
      : [],
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Post a repair job</h1>
        <Link href="/request/upload" className="text-sm font-medium text-brand-600 hover:underline">
          Have a repair list document instead?
        </Link>
      </div>
      <Card>
        <CardContent>
          <Suspense>
            <RequestForm categories={categories} savedProperties={savedProperties} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
