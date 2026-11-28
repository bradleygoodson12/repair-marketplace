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
  const [priceMode, setPriceMode] = useState<'exact' | 'estimate' | 'range'>('exact');
  const [priceDollars, setPriceDollars] = useState('');
  const [priceMaxDollars, setPriceMaxDollars] = useState('');
  const [message, setMessage] = useState(defaultMessage ?? '');
  const [durationDays, setDurationDays] = useState(defaultDurationDays?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function applyTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setPriceDollars((template.priceCents / 100).toString());
    setPriceMode('exact');
    setPriceMaxDollars('');
    setDurationDays(template.durationDays?.toString() ?? '');
    setMessage(template.message ?? defaultMessage ?? '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const priceCents = Math.round(parseFloat(priceDollars) * 100);
    const priceMaxCents = priceMode === 'range' ? Math.round(parseFloat(priceMaxDollars) * 100) : null;
    if (priceMode === 'range' && (!priceMaxCents || priceMaxCents <= priceCents)) {
      setError('The high end of the range must be more than the low end.');
      return;
    }

    setLoading(true);

    const res = await fetch(`/api/requests/${requestId}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceCents,
        priceMaxCents,
        isEstimate: priceMode !== 'exact',
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
        <label className="mb-1 block text-sm font-medium text-gray-700">How are you pricing this?</label>
        <div className="flex flex-wrap gap-4 text-sm text-gray-700">
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={priceMode === 'exact'} onChange={() => setPriceMode('exact')} />
            Exact price
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={priceMode === 'estimate'} onChange={() => setPriceMode('estimate')} />
            Single estimate
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={priceMode === 'range'} onChange={() => setPriceMode('range')} />
            Price range
          </label>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Use a range when the job needs more information before you can commit to one number — once you&apos;re on
          site, bill any difference above the booked price as a change order.
        </p>
      </div>
      <div className={priceMode === 'range' ? 'grid grid-cols-2 gap-3' : undefined}>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {priceMode === 'range' ? 'Low end ($)' : 'Your price ($)'}
          </label>
          <Input
            type="number"
            min="1"
            step="0.01"
            required
            value={priceDollars}
            onChange={(e) => setPriceDollars(e.target.value)}
          />
        </div>
        {priceMode === 'range' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">High end ($)</label>
            <Input
              type="number"
              min="1"
              step="0.01"
              required
              value={priceMaxDollars}
              onChange={(e) => setPriceMaxDollars(e.target.value)}
            />
          </div>
        )}
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
