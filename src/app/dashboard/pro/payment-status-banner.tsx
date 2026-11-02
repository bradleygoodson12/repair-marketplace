'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const MESSAGES: Record<string, { tone: 'success' | 'neutral'; text: string }> = {
  paid: { tone: 'success', text: 'Payment received — your quote has been sent to the customer.' },
  payment_cancelled: { tone: 'neutral', text: 'Payment was cancelled — your quote is saved but not yet sent.' },
};
const SUBSCRIPTION_MESSAGES: Record<string, { tone: 'success' | 'neutral'; text: string }> = {
  success: { tone: 'success', text: "You're subscribed — quoting is now unlimited with no per-quote fee." },
  cancelled: { tone: 'neutral', text: 'Subscription checkout was cancelled.' },
};

export function PaymentStatusBanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [shown, setShown] = useState<{ tone: 'success' | 'neutral'; text: string } | null>(null);

  useEffect(() => {
    const quote = searchParams.get('quote');
    const subscription = searchParams.get('subscription');
    const message = (quote && MESSAGES[quote]) || (subscription && SUBSCRIPTION_MESSAGES[subscription]) || null;
    if (message) {
      setShown(message);
      router.replace('/dashboard/pro', { scroll: false });
    }
    // Only read the URL once on mount — router.replace above clears it immediately after.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!shown) return null;

  return (
    <div
      className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
        shown.tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-gray-200 bg-gray-50 text-gray-700'
      }`}
    >
      {shown.text}
    </div>
  );
}
