'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

// Retry path for a pro whose quote is saved but not yet paid for — reopens
// Stripe Checkout for that specific quote's fee without resubmitting the
// quote form.
export function PayQuoteFeeButton({
  quoteId,
  priceDollars,
  size = 'sm',
  className,
}: {
  quoteId: string;
  priceDollars: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/quotes/${quoteId}/pay`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      setError(typeof data.error === 'string' ? data.error : 'Could not start checkout.');
      setLoading(false);
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div className={className}>
      <Button type="button" size={size} onClick={handleClick} disabled={loading}>
        {loading ? 'Redirecting…' : `Pay quote fee — $${priceDollars}`}
      </Button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
