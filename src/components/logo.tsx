import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-xl font-bold tracking-tight text-white', className)}>
      <Image src="/logo.png" alt="" width={size} height={size} className="flex-shrink-0 rounded-md" priority />
      Repair <span className="text-brand-400">Bee</span>
    </span>
  );
}
