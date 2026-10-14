import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { notFound } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ReportButton } from '@/components/report-button';
import { StarRating } from '@/components/star-rating';
import { authOptions } from '@/lib/auth';
import { siteUrl } from '@/lib/site';
import { formatCents, formatDate } from '@/lib/utils';
import { prisma } from '@/lib/prisma';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const pro = await prisma.proProfile.findUnique({
    where: { id },
    include: { categories: { include: { category: true } } },
  });
  if (!pro) return {};
  const categoryNames = pro.categories.map((c) => c.category.name).join(', ');
  return {
    title: pro.businessName,
    description: `${pro.businessName} — ${categoryNames || 'home repair pro'} on Repair Bee, serving within ${pro.serviceRadiusMiles} miles of ${pro.serviceZip}. ${pro.bio}`.slice(0, 300),
  };
}

export default async function ProProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pro = await prisma.proProfile.findUnique({
    where: { id },
    include: {
      categories: { include: { category: true } },
      reviews: { include: { customer: true }, orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });

  if (!pro) notFound();

  const session = await getServerSession(authOptions);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: pro.businessName,
    description: pro.bio,
    image: pro.photoUrl ?? undefined,
    url: `${siteUrl()}/pros/${pro.id}`,
    areaServed: pro.serviceZip,
    ...(pro.reviewCount > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: pro.avgRating,
        reviewCount: pro.reviewCount,
      },
    }),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          {pro.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pro.photoUrl} alt="" className="h-14 w-14 flex-shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gray-950 text-lg font-bold text-brand-400">
              {pro.businessName.charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{pro.businessName}</h1>
            <div className="mt-1 flex items-center gap-3">
              <StarRating rating={pro.avgRating} count={pro.reviewCount} />
              {pro.verified && (
                <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                    <path
                      fillRule="evenodd"
                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Verified pro
                </span>
              )}
            </div>
          </div>
        </div>
        <Link href={`/request/new?proId=${pro.id}`}>
          <Button size="lg">Request a quote</Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4">
          <p className="text-gray-700">{pro.bio}</p>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span>{pro.yearsExperience} years experience</span>
            {pro.hourlyRateCents && <span>{formatCents(pro.hourlyRateCents)}/hr</span>}
            <span>Services within {pro.serviceRadiusMiles} miles of {pro.serviceZip}</span>
            {pro.licenseNumber && <span>License #{pro.licenseNumber}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {pro.categories.map((c) => (
              <span
                key={c.categoryId}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
              >
                {c.category.icon} {c.category.name}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {pro.portfolioUrls.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-bold text-gray-900">Past work</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {pro.portfolioUrls.map((url) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="aspect-square h-full w-full object-cover transition hover:opacity-90"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {session?.user && (
        <div className="mb-6 flex justify-end">
          <ReportButton targetUserId={pro.userId} label="Report this pro" />
        </div>
      )}

      <h2 className="mb-4 text-lg font-bold text-gray-900">Reviews</h2>
      {pro.reviews.length === 0 ? (
        <p className="text-gray-500">No reviews yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {pro.reviews.map((r) => (
            <Card key={r.id}>
              <CardContent>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-gray-900">{r.customer.name}</span>
                  <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
                </div>
                <StarRating rating={r.rating} />
                {r.comment && <p className="mt-2 text-sm text-gray-600">{r.comment}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
