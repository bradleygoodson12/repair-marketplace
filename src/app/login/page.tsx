'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const ERROR_MESSAGES: Record<string, string> = {
  EMAIL_NOT_VERIFIED: 'Please verify your email before logging in — check your inbox for the link.',
  ACCOUNT_SUSPENDED: 'This account has been suspended. Contact support if you think this is a mistake.',
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResendSent(false);

    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);

    if (res?.error) {
      setError(ERROR_MESSAGES[res.error] ?? 'Invalid email or password.');
      return;
    }
    router.push('/');
    router.refresh();
  }

  async function handleResend() {
    await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setResendSent(true);
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">Log in</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <Link href="/forgot-password" className="text-xs font-medium text-brand-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">
                {error}
                {error === ERROR_MESSAGES.EMAIL_NOT_VERIFIED && !resendSent && (
                  <>
                    {' '}
                    <button type="button" onClick={handleResend} className="font-medium underline">
                      Resend verification email
                    </button>
                  </>
                )}
                {resendSent && <span className="block text-gray-600">Verification email sent — check your inbox.</span>}
              </p>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? 'Logging in…' : 'Log in'}
            </Button>
          </form>
          <p className="mt-4 text-sm text-gray-600">
            No account?{' '}
            <Link href="/signup" className="font-medium text-brand-600 hover:underline">
              Sign up
            </Link>
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Seeded demo logins: customer@example.com / jamie.pro@example.com — password123
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
