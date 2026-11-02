'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface RequestItem {
  id: string;
  title: string;
  status: string;
  postedAsAgent: boolean;
  clientName: string | null;
  quoteCount: number;
  category: { icon: string; name: string };
}

export function PropertyGroup({
  address,
  requests,
}: {
  address: string;
  requests: RequestItem[];
}) {
  const [expanded, setExpanded] = useState(false);

  const statusCounts = requests.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  const rollup = Object.entries(statusCounts)
    .map(([status, count]) => `${count} ${status.toLowerCase().replace('_', ' ')}`)
    .join(' · ');

  return (
    <Card>
      <CardContent>
        <button type="button" onClick={() => setExpanded((e) => !e)} className="flex w-full items-center justify-between text-left">
          <div>
            <p className="font-semibold text-gray-900">{address}</p>
            <p className="text-sm text-gray-500">
              {requests.length} request{requests.length === 1 ? '' : 's'} · {rollup}
            </p>
          </div>
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {expanded && (
          <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3">
            {requests.map((r) => (
              <Link key={r.id} href={`/requests/${r.id}`} className="block">
                <div className="rounded-lg border border-gray-100 px-3 py-2 transition-colors hover:border-brand-200 hover:bg-gray-50">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {r.category.icon} {r.category.name}
                    </span>
                    <Badge status={r.status} />
                    {r.postedAsAgent && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                        For {r.clientName || 'a client'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{r.title}</p>
                    <span className="text-xs text-gray-500">{r.quoteCount} quote(s)</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
