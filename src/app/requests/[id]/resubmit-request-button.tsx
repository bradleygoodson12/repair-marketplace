'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

export function ResubmitRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/requests/${requestId}/resubmit`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === 'string' ? data.error : 'Could not re-submit this request.');
      setLoading(false);
      return;
    }
    router.push(`/requests/${data.id}`);
  }

  return (
    <div className="flex max-w-xs flex-col gap-2">
      <Button onClick={handleClick} disabled={loading}>
        {loading ? 'Re-submitting…' : 'Re-submit this request'}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
