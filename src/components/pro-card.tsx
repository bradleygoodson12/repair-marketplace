import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { StarRating } from '@/components/star-rating';
import { formatCents } from '@/lib/utils';

interface ProCardData {
  id: string;
  businessName: string;
  bio: string;
  avgRating: number;
  reviewCount: number;
  hourlyRateCents: number | null;
  yearsExperience: number;
  verified: boolean;
}

export function ProCard({ pro }: { pro: ProCardData }) {
  return (
    <Link href={`/pros/${pro.id}`}>
      <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900">{pro.businessName}</span>
            {pro.verified && (
              <span className="flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                Verified
              </span>
            )}
          </div>
          <StarRating rating={pro.avgRating} count={pro.reviewCount} />
          <p className="line-clamp-2 text-sm text-gray-600">{pro.bio}</p>
          <div className="mt-1 flex items-center justify-between text-sm text-gray-500">
            <span>{pro.yearsExperience} yrs experience</span>
            {pro.hourlyRateCents && <span>{formatCents(pro.hourlyRateCents)}/hr</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
