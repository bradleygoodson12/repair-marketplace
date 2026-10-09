'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <span className="text-5xl">🐝</span>
          <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
          <p className="max-w-sm text-gray-600">
            That's on us, not you. Try again, or head back to the homepage.
          </p>
          <Button onClick={() => reset()} className="mt-2">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
