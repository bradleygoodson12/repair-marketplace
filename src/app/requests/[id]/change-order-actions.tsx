'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

export function ChangeOrderActions({ changeOrderId }: { changeOrderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<'approve' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: 'approve' | 'decline') {
    if (action === 'decline' && !confirm('Decline this change order? The pro will be notified.')) return;
    setLoading(action);
    setError(null);
    const res = await fetch(`/api/change-orders/${changeOrderId}/${action}`, { method: 'POST' });
    setLoading(null);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === 'string' ? data.error : 'Could not update change order.');
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={loading !== null} onClick={() => act('approve')}>
          {loading === 'approve' ? 'Approving…' : 'Approve'}
        </Button>
        <Button size="sm" variant="outline" disabled={loading !== null} onClick={() => act('decline')}>
          {loading === 'decline' ? 'Declining…' : 'Decline'}
        </Button>
      </div>
    </div>
  );
}
