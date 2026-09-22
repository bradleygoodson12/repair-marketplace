# FixItPro — Home Repair Marketplace

A Thumbtack-style, two-sided marketplace for home repair services: homeowners post jobs, vetted pros
send quotes, and bookings are paid for securely on-platform.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Prisma** ORM on **PostgreSQL**
- **NextAuth** (credentials-based auth, JWT sessions)
- **Tailwind CSS** for styling
- **Stripe Checkout** for payments

## Core flow

1. Customer posts a `ServiceRequest` tied to a `Property` (address) and a `Category`.
2. Matching `ProProfile`s see the request as a lead and submit a `Quote`.
3. Customer accepts a quote → creates a `Booking`.
4. Customer pays via Stripe Checkout → webhook marks the `Booking` paid.
5. Customer marks the job completed → can leave a `Review`, which rolls up into the pro's
   `avgRating`/`reviewCount`.

`Message`s are threaded per `ServiceRequest` between the customer and any pro who has quoted.

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
- `customer@example.com`
- `jamie.pro@example.com` / `morgan.pro@example.com` / `riley.pro@example.com`

### Stripe webhook (local dev)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the printed webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## Project structure

```
prisma/schema.prisma       Data model
prisma/seed.ts             Seed script (categories + demo accounts)
src/app/                   Routes (App Router) — pages + API route handlers
src/components/            Shared UI + feature components
src/lib/                   Prisma client, NextAuth config, Stripe client, utils
```
