'use client';

import { useState } from 'react';

export interface PortfolioPhoto {
  url: string;
  caption: string;
}

interface PortfolioPhotoUploaderProps {
  value: PortfolioPhoto[];
  onChange: (photos: PortfolioPhoto[]) => void;
  max?: number;
}

export function PortfolioPhotoUploader({ value, onChange, max: MAX_PHOTOS = 12 }: PortfolioPhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const remaining = MAX_PHOTOS - value.length;
    const toUpload = Array.from(files).slice(0, Math.max(remaining, 0));
    if (toUpload.length === 0) {
      setError(`You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }

    setUploading(true);
    try {
      const uploaded = await Promise.all(
        toUpload.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Could not upload photo.');
          return { url: data.url as string, caption: '' };
        }),
      );
      onChange([...value, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload photo.');
    } finally {
      setUploading(false);
    }
  }

  function updateCaption(url: string, caption: string) {
    onChange(value.map((p) => (p.url === url ? { ...p, caption } : p)));
  }

  function remove(url: string) {
    onChange(value.filter((p) => p.url !== url));
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {value.map((photo) => (
          <div key={photo.url} className="overflow-hidden rounded-lg border border-gray-200">
            <div className="group relative aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(photo.url)}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
            <input
              type="text"
              value={photo.caption}
              onChange={(e) => updateCaption(photo.url, e.target.value)}
              placeholder="Add a caption (optional)"
              maxLength={140}
              className="w-full border-0 border-t border-gray-200 px-2 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        ))}
        {value.length < MAX_PHOTOS && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 hover:border-brand-500 hover:text-brand-600">
            {uploading ? 'Uploading…' : '+ Add photo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              capture="environment"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-gray-400">
        {value.length}/{MAX_PHOTOS} photos added, 4MB each.
      </p>
    </div>
  );
}
