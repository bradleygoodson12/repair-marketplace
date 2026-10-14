'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

export function UnlockLeadButton({
  requestId,
  priceDollars,
  size = 'sm',
  className,
}: {
  requestId: string;
  priceDollars: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/requests/${requestId}/unlock`, { method: 'POST' });
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
        {loading ? 'Redirecting…' : `Unlock lead — $${priceDollars}`}
      </Button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
