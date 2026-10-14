'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Props {
  billingMode: 'PAY_PER_QUOTE' | 'SUBSCRIPTION';
  status: 'NONE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  currentPeriodEnd: string | null;
  subscriptionPriceDollars: number;
  quotePriceDollars: number;
}

export function SubscriptionCard({
  billingMode,
  status,
  currentPeriodEnd,
  subscriptionPriceDollars,
  quotePriceDollars,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/pro/subscription/checkout', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      setError(typeof data.error === 'string' ? data.error : 'Could not start checkout.');
      setLoading(false);
      return;
    }
    window.location.href = data.url;
  }

  async function openPortal() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/pro/subscription/portal', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      setError(typeof data.error === 'string' ? data.error : 'Could not open billing portal.');
      setLoading(false);
      return;
    }
    window.location.href = data.url;
  }

  async function switchToPayPerQuote() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/pro-profile/billing-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ billingMode: 'PAY_PER_QUOTE' }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'Could not switch billing mode.');
      return;
    }
    router.refresh();
  }

  const isActive = status === 'ACTIVE';
  const needsAttention = status === 'NONE' || status === 'CANCELED' || status === 'PAST_DUE';

  if (billingMode === 'PAY_PER_QUOTE') {
    return (
      <Card className="mb-8">
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-gray-900">Pay per quote</h2>
            <p className="text-sm text-gray-600">
              All leads in your area are free to view — pay ${quotePriceDollars} only when you send a quote. Switch
              to a monthly subscription any time for unlimited quoting with no per-quote fee.
            </p>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
          <Button onClick={startCheckout} disabled={loading}>
            {loading ? 'Redirecting…' : `Switch to subscription — $${subscriptionPriceDollars}/mo`}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('mb-8', needsAttention && 'border-brand-200 bg-brand-50')}>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-gray-900">{isActive ? 'Subscription active' : 'Subscription required'}</h2>
          <p className="text-sm text-gray-600">
            {isActive
              ? `You can quote every job lead with no per-quote fee${currentPeriodEnd ? ` · renews ${currentPeriodEnd}` : ''}.`
              : status === 'PAST_DUE'
                ? 'Your subscription payment failed — update billing to keep quoting for free.'
                : `Subscribe for $${subscriptionPriceDollars}/month for unlimited quotes, or pay $${quotePriceDollars} per quote instead.`}
          </p>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          {isActive && (
            <p className="mt-1 text-xs text-gray-400">
              Prefer to pay per quote instead? Cancel your subscription from billing first.
            </p>
          )}
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-2">
          {isActive || status === 'PAST_DUE' ? (
            <Button variant="outline" onClick={openPortal} disabled={loading}>
              {loading ? 'Loading…' : 'Manage billing'}
            </Button>
          ) : (
            <>
              <Button onClick={startCheckout} disabled={loading}>
                {loading ? 'Redirecting…' : `Subscribe — $${subscriptionPriceDollars}/mo`}
              </Button>
              <button
                type="button"
                onClick={switchToPayPerQuote}
                disabled={loading}
                className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
              >
                Or switch to pay-per-quote
              </button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
