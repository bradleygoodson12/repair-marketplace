'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';

export function QuoteForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [priceDollars, setPriceDollars] = useState('');
  const [message, setMessage] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/requests/${requestId}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceCents: Math.round(parseFloat(priceDollars) * 100),
        message,
        estimatedDurationDays: durationDays ? parseInt(durationDays, 10) : null,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === 'string' ? data.error : 'Could not submit quote.');
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Your price ($)</label>
        <Input
          type="number"
          min="1"
          step="0.01"
          required
          value={priceDollars}
          onChange={(e) => setPriceDollars(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Estimated duration (days)</label>
        <Input type="number" min="1" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Message to customer</label>
        <Textarea required rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? 'Sending…' : 'Send quote'}
      </Button>
    </form>
  );
}
