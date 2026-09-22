'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ZipSearchForm() {
  const router = useRouter();
  const [zip, setZip] = useState('');

  return (
    <form
      className="flex w-full max-w-xl gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(zip ? `/categories?zip=${encodeURIComponent(zip)}` : '/categories');
      }}
    >
      <Input
        placeholder="Enter your zip code"
        value={zip}
        onChange={(e) => setZip(e.target.value)}
        className="bg-white"
      />
      <Button type="submit" size="lg">
        Find pros
      </Button>
    </form>
  );
}
