'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface OfferedEntry {
  id: string;
  categoryName: string;
  city: string;
  state: string;
  offerExpiresAt: string;
}

export function WaitlistOfferCard({ offers }: { offers: OfferedEntry[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(id: string, action: 'claim' | 'decline') {
    setLoadingId(id);
    setError(null);
    const res = await fetch(`/api/pro-profile/waitlist/${id}/${action}`, { method: 'POST' });
    setLoadingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === 'string' ? data.error : `Could not ${action}.`);
      return;
    }
    router.refresh();
  }

  if (offers.length === 0) return null;

  return (
    <div className="mb-4 flex flex-col gap-3">
      {offers.map((offer) => (
        <Card key={offer.id} className="border-brand-300 bg-brand-50">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="mb-1 font-bold text-gray-900">
                A {offer.categoryName} spot opened up in {offer.city}, {offer.state}!
              </h2>
              <p className="text-sm text-gray-600">
                Claim it by {new Date(offer.offerExpiresAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}{' '}
                or it goes to the next pro on the waitlist.
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <Button size="sm" disabled={loadingId === offer.id} onClick={() => handleAction(offer.id, 'claim')}>
                {loadingId === offer.id ? 'Claiming…' : 'Claim spot'}
              </Button>
              <button
                type="button"
                disabled={loadingId === offer.id}
                onClick={() => handleAction(offer.id, 'decline')}
                className="text-sm font-medium text-gray-500 hover:underline disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </CardContent>
        </Card>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
