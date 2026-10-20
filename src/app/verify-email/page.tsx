'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function VerifyEmailBody() {
  const token = useSearchParams().get('token');
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>(token ? 'pending' : 'error');
  const [resendEmail, setResendEmail] = useState('');
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => setStatus(res.ok ? 'success' : 'error'))
      .catch(() => setStatus('error'));
  }, [token]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resendEmail }),
    });
    setResendSent(true);
  }

  if (status === 'pending') {
    return <p className="text-sm text-gray-600">Verifying your email…</p>;
  }

  if (status === 'success') {
    return (
      <>
        <h1 className="mb-3 text-2xl font-bold text-gray-900">Email verified</h1>
        <p className="text-sm text-gray-600">Your account is now active. You can log in.</p>
        <Link href="/login">
          <Button className="mt-4">Log in</Button>
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-3 text-2xl font-bold text-gray-900">Link invalid or expired</h1>
      <p className="mb-4 text-sm text-gray-600">
        This verification link is no longer valid. Enter your email and we'll send a new one.
      </p>
      {resendSent ? (
        <p className="text-sm text-gray-600">If that email needs verifying, a new link is on its way.</p>
      ) : (
        <form onSubmit={handleResend} className="flex flex-col gap-3">
          <Input
            type="email"
            required
            placeholder="you@example.com"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
          />
          <Button type="submit" className="w-fit">
            Resend verification email
          </Button>
        </form>
      )}
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthShell>
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <Suspense fallback={null}>
            <VerifyEmailBody />
          </Suspense>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
