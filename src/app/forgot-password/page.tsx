'use client';

import Link from 'next/link';
import { useState } from 'react';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          {sent ? (
            <>
              <h1 className="mb-3 text-2xl font-bold text-gray-900">Check your email</h1>
              <p className="text-sm text-gray-600">
                If an account exists for <strong>{email}</strong>, we've sent a link to reset your password. It
                expires in 1 hour.
              </p>
              <p className="mt-4 text-sm text-gray-600">
                <Link href="/login" className="font-medium text-brand-600 hover:underline">
                  Back to log in
                </Link>
              </p>
            </>
          ) : (
            <>
              <h1 className="mb-2 text-2xl font-bold text-gray-900">Reset your password</h1>
              <p className="mb-6 text-sm text-gray-600">
                Enter the email on your account and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </Button>
              </form>
              <p className="mt-4 text-sm text-gray-600">
                <Link href="/login" className="font-medium text-brand-600 hover:underline">
                  Back to log in
                </Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
}
