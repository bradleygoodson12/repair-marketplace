'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';

export function InviteProForm({
  requestId,
  pros,
}: {
  requestId: string;
  pros: { id: string; businessName: string }[];
}) {
  const router = useRouter();
  const [proProfileId, setProProfileId] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (pros.length === 0) return null;

  async function handleInvite() {
    if (!proProfileId) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/requests/${requestId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proProfileId }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === 'string' ? data.error : 'Could not send invite.');
      return;
    }
    setSent(true);
    setProProfileId('');
    router.refresh();
  }

  return (
    <div className="flex flex-shrink-0 items-center gap-2">
      <Select value={proProfileId} onChange={(e) => setProProfileId(e.target.value)} className="w-auto text-sm">
        <option value="">Invite a pro…</option>
        {pros.map((p) => (
          <option key={p.id} value={p.id}>
            {p.businessName}
          </option>
        ))}
      </Select>
      <Button size="sm" variant="outline" disabled={!proProfileId || loading} onClick={handleInvite}>
        {loading ? 'Sending…' : 'Invite'}
      </Button>
      {sent && <span className="text-xs text-green-700">Sent</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
