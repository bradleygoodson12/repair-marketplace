'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';

export function QuoteDefaultsForm({
  initialMessage,
  initialDurationDays,
}: {
  initialMessage: string | null;
  initialDurationDays: number | null;
}) {
  const [message, setMessage] = useState(initialMessage ?? '');
  const [durationDays, setDurationDays] = useState(initialDurationDays?.toString() ?? '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const res = await fetch('/api/pro-profile/quote-defaults', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        defaultQuoteMessage: message.trim() || null,
        defaultDurationDays: durationDays ? parseInt(durationDays, 10) : null,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === 'string' ? data.error : 'Could not save your defaults.');
      return;
    }

    setSaved(true);
  }

  return (
    <Card className="mb-8">
      <CardContent>
        <h2 className="mb-1 font-semibold text-gray-900">Quote defaults</h2>
        <p className="mb-3 text-sm text-gray-500">
          Pre-fills every new quote so you're not retyping the same message — nothing sends until you review and
          submit it. Price is never defaulted; you'll always enter that fresh per job.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Default message to customers</label>
            <Textarea
              rows={3}
              placeholder="e.g. Thanks for reaching out — I can usually get to jobs like this within a few days. Happy to answer any questions before you decide."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="w-48">
            <label className="mb-1 block text-sm font-medium text-gray-700">Typical duration (days)</label>
            <Input
              type="number"
              min="1"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-green-700">Saved.</p>}
          <Button type="submit" variant="secondary" size="sm" className="w-fit" disabled={loading}>
            {loading ? 'Saving…' : 'Save defaults'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
