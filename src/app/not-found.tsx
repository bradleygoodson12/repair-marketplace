import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <span className="text-5xl">🐝</span>
          <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
          <p className="max-w-sm text-gray-600">
            That page doesn&apos;t exist or may have moved. Let&apos;s get you back on track.
          </p>
          <Link href="/" className="mt-2">
            <Button>Back to home</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
