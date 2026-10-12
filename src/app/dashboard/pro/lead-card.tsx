'use client';

import Link from 'next/link';
import { useState } from 'react';

import { QuoteForm } from '@/app/requests/[id]/quote-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCents } from '@/lib/utils';

interface LeadCardProps {
  request: {
    id: string;
    title: string;
    status: string;
    budgetMinCents: number | null;
    budgetMaxCents: number | null;
    category: { icon: string; name: string };
    property: { city: string; state: string; zip: string };
  };
  distance: number | null;
  alreadyQuoted: boolean;
  defaultMessage: string | null;
  defaultDurationDays: number | null;
}

// Quoting used to require leaving the dashboard for each lead's full page.
// This lets a pro quote straight from the list — same QuoteForm, no new
// endpoint — while the title/location still link out to the full request
// (photos, full description, messaging) for anyone who wants more context
// before committing to a price.
export function LeadCard({ request, distance, alreadyQuoted, defaultMessage, defaultDurationDays }: LeadCardProps) {
  const [quoting, setQuoting] = useState(false);

  return (
    <Card className="transition-all hover:border-brand-300 hover:shadow-md">
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link href={`/requests/${request.id}`} className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {request.category.icon} {request.category.name}
              </span>
              <Badge status={request.status} />
              {alreadyQuoted && <span className="text-xs font-medium text-brand-600">You quoted</span>}
            </div>
            <p className="font-semibold text-gray-900 hover:underline">{request.title}</p>
            <p className="text-sm text-gray-500">
              {request.property.city}, {request.property.state} {request.property.zip}
              {distance !== null && ` · ${distance.toFixed(1)} mi away`}
            </p>
          </Link>
          <div className="flex flex-shrink-0 items-center gap-3">
            {(request.budgetMinCents || request.budgetMaxCents) && (
              <span className="text-sm text-gray-600">
                {request.budgetMinCents ? formatCents(request.budgetMinCents) : '—'}–
                {request.budgetMaxCents ? formatCents(request.budgetMaxCents) : '—'}
              </span>
            )}
            {!alreadyQuoted && (
              <Button type="button" size="sm" variant="outline" onClick={() => setQuoting((q) => !q)}>
                {quoting ? 'Cancel' : 'Quick quote'}
              </Button>
            )}
          </div>
        </div>
        {quoting && (
          <div className="border-t border-gray-100 pt-3">
            <QuoteForm requestId={request.id} defaultMessage={defaultMessage} defaultDurationDays={defaultDurationDays} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
