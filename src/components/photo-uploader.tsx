'use client';

import { upload } from '@vercel/blob/client';
import { useState } from 'react';

interface PhotoUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
}

const MAX_PHOTOS = 5;

export function PhotoUploader({ value, onChange }: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const remaining = MAX_PHOTOS - value.length;
    const toUpload = Array.from(files).slice(0, Math.max(remaining, 0));
    if (toUpload.length === 0) {
      setError(`You can attach up to ${MAX_PHOTOS} photos.`);
      return;
    }

    setUploading(true);
    try {
      const uploaded = await Promise.all(
        toUpload.map((file) =>
          upload(file.name, file, {
            access: 'public',
            handleUploadUrl: '/api/upload',
          }),
        ),
      );
      onChange([...value, ...uploaded.map((blob) => blob.url)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload photo.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {value.map((url) => (
          <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Job photo" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((u) => u !== url))}
              className="absolute right-0.5 top-0.5 rounded-full bg-black/60 px-1.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Remove photo"
            >
              ×
            </button>
          </div>
        ))}
        {value.length < MAX_PHOTOS && (
          <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-brand-500 hover:text-brand-600">
            {uploading ? 'Uploading…' : '+ Add photo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-gray-400">Up to {MAX_PHOTOS} photos, 8MB each.</p>
    </div>
  );
}
