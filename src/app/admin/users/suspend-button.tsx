'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

export function SuspendButton({ userId, suspended }: { userId: string; suspended: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await fetch(`/api/admin/users/${userId}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspended: !suspended }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button size="sm" variant={suspended ? 'outline' : 'secondary'} disabled={loading} onClick={handleClick}>
      {loading ? '…' : suspended ? 'Unsuspend' : 'Suspend'}
    </Button>
  );
}
