'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCents } from '@/lib/utils';

interface QuoteData {
  id: string;
  priceCents: number;
  message: string;
  estimatedDurationDays: number | null;
  status: string;
  proProfile: { id: string; businessName: string; avgRating: number };
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

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {quotes.map((q) => (
        <Card key={q.id}>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Link href={`/pros/${q.proProfile.id}`} className="font-semibold text-gray-900 hover:underline">
                {q.proProfile.businessName}
              </Link>
              <Badge status={q.status} />
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="text-lg font-bold text-gray-900">{formatCents(q.priceCents)}</span>
              {q.estimatedDurationDays && <span>~{q.estimatedDurationDays} day(s)</span>}
            </div>
            <p className="text-sm text-gray-600">{q.message}</p>
            {isCustomer && !requestBooked && q.status === 'PENDING' && (
              <Button
                size="sm"
                className="mt-2 w-fit"
                disabled={acceptingId === q.id}
                onClick={() => acceptQuote(q.id)}
              >
                {acceptingId === q.id ? 'Accepting…' : 'Accept quote'}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
