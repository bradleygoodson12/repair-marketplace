'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DocumentUploader } from '@/components/document-uploader';
import { MultiFileUploader } from '@/components/multi-file-uploader';

export default function UploadRepairDocumentPage() {
  const router = useRouter();
  const [file, setFile] = useState<{ url: string; filename: string } | null>(null);
  const [supportingDocumentUrls, setSupportingDocumentUrls] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!file) return;
    setAnalyzing(true);
    setError(null);

    try {
      const res = await fetch('/api/repair-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: file.url, filename: file.filename, supportingDocumentUrls }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === 'string' ? data.error : 'Could not start analyzing that document.');
        setAnalyzing(false);
        return;
      }

      const data = await res.json();
      router.push(`/request/upload/${data.id}`);
    } catch (e) {
      setError(
        e instanceof Error && e.name === 'TimeoutError'
          ? 'Could not reach the server in time. Try again.'
          : 'Could not reach the server. Check your connection and try again.',
      );
      setAnalyzing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Upload a repair list</h1>
      <p className="mb-6 text-gray-600">
        Have an inspection report or repair addendum with multiple items? Upload it and we&apos;ll pull out each
        repair and match it to the right type of pro. Attach the full report too, so pros can see the original
        source — no AI guesswork on photos.
      </p>
      <Card>
        <CardContent className="flex flex-col gap-6">
          <div>
            <h2 className="mb-2 font-semibold text-gray-900">1. Upload a repair list</h2>
            <p className="mb-3 text-sm text-gray-500">The document we&apos;ll analyze to pull out each repair item.</p>
            <DocumentUploader onUploaded={setFile} />
          </div>

          <div>
            <h2 className="mb-2 font-semibold text-gray-900">2. Anything else to attach? (optional)</h2>
            <p className="mb-3 text-sm text-gray-500">
              The document above is already shared with pros in full — only add files here if you have separate
              ones, like extra photos or a second report.
            </p>
            <MultiFileUploader value={supportingDocumentUrls} onChange={setSupportingDocumentUrls} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button size="lg" disabled={!file || analyzing} onClick={handleAnalyze}>
            {analyzing ? 'Starting…' : '3. Analyze list'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
