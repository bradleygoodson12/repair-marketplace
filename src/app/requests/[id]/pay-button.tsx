'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function PayButton({ bookingId }: { bookingId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/bookings/${bookingId}/checkout`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.url) {
      setError(typeof data.error === 'string' ? data.error : 'Could not start checkout.');
      setLoading(false);
      return;
    }

    window.location.href = data.url;
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <Button onClick={handleClick} disabled={loading}>
        {loading ? 'Redirecting…' : 'Pay now'}
      </Button>
    </div>
  );
}
