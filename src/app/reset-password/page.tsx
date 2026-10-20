'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

function ResetPasswordForm() {
  const token = useSearchParams().get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === 'string' ? data.error : 'Could not reset your password.');
      return;
    }

    setDone(true);
  }

  if (!token) {
    return (
      <>
        <h1 className="mb-3 text-2xl font-bold text-gray-900">Invalid link</h1>
        <p className="text-sm text-gray-600">
          This password reset link is missing its token.{' '}
          <Link href="/forgot-password" className="font-medium text-brand-600 hover:underline">
            Request a new one
          </Link>
          .
        </p>
      </>
    );
  }

  if (done) {
    return (
      <>
        <h1 className="mb-3 text-2xl font-bold text-gray-900">Password updated</h1>
        <p className="text-sm text-gray-600">Your password has been reset.</p>
        <Link href="/login">
          <Button className="mt-4">Log in</Button>
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Choose a new password</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">New password</label>
          <Input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Confirm new password</label>
          <Input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        {error && (
          <p className="text-sm text-red-600">
            {error}{' '}
            {error.includes('expired') && (
              <Link href="/forgot-password" className="font-medium underline">
                Request a new link
              </Link>
            )}
          </p>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Reset password'}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
