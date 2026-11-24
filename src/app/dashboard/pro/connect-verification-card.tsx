'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  detailsSubmitted: boolean;
  hasStartedOnboarding: boolean;
}

export function ConnectVerificationCard({ detailsSubmitted, hasStartedOnboarding }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startOnboarding() {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/pro-profile/connect/onboard', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      setError(typeof data.error === 'string' ? data.error : 'Could not start verification.');
      setLoading(false);
      return;
    }
    window.location.href = data.url;
  }

  if (detailsSubmitted) {
    return (
      <Card className="mb-8 border-green-200 bg-green-50">
        <CardContent className="flex items-center gap-3">
          <span className="text-lg">✓</span>
          <div>
            <h2 className="font-bold text-gray-900">Business verified with Stripe</h2>
            <p className="text-sm text-gray-600">
              Your business and banking details passed Stripe&apos;s identity check — shown as a badge on your
              public profile.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Verify your business with Stripe</h2>
          <p className="text-sm text-gray-600">
            Stripe checks your business details and bank account — a real identity check, not just an admin
            glance at your profile. This never gives Repair Bee access to move money in or out of your account;
            it only backs up your &quot;Verified&quot; badge with something stronger.
            {hasStartedOnboarding && ' You started this before — pick back up where you left off.'}
          </p>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
        <Button onClick={startOnboarding} disabled={loading} className="flex-shrink-0">
          {loading ? 'Redirecting…' : hasStartedOnboarding ? 'Continue verification' : 'Start verification'}
        </Button>
      </CardContent>
    </Card>
  );
}
