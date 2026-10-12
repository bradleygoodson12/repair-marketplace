'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Messages only updated when you sent one yourself, so the other side's
// reply needed a manual page reload to show up. Poll in the background
// instead — same pattern as ProcessingPoller, just a longer interval since
// this runs for as long as the page stays open, not just a one-time wait.
// Paused while the tab isn't visible so an idle tab doesn't keep refetching.
export function MessagePoller() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, 7000);
    return () => clearInterval(interval);
  }, [router]);

  return null;
}
