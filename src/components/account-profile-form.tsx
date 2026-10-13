'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PhotoUploader } from '@/components/photo-uploader';

export function AccountProfileForm({
  email,
  initialImage,
  initialPhone,
}: {
  email: string;
  initialImage: string | null;
  initialPhone: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>(initialImage ? [initialImage] : []);
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!editing) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
        Edit your profile
      </Button>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/account/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: photoUrls[0] ?? null, phone: phone.trim() || null }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === 'string' ? data.error : 'Could not save your profile.');
      return;
    }

    router.refresh();
    setEditing(false);
  }

  return (
    <Card className="mb-8">
      <CardContent>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Your profile</h2>
          <button type="button" onClick={() => setEditing(false)} className="text-sm text-gray-400 hover:text-gray-600">
            Close
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Profile photo (optional)</label>
            <PhotoUploader value={photoUrls} onChange={setPhotoUrls} max={1} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <Input value={email} disabled className="bg-gray-50 text-gray-500" />
            <p className="mt-1 text-xs text-gray-400">Contact support to change the email on your account.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Phone (optional)</label>
            <Input type="tel" placeholder="(555) 123-4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading} className="w-fit">
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
