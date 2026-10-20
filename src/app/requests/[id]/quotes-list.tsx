'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/star-rating';
import { formatCents } from '@/lib/utils';

interface QuoteData {
  id: string;
  priceCents: number;
  isEstimate: boolean;
  message: string;
  estimatedDurationDays: number | null;
  status: string;
  proProfile: {
    id: string;
    businessName: string;
    avgRating: number;
    reviewCount: number;
    yearsExperience: number;
    photoUrl: string | null;
  };
}

export function QuotesList({
  quotes,
  isCustomer,
  requestBooked,
}: {
  quotes: QuoteData[];
  isCustomer: boolean;
  requestBooked: boolean;
}) {
  const router = useRouter();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function acceptQuote(id: string) {
    setAcceptingId(id);
    setError(null);
    const res = await fetch(`/api/quotes/${id}/accept`, { method: 'POST' });
    setAcceptingId(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === 'string' ? data.error : 'Could not accept quote.');
      return;
    }
    router.refresh();
  }

  if (quotes.length === 0) {
    return <p className="text-gray-500">No quotes yet.</p>;
  }

  // Comparison badges only mean something once there's something to compare.
  const lowestPriceCents = quotes.length > 1 ? Math.min(...quotes.map((q) => q.priceCents)) : null;
  const ratedQuotes = quotes.filter((q) => q.proProfile.reviewCount > 0);
  const topRating = quotes.length > 1 && ratedQuotes.length > 0 ? Math.max(...ratedQuotes.map((q) => q.proProfile.avgRating)) : null;

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
          {quotes.map((q) => {
            const isLowestPrice = lowestPriceCents !== null && q.priceCents === lowestPriceCents;
            const isTopRated = topRating !== null && q.proProfile.reviewCount > 0 && q.proProfile.avgRating === topRating;

            return (
              <div
                key={q.id}
                className="flex w-72 flex-shrink-0 flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <Badge status={q.status} />
                  <div className="flex gap-1">
                    {isLowestPrice && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        Lowest price
                      </span>
                    )}
                    {isTopRated && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        Top rated
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {q.proProfile.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={q.proProfile.photoUrl} alt="" className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-950 text-sm font-bold text-brand-400">
                      {q.proProfile.businessName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <Link href={`/pros/${q.proProfile.id}`} className="block truncate font-semibold text-gray-900 hover:underline">
                      {q.proProfile.businessName}
                    </Link>
                    <StarRating rating={q.proProfile.avgRating} count={q.proProfile.reviewCount} />
                  </div>
                </div>

                <div className="flex items-baseline justify-between border-t border-gray-100 pt-3">
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-gray-900">{formatCents(q.priceCents)}</span>
                    {q.isEstimate && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        Estimate
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-gray-500">
                    {q.estimatedDurationDays ? `~${q.estimatedDurationDays} day(s)` : 'Duration not given'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{q.proProfile.yearsExperience} years experience</p>

                <p className="line-clamp-4 text-sm text-gray-600">{q.message}</p>

                {isCustomer && !requestBooked && q.status === 'PENDING' && (
                  <Button size="sm" className="mt-auto w-full" disabled={acceptingId === q.id} onClick={() => acceptQuote(q.id)}>
                    {acceptingId === q.id ? 'Accepting…' : 'Accept quote'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
