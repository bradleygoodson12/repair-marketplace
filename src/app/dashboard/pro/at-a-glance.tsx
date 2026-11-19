import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { formatCents, formatDate } from '@/lib/utils';

interface NewLead {
  id: string;
  title: string;
  categoryName: string;
  distance: number | null;
}

interface OpenQuote {
  id: string;
  requestId: string;
  requestTitle: string;
  priceCents: number;
  isEstimate: boolean;
  createdAt: Date;
}

interface MessagePreview {
  id: string;
  title: string;
  url: string | null;
  read: boolean;
  createdAt: Date;
}

// The three things a pro actually comes back to check, surfaced right at
// the top of their dashboard — so a new lead, a bid still awaiting a
// decision, or a customer message never has to be hunted for further down
// the page.
export function AtAGlance({
  newLeads,
  newLeadsCount,
  openQuotes,
  openQuotesCount,
  messages,
  unreadMessageCount,
}: {
  newLeads: NewLead[];
  newLeadsCount: number;
  openQuotes: OpenQuote[];
  openQuotesCount: number;
  messages: MessagePreview[];
  unreadMessageCount: number;
}) {
  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-3">
      <Card className="border-2 border-brand-300 bg-brand-50/40">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Jobs to bid on</h2>
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-brand-500 px-2 text-sm font-bold text-gray-950">
              {newLeadsCount}
            </span>
          </div>
          {newLeadsCount === 0 ? (
            <p className="text-sm text-gray-500">No new leads right now — check back soon.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {newLeads.map((lead) => (
                <li key={lead.id}>
                  <Link href={`/requests/${lead.id}`} className="block text-sm hover:underline">
                    <span className="font-medium text-gray-900">{lead.title}</span>
                    <span className="text-gray-500">
                      {' '}
                      · {lead.categoryName}
                      {lead.distance !== null && ` · ${lead.distance.toFixed(1)} mi`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {newLeadsCount > newLeads.length && (
            <a href="#job-leads" className="text-xs font-medium text-brand-700 hover:underline">
              +{newLeadsCount - newLeads.length} more below
            </a>
          )}
        </CardContent>
      </Card>

      <Card className="border-2 border-gray-200">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Your open bids</h2>
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-gray-900 px-2 text-sm font-bold text-white">
              {openQuotesCount}
            </span>
          </div>
          {openQuotesCount === 0 ? (
            <p className="text-sm text-gray-500">No bids awaiting a decision right now.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {openQuotes.map((q) => (
                <li key={q.id}>
                  <Link href={`/requests/${q.requestId}`} className="block text-sm hover:underline">
                    <span className="font-medium text-gray-900">{q.requestTitle}</span>
                    <span className="text-gray-500">
                      {' '}
                      · {q.isEstimate ? 'Est. ' : ''}
                      {formatCents(q.priceCents)} · {formatDate(q.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {openQuotesCount > openQuotes.length && (
            <a href="#open-bids" className="text-xs font-medium text-brand-700 hover:underline">
              +{openQuotesCount - openQuotes.length} more below
            </a>
          )}
        </CardContent>
      </Card>

      <Card className="border-2 border-gray-200">
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Messages</h2>
            {unreadMessageCount > 0 && (
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-red-500 px-2 text-sm font-bold text-white">
                {unreadMessageCount}
              </span>
            )}
          </div>
          {messages.length === 0 ? (
            <p className="text-sm text-gray-500">No messages yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {messages.map((m) => (
                <li key={m.id}>
                  <Link href={m.url ?? '/notifications'} className="block text-sm hover:underline">
                    <span className={m.read ? 'text-gray-700' : 'font-semibold text-gray-900'}>{m.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/notifications" className="text-xs font-medium text-brand-700 hover:underline">
            View all messages
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
