'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';

export function SubmitChangeOrderForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [description, setDescription] = useState('');
  const [priceDollars, setPriceDollars] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/bookings/${bookingId}/change-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description,
        additionalPriceCents: Math.round(parseFloat(priceDollars) * 100),
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setLoading(false);
      setError(typeof data.error === 'string' ? data.error : 'Could not submit change order.');
      return;
    }

    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }

    setLoading(false);
    setDescription('');
    setPriceDollars('');
    setExpanded(false);
    router.refresh();
  }

  if (!expanded) {
    return (
      <Button type="button" size="sm" variant="outline" onClick={() => setExpanded(true)}>
        Propose additional work
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-gray-100 p-3">
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What additional work is needed, and why?"
        rows={3}
        required
      />
      <Input
        type="number"
        step="0.01"
        min="0.01"
        value={priceDollars}
        onChange={(e) => setPriceDollars(e.target.value)}
        placeholder="Additional cost ($)"
        required
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? 'Submitting…' : 'Submit change order'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setExpanded(false)} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
