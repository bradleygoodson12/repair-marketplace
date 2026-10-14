import Link from 'next/link';

import { AttachmentThumb } from '@/components/attachment-thumb';
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
        {pros.map((pro) => {
          const requiredCategories = pro.categories.filter((c) => c.category.licenseRequired).map((c) => c.category.name);
          const requiresLicense = requiredCategories.length > 0;
          const missingDocs = requiresLicense && pro.licenseDocumentUrls.length === 0;

          return (
            <Card key={pro.id}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                      <a href={`mailto:${pro.user.email}`} className="hover:text-brand-700 hover:underline">
                        {pro.user.email}
                      </a>
                      {pro.user.phone && (
                        <>
                          {' · '}
                          <a href={`tel:${pro.user.phone}`} className="hover:text-brand-700 hover:underline">
                            {pro.user.phone}
                          </a>
                        </>
                      )}
                      {' · '}
                      {pro.serviceZip} · {pro.categories.map((c) => c.category.name).join(', ')}
                      {pro.licenseNumber && <> · License #{pro.licenseNumber}</>}
                    </p>
                    <div className="mt-1">
                      <StarRating rating={pro.avgRating} count={pro.reviewCount} />
                    </div>
                  </div>
                  <VerifyButton proId={pro.id} verified={pro.verified} />
                </div>

                {requiresLicense && (
                  <div className="border-t border-gray-100 pt-3">
                    {missingDocs ? (
                      <p className="text-sm font-medium text-red-600">
                        ⚠️ License required for {requiredCategories.join(', ')} — no documentation uploaded.
                      </p>
                    ) : (
                      <>
                        <p className="mb-2 text-sm font-medium text-gray-700">
                          License documentation ({requiredCategories.join(', ')}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {pro.licenseDocumentUrls.map((url) => (
                            <AttachmentThumb key={url} url={url} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
