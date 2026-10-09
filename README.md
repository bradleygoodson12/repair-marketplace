# Repair Bee — Home Repair Marketplace

A Thumbtack-style, two-sided marketplace for home repair services: homeowners post jobs and vetted
pros send quotes. This is a **lead-generation marketplace, not an escrow marketplace**: customers pay
pros directly, outside the app, for the work itself. The only money that flows through the app is pros
paying Repair Bee a monthly subscription for access.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Prisma** ORM on **PostgreSQL**
- **NextAuth** (credentials-based auth, JWT sessions)
- **Tailwind CSS** for styling
- **Stripe Checkout** + **Billing Portal** for the pro subscription
- **Vercel Blob** for job-photo and repair-document uploads
- **`zipcodes`** (bundled US zip centroid data, no external API) for zip-radius pro matching
- **Claude API** (`claude-sonnet-5`) for parsing uploaded repair-list PDFs into line items

## Core flow

1. Customer posts a `ServiceRequest` tied to a `Property` (address) and a `Category`.
2. Matching `ProProfile`s see the request as a lead. A subscribed pro can submit a `Quote`; an
   unsubscribed pro sees a "subscribe to quote" prompt instead — see "Pro monetization" below.
3. Customer accepts a quote → creates a `Booking` (tracks scheduling/status only, no payment).
4. Customer pays the pro directly, however they agree to — cash, check, Venmo, the pro's own invoice.
   Repair Bee never touches that money and has no record of it.
5. Customer marks the job completed → can leave a `Review`, which rolls up into the pro's
   `avgRating`/`reviewCount`.

`Message`s are threaded per `ServiceRequest` between the customer and any pro who has quoted.

## Pro monetization

Pros are never paid out through the app (no Stripe Connect, no payout compliance). Every pro must have
an active subscription (`SUBSCRIPTION_PRICE_CENTS` in `src/lib/pricing.ts`, default $20/mo) to see leads
or submit quotes at all — there's no pay-per-lead fallback, since pros are expected to be subscribed and
admin-vetted (`ProProfile.verified`) before operating on the platform.

- Managed from the pro dashboard (`SubscriptionCard`) via `POST /api/pro/subscription/checkout` (Stripe
  Checkout, `mode: subscription`) and `POST /api/pro/subscription/portal` (Stripe Billing Portal, for
  cancel/update-card).
- `ProProfile.subscriptionStatus`/`subscriptionCurrentPeriodEnd` are kept in sync by the
  `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`
  webhook handlers in `src/app/api/webhooks/stripe/route.ts`.
- `POST /api/requests/[id]/quotes` (and the dashboard/request-page UI) checks
  `proProfile.subscriptionStatus === 'ACTIVE'` before allowing a quote.
- The price is created as an ad hoc Stripe `price_data` at checkout time rather than a pre-created
  Stripe Price object — simplest for now, but means a Stripe dashboard price change has no effect;
  update `src/lib/pricing.ts` instead.

## Admin panel

Accounts with `role: ADMIN` get an `/admin` link in place of the regular dashboard link, covering:
- **Overview** — platform-wide counts, active subscriptions, and estimated monthly subscription revenue.
- **Users** — every account, with a suspend/unsuspend toggle (suspended accounts can't log in).
- **Pros** — every pro profile, with a verified/unverified toggle.
- **Listings** — every job request, with a one-click cancel for bad listings.

There's no self-serve way to become an admin — promote a user by hand (`UPDATE "User" SET role =
'ADMIN' WHERE email = '...'`) or seed one, as `prisma/seed.ts` does for `admin@example.com`.

## Designed for future real-estate API integration

The `Property` model intentionally carries `externalProvider`, `externalId`, and a free-form
`enrichmentData` JSON field. These are unused today, but let a future integration (e.g. Zillow,
Estated, ATTOM) attach parcel data, valuation, year built, etc. to a property without a schema
migration — just populate those columns from the provider's response.

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, NEXTAUTH_SECRET, Stripe keys
npm run db:migrate       # apply migrations to your database (prisma migrate dev)
npm run db:seed          # seed categories + demo customer/pro accounts
npm run dev
```

Seeded demo logins (password: `password123`):
- `admin@example.com` — see the admin panel at `/admin`
- `customer@example.com`
- `jamie.pro@example.com` / `morgan.pro@example.com` / `riley.pro@example.com`

### Stripe webhook (local dev)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the printed webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

### Photo uploads (Vercel Blob)

Job-request photos upload through `/api/upload`, which receives the file as `multipart/form-data`
and calls `put()` from `@vercel/blob` server-side (see `src/app/api/upload/route.ts`), passing
`token: process.env.BLOB_READ_WRITE_TOKEN` explicitly. Files are capped at 4MB to stay under
Vercel's serverless function request-body limit.

This deliberately avoids `@vercel/blob/client`'s browser-direct-upload flow (where the browser
PUTs straight to Vercel's blob endpoint using a short-lived signed token). That flow depends on
whichever auth method the SDK resolves at the time — OIDC (via `BLOB_STORE_ID` +
`VERCEL_OIDC_TOKEN`) takes priority over a static `BLOB_READ_WRITE_TOKEN` whenever both are
present, and a mismatch there surfaces in the browser as a CORS error on a PUT to
`vercel.com/api/blob`, which is really a masked 400 (invalid/wrong-scoped token) — very hard to
root-cause from the client side. Uploading through our own server sidesteps that ambiguity
entirely: it uses exactly the token we pass, and any failure comes back as a normal JSON error.

Create a Blob store under your project's **Storage** tab, connect it, then add its read-write
token yourself as `BLOB_READ_WRITE_TOKEN` under **Settings → Environment Variables** (all three
environments) — don't rely on whatever the store's own "Connect" flow injects automatically, since
that may only set `BLOB_STORE_ID`. Redeploy after adding it. For local dev, add the same token to
your `.env` as `BLOB_READ_WRITE_TOKEN`.

### Repair-document upload (Claude API)

At `/request/upload`, a customer (e.g. a real estate agent acting on a buyer/seller's behalf) can
upload a single-property inspection report or repair addendum as a PDF instead of filling out the
one-job form. Pros see the original source documents directly rather than an AI-cropped photo per
item — an earlier version tried to auto-render and match a page image per line item, which proved
unreliable, so it was replaced with letting the customer attach the real documents in full. The
flow:

1. `DocumentUploader` uploads the PDF to analyze through `/api/upload` (same server-side mechanism
   as photos; PDFs land under a `repair-docs/` prefix and photos under `photos/`). Optionally,
   `MultiFileUploader` uploads any number of additional supporting documents/photos (the full
   inspection report, addendum, etc.) the same way.
2. `POST /api/repair-documents` creates a `RepairDocument` row (storing both `fileUrl` and
   `supportingDocumentUrls`) and calls `extractRepairItemsFromPdf` (`src/lib/anthropic.ts`), which
   sends the PDF's public URL straight to Claude via a `document` content block (no server-side
   text extraction needed) and forces structured output via tool-use: one `RepairLineItem` per
   distinct repair, each tagged with the best-matching category slug from the live category list,
   plus the property address if the document states one.
3. `/request/upload/[id]` shows an editable review screen — property address (prefilled if
   extracted), each line item with title/description/category and an include/exclude checkbox, and
   a final "upload report & pictures" section where the customer can add more supporting
   documents/photos before sending.
4. `POST /api/repair-documents/[id]/submit` creates one `Property` and one `ServiceRequest` per
   selected item, every one carrying the *same* full attachment set (`fileUrl` +
   `supportingDocumentUrls`) into `photoUrls`, so each repair flows through the exact same
   quoting/messaging pipeline as a manually-posted job, with the real source documents attached.
   `src/components/attachment-thumb.tsx` renders each URL as an image thumbnail or a PDF chip
   (`src/lib/attachments.ts#isPdfUrl`) wherever `photoUrls` is displayed.

Requires `ANTHROPIC_API_KEY` (from console.anthropic.com — usage-based billing, no fixed fee).
Without it, document uploads will fail at the analysis step; everything else in the app is
unaffected.

## Deploying (e.g. to Vercel)

The `vercel-build` script (`prisma generate && prisma migrate deploy && tsx prisma/seed.ts && next build`)
runs automatically on platforms like Vercel that look for it, so a deploy also applies any pending
migrations and reseeds categories/demo accounts with no extra manual step. You only need to set the
environment variables from `.env.example` in the platform's dashboard. Reseeding is safe to run on
every deploy — `prisma/seed.ts` is all `upsert`s, so it never duplicates or overwrites real data.

### Schema changes

This project uses real Prisma migrations (`prisma/migrations/`), not `db push`. To change the
schema:

1. Edit `prisma/schema.prisma`.
2. Run `npm run db:migrate` (`prisma migrate dev`) locally — it generates a new timestamped SQL
   file under `prisma/migrations/` and applies it to your local database.
3. Commit the new migration folder along with the schema change.
4. On deploy, `vercel-build` runs `prisma migrate deploy`, which applies any migrations the target
   database doesn't have yet — in order, without prompting, and without the "reset if there's
   drift" behavior `migrate dev` has. That's what makes it safe for a build step.

**One-time step if you're migrating an existing database that was only ever managed with
`db push`** (true the first time this project's production database picks up this change): its
schema already matches `prisma/schema.prisma`, but it has no `_prisma_migrations` history table, so
`migrate deploy` will try to run the baseline migration's `CREATE TABLE` statements against tables
that already exist and fail. Mark the baseline as already applied once, before that deploy:

```bash
DATABASE_URL="<production-connection-string>" npx prisma migrate resolve --applied <baseline-migration-folder-name>
```

(`<baseline-migration-folder-name>` is the single folder currently under `prisma/migrations/`, e.g.
`20261009000515_init`.) Run it from a machine that can reach the production database — Vercel's
Postgres/Neon connection string, from **Settings → Environment Variables**. After that one-time
command, every future deploy's `migrate deploy` just works.

## Project structure

```
prisma/schema.prisma       Data model
prisma/seed.ts             Seed script (categories + demo accounts)
src/app/                   Routes (App Router) — pages + API route handlers
src/components/            Shared UI + feature components
src/lib/                   Prisma client, NextAuth config, Stripe client, utils
```
