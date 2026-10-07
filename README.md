# FixItPro — Home Repair Marketplace

A Thumbtack-style, two-sided marketplace for home repair services: homeowners post jobs, vetted pros
send quotes, and bookings are paid for securely on-platform.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Prisma** ORM on **PostgreSQL**
- **NextAuth** (credentials-based auth, JWT sessions)
- **Tailwind CSS** for styling
- **Stripe Checkout** for payments
- **Vercel Blob** for job-photo uploads
- **`zipcodes`** (bundled US zip centroid data, no external API) for zip-radius pro matching

## Core flow

1. Customer posts a `ServiceRequest` tied to a `Property` (address) and a `Category`.
2. Matching `ProProfile`s see the request as a lead and submit a `Quote`.
3. Customer accepts a quote → creates a `Booking`.
4. Customer pays via Stripe Checkout → webhook marks the `Booking` paid.
5. Customer marks the job completed → can leave a `Review`, which rolls up into the pro's
   `avgRating`/`reviewCount`.

`Message`s are threaded per `ServiceRequest` between the customer and any pro who has quoted.

## Admin panel

Accounts with `role: ADMIN` get an `/admin` link in place of the regular dashboard link, covering:
- **Overview** — platform-wide counts and paid revenue.
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
npm run db:push          # sync the Prisma schema to your database
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

Job-request photos upload directly from the browser to Vercel Blob storage via `/api/upload`
(see `src/components/photo-uploader.tsx`). Create a Blob store under your project's **Storage**
tab and connect it.

**Note:** connecting a Blob store this way may only expose `BLOB_STORE_ID` (for Vercel's newer
OIDC-based auth), not a static `BLOB_READ_WRITE_TOKEN`. The `@vercel/blob` SDK version pinned
here falls back to OIDC only if `VERCEL_OIDC_TOKEN` is also present, which requires OIDC
Federation to be enabled for the project — if that's not set up, uploads fail with "No read-write
token found." The reliable fix: find the store's classic/static read-write token (not just the
`.env.local` quickstart tab) and add it yourself as `BLOB_READ_WRITE_TOKEN` under **Settings →
Environment Variables** (all three environments), then redeploy.

For local dev, add the same token to your `.env` as `BLOB_READ_WRITE_TOKEN`.

## Deploying (e.g. to Vercel)

The `vercel-build` script (`prisma generate && prisma db push --accept-data-loss && tsx prisma/seed.ts && next build`)
runs automatically on platforms like Vercel that look for it, so a deploy also syncs the schema and
seeds categories/demo accounts with no extra manual step. You only need to set the environment
variables from `.env.example` in the platform's dashboard.

`db push --accept-data-loss` and reseeding on every deploy are fine for early development, but
switch to `prisma migrate deploy` with real migration files (see `npm run db:migrate` locally)
before this holds real user data — `db push` can silently drop columns/tables that no longer
match the schema.

## Project structure

```
prisma/schema.prisma       Data model
prisma/seed.ts             Seed script (categories + demo accounts)
src/app/                   Routes (App Router) — pages + API route handlers
src/components/            Shared UI + feature components
src/lib/                   Prisma client, NextAuth config, Stripe client, utils
```
