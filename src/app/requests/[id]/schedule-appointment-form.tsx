'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Formats a Date for a datetime-local input's value, in the viewer's local
// time zone (datetime-local has no time zone of its own).
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ScheduleAppointmentForm({ bookingId, scheduledDate }: { bookingId: string; scheduledDate: Date }) {
  const router = useRouter();
  const [value, setValue] = useState(toLocalInputValue(scheduledDate));
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/bookings/${bookingId}/schedule`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledDate: new Date(value).toISOString() }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === 'string' ? data.error : 'Could not update the appointment date.');
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-sm text-brand-600 hover:underline">
        Set/change appointment date
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <Input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} required className="w-auto" />
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? 'Saving…' : 'Save'}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)} disabled={loading}>
        Cancel
      </Button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
