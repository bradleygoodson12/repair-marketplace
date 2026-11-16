'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { MultiFileUploader } from '@/components/multi-file-uploader';

export function BookingDocuments({
  bookingId,
  invoiceUrls: initialInvoiceUrls,
  warrantyUrls: initialWarrantyUrls,
}: {
  bookingId: string;
  invoiceUrls: string[];
  warrantyUrls: string[];
}) {
  const router = useRouter();
  const [invoiceUrls, setInvoiceUrls] = useState(initialInvoiceUrls);
  const [warrantyUrls, setWarrantyUrls] = useState(initialWarrantyUrls);
  const [error, setError] = useState<string | null>(null);

  async function save(next: { invoiceUrls?: string[]; warrantyUrls?: string[] }) {
    setError(null);
    const res = await fetch(`/api/bookings/${bookingId}/documents`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === 'string' ? data.error : 'Could not save documents.');
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">Invoices</label>
        <MultiFileUploader
          value={invoiceUrls}
          onChange={(urls) => {
            setInvoiceUrls(urls);
            save({ invoiceUrls: urls });
          }}
          max={20}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">Warranties</label>
        <MultiFileUploader
          value={warrantyUrls}
          onChange={(urls) => {
            setWarrantyUrls(urls);
            save({ warrantyUrls: urls });
          }}
          max={20}
        />
      </div>
    </div>
  );
}
