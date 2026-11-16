'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

// Mirrors pay-quote-fee-button.tsx for ChangeOrder instead of Quote.
export function PayChangeOrderFeeButton({
  changeOrderId,
  priceDollars,
  size = 'sm',
  className,
}: {
  changeOrderId: string;
  priceDollars: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/change-orders/${changeOrderId}/pay`, { method: 'POST' });
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
        {loading ? 'Redirecting…' : `Pay $${priceDollars} to send change order`}
      </Button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
