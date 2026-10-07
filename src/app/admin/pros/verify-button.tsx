'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

export function VerifyButton({ proId, verified }: { proId: string; verified: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await fetch(`/api/admin/pros/${proId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verified: !verified }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button size="sm" variant={verified ? 'outline' : 'primary'} disabled={loading} onClick={handleClick}>
      {loading ? '…' : verified ? 'Unverify' : 'Verify'}
    </Button>
  );
}
