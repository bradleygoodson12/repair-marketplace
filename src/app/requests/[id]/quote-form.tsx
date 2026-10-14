'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';

interface QuickQuoteTemplate {
  id: string;
  label: string;
  priceCents: number;
  durationDays: number | null;
  message: string | null;
}

export function QuoteForm({
  requestId,
  defaultMessage,
  defaultDurationDays,
  templates = [],
}: {
  requestId: string;
  defaultMessage?: string | null;
  defaultDurationDays?: number | null;
  templates?: QuickQuoteTemplate[];
}) {
  const router = useRouter();
  const [priceDollars, setPriceDollars] = useState('');
  const [message, setMessage] = useState(defaultMessage ?? '');
  const [durationDays, setDurationDays] = useState(defaultDurationDays?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function applyTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setPriceDollars((template.priceCents / 100).toString());
    setDurationDays(template.durationDays?.toString() ?? '');
    setMessage(template.message ?? defaultMessage ?? '');
  }

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

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setLoading(false);
      setError(typeof data.error === 'string' ? data.error : 'Could not submit quote.');
      return;
    }

    if (data.checkoutUrl) {
      // Quote is saved but held back until the pro pays the quote fee —
      // send them straight to Stripe Checkout to finish.
      window.location.href = data.checkoutUrl;
      return;
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {templates.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Use a quick-quote template</label>
          <Select defaultValue="" onChange={(e) => e.target.value && applyTemplate(e.target.value)}>
            <option value="">Choose one to fill the form below…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} — ${(t.priceCents / 100).toFixed(2)}
              </option>
            ))}
          </Select>
        </div>
      )}
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
        {defaultMessage && (
          <p className="mt-1 text-xs text-gray-400">
            Pre-filled from your quote defaults — edit it for this job, or{' '}
            <Link href="/dashboard/pro" className="underline hover:text-gray-600">
              update your default
            </Link>
            .
          </p>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? 'Sending…' : 'Send quote'}
      </Button>
    </form>
  );
}
