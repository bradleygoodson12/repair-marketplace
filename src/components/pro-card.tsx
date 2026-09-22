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
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900">{pro.businessName}</span>
            {pro.verified && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
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
