'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!expanded) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setExpanded(true)}>
        Cancel booking
      </Button>
    );
  }

  async function handleConfirm() {
    setLoading(true);
    await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason.trim() || null }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
      <p className="text-sm font-medium text-red-900">Cancel this booking?</p>
      <p className="text-xs text-red-700">This can't be undone — the other side will be notified by email.</p>
      <Textarea
        rows={2}
        placeholder="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="bg-white"
      />
      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={handleConfirm} disabled={loading}>
          {loading ? 'Cancelling…' : 'Confirm cancellation'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(false)} disabled={loading}>
          Never mind
        </Button>
      </div>
    </div>
  );
}
