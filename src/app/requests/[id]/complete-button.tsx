'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function CompleteButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await fetch(`/api/bookings/${bookingId}/complete`, { method: 'POST' });
    setLoading(false);
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={loading}>
      {loading ? 'Marking complete…' : 'Mark job as completed'}
    </Button>
  );
}
