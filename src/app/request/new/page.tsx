import { Suspense } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { RequestForm } from './request-form';

export const revalidate = 3600;

export default async function NewRequestPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Post a repair job</h1>
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
