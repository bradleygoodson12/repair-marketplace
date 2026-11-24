import { cn } from '@/lib/utils';

export function StarRating({ rating, count }: { rating: number; count?: number }) {
  // A brand-new pro's real 0.0 reads as broken, not "new" — so until there's
  // at least one review, show the plain count instead of a dead-looking
  // star rating.
  if (count === 0) {
    return (
      <div className="flex items-center gap-1 text-sm">
        <span className="text-gray-500">(0 reviews)</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-sm">
      <span className="text-amber-500">★</span>
      <span className="font-medium">{rating.toFixed(1)}</span>
      {typeof count === 'number' && <span className="text-gray-500">({count})</span>}
    </div>
  );
}

export function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn('text-2xl', n <= value ? 'text-amber-500' : 'text-gray-300')}
          aria-label={`${n} stars`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
