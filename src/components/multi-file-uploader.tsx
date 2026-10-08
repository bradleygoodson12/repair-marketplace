'use client';

import { useState } from 'react';

import { AttachmentThumb } from '@/components/attachment-thumb';

interface MultiFileUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}

const ACCEPTED_TYPES = 'application/pdf,image/jpeg,image/png,image/webp,image/gif';

export function MultiFileUploader({ value, onChange, max = 10 }: MultiFileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const remaining = max - value.length;
    const toUpload = Array.from(files).slice(0, Math.max(remaining, 0));
    if (toUpload.length === 0) {
      setError(`You can attach up to ${max} files.`);
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
          if (!res.ok) throw new Error(data.error || `Could not upload ${file.name}.`);
          return data.url as string;
        }),
      );
      onChange([...value, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload file.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {value.map((url) => (
          <AttachmentThumb key={url} url={url} onRemove={() => onChange(value.filter((u) => u !== url))} />
        ))}
        {value.length < max && (
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 px-2 text-center text-xs text-gray-500 hover:border-brand-500 hover:text-brand-600">
            {uploading ? 'Uploading…' : '+ Add file'}
            <input
              type="file"
              accept={ACCEPTED_TYPES}
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-gray-400">PDFs or photos, up to {max} files, 4MB each.</p>
    </div>
  );
}
