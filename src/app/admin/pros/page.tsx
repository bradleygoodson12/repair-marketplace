import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { StarRating } from '@/components/star-rating';
import { prisma } from '@/lib/prisma';

import { VerifyButton } from './verify-button';

export default async function AdminProsPage() {
  const pros = await prisma.proProfile.findMany({
    include: { user: true, categories: { include: { category: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-gray-900">Pros ({pros.length})</h2>
      <div className="flex flex-col gap-2">
        {pros.map((pro) => (
          <Card key={pro.id}>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Link href={`/pros/${pro.id}`} className="font-semibold text-gray-900 hover:underline">
                    {pro.businessName}
                  </Link>
                  {pro.verified && (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {pro.user.email} · {pro.serviceZip} · {pro.categories.map((c) => c.category.name).join(', ')}
                </p>
                <div className="mt-1">
                  <StarRating rating={pro.avgRating} count={pro.reviewCount} />
                </div>
              </div>
              <VerifyButton proId={pro.id} verified={pro.verified} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
