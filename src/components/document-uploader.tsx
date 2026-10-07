'use client';

import { upload } from '@vercel/blob/client';
import { useState } from 'react';

interface DocumentUploaderProps {
  onUploaded: (file: { url: string; filename: string }) => void;
}

export function DocumentUploader({ onUploaded }: DocumentUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const blob = await upload(`repair-docs/${file.name}`, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      });
      setFilename(file.name);
      onUploaded({ url: blob.url, filename: file.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload document.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-6 py-10 text-center hover:border-brand-500">
        <span className="text-3xl">📄</span>
        {uploading ? (
          <span className="text-sm text-gray-600">Uploading…</span>
        ) : filename ? (
          <span className="text-sm font-medium text-gray-900">{filename} ✓</span>
        ) : (
          <>
            <span className="text-sm font-medium text-gray-700">Click to upload a PDF</span>
            <span className="text-xs text-gray-400">Inspection report or repair addendum, up to 20MB</span>
          </>
        )}
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          disabled={uploading}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
