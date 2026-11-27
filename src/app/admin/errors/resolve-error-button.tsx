'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

export function ResolveErrorButton({ errorId }: { errorId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await fetch(`/api/admin/errors/${errorId}/resolve`, { method: 'POST' });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button size="sm" variant="outline" disabled={loading} onClick={handleClick}>
      {loading ? '…' : 'Mark resolved'}
    </Button>
  );
}
