'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

export function ReportActions({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<'RESOLVED' | 'DISMISSED' | null>(null);

  async function handleAction(status: 'RESOLVED' | 'DISMISSED') {
    setLoading(status);
    await fetch(`/api/admin/reports/${reportId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={!!loading} onClick={() => handleAction('RESOLVED')}>
        {loading === 'RESOLVED' ? '…' : 'Resolve'}
      </Button>
      <Button size="sm" variant="outline" disabled={!!loading} onClick={() => handleAction('DISMISSED')}>
        {loading === 'DISMISSED' ? '…' : 'Dismiss'}
      </Button>
    </div>
  );
}
