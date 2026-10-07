'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

export function CancelButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm('Cancel this listing? It will be removed from browse and lead feeds.')) return;
    setLoading(true);
    await fetch(`/api/admin/requests/${requestId}/cancel`, { method: 'POST' });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button size="sm" variant="outline" disabled={loading} onClick={handleClick}>
      {loading ? '…' : 'Cancel listing'}
    </Button>
  );
}
