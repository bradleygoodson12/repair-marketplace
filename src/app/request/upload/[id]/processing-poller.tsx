'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Analysis runs in the background (see POST /api/repair-documents), so this
// page can land while the document is still PROCESSING. Poll by re-running
// the server component every couple seconds instead of making the agent
// manually refresh until it flips to READY/FAILED.
export function ProcessingPoller() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(interval);
  }, [router]);

  return null;
}
