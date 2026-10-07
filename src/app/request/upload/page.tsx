'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DocumentUploader } from '@/components/document-uploader';

export default function UploadRepairDocumentPage() {
  const router = useRouter();
  const [file, setFile] = useState<{ url: string; filename: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!file) return;
    setAnalyzing(true);
    setError(null);

    const res = await fetch('/api/repair-documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileUrl: file.url, filename: file.filename }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === 'string' ? data.error : 'Could not analyze that document.');
      setAnalyzing(false);
      return;
    }

    const data = await res.json();
    router.push(`/request/upload/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Upload a repair list</h1>
      <p className="mb-6 text-gray-600">
        Have an inspection report or repair addendum with multiple items? Upload it and we'll pull out
        each repair, match it to the right type of pro, and let you review before sending anything out.
      </p>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <DocumentUploader onUploaded={setFile} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button size="lg" disabled={!file || analyzing} onClick={handleAnalyze}>
            {analyzing ? 'Analyzing document…' : 'Analyze document'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
