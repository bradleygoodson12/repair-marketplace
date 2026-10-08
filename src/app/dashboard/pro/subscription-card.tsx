'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  status: 'NONE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  currentPeriodEnd: string | null;
  subscriptionPriceDollars: number;
  leadFeeDollars: number;
}

export function SubscriptionCard({ status, currentPeriodEnd, subscriptionPriceDollars, leadFeeDollars }: Props) {
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

  const isActive = status === 'ACTIVE';

  return (
    <Card className="mb-8">
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-gray-900">
            {isActive ? 'Subscription active' : 'Pay-as-you-go'}
          </h2>
          <p className="text-sm text-gray-600">
            {isActive
              ? `Unlimited quotes, no per-lead fee${currentPeriodEnd ? ` · renews ${currentPeriodEnd}` : ''}.`
              : status === 'PAST_DUE'
                ? 'Your subscription payment failed — update billing to avoid losing access.'
                : `Each quote costs a $${leadFeeDollars} lead fee. Subscribe for $${subscriptionPriceDollars}/month for unlimited quotes.`}
          </p>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
        {isActive || status === 'PAST_DUE' ? (
          <Button variant="outline" onClick={openPortal} disabled={loading}>
            {loading ? 'Loading…' : 'Manage billing'}
          </Button>
        ) : (
          <Button onClick={startCheckout} disabled={loading}>
            {loading ? 'Redirecting…' : `Subscribe — $${subscriptionPriceDollars}/mo`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
