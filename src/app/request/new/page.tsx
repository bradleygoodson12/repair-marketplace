import Link from 'next/link';
import { Suspense } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { RequestForm } from './request-form';

export const revalidate = 3600;

export default async function NewRequestPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Post a repair job</h1>
        <Link href="/request/upload" className="text-sm font-medium text-brand-600 hover:underline">
          Have a repair list document instead?
        </Link>
      </div>
      <Card>
        <CardContent>
          <Suspense>
            <RequestForm categories={categories} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
