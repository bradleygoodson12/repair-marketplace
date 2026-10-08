'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Props {
  status: 'NONE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  currentPeriodEnd: string | null;
  subscriptionPriceDollars: number;
}

export function SubscriptionCard({ status, currentPeriodEnd, subscriptionPriceDollars }: Props) {
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
  const needsAttention = status === 'NONE' || status === 'CANCELED' || status === 'PAST_DUE';

  return (
    <Card className={cn('mb-8', needsAttention && 'border-brand-200 bg-brand-50')}>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-gray-900">{isActive ? 'Subscription active' : 'Subscription required'}</h2>
          <p className="text-sm text-gray-600">
            {isActive
              ? `You can see and quote job leads${currentPeriodEnd ? ` · renews ${currentPeriodEnd}` : ''}.`
              : status === 'PAST_DUE'
                ? 'Your subscription payment failed — update billing to keep quoting.'
                : `Subscribe for $${subscriptionPriceDollars}/month to see and quote job leads.`}
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
