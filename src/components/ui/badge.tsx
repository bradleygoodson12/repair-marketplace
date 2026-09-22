import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  QUOTED: 'bg-amber-100 text-amber-700',
  BOOKED: 'bg-purple-100 text-purple-700',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
  PENDING: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  DECLINED: 'bg-red-100 text-red-700',
  WITHDRAWN: 'bg-gray-100 text-gray-600',
  SCHEDULED: 'bg-purple-100 text-purple-700',
  UNPAID: 'bg-gray-100 text-gray-600',
  PAID: 'bg-green-100 text-green-700',
  REFUNDED: 'bg-blue-100 text-blue-700',
  FAILED: 'bg-red-100 text-red-700',
};

export function Badge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusColors[status] ?? 'bg-gray-100 text-gray-600',
        className,
      )}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
