'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeleteUserButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    const confirmed = window.confirm(
      `Permanently delete ${name}? This removes their account and everything tied to it — requests, quotes, reviews, bookings. This can't be undone.`,
    );
    if (!confirmed) return;

    setLoading(true);
    const res = await fetch(`/api/admin/users/${userId}/delete`, { method: 'POST' });
    setLoading(false);
    if (res.ok) router.refresh();
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleClick}
      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
    >
      {loading ? 'Deleting…' : 'Delete'}
    </button>
  );
}
