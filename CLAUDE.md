# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (http://localhost:3000)
pnpm build        # Production build
pnpm start        # Run production server
pnpm lint         # Run ESLint

# Create the first admin user
npx tsx scripts/create-admin.ts <username> <password>
```

No test suite is configured.

## Architecture Overview

**Next.js 16 App Router** with React 19, TypeScript, and Tailwind CSS 4. Deployed on Vercel with Neon Postgres as the database.

### Middleware (`proxy.ts`)
Acts as Next.js middleware. Guards all `/admin` routes by checking for the `threed4g_session` cookie; redirects unauthenticated requests to `/login`. Also proxies PostHog analytics requests.

### Database (`lib/db.ts`)
Single exported `sql` tagged-template client from `@neondatabase/serverless`. All queries use this directly — no ORM. Run `schema.sql` to initialize the schema.

### Auth & Sessions (`lib/auth.ts`, `lib/session.ts`)
Password hashing via `bcryptjs`. Session stored as a plaintext-username HTTP-only cookie (`threed4g_session`, 7-day TTL). No JWT — the session value is just the admin username.

### Cart (`lib/store/cart.ts`)
Zustand store with `persist` middleware (localStorage key: `threed4g-cart`). Cart item IDs are composite keys: `"productId"` or `"productId-variantId"`. `syncItemsWithStock` reconciles local cart state against live stock on the checkout page.

### Checkout Flow
1. `POST /api/checkout` — validates cart items against DB stock, creates a `checkout_reservations` record + `checkout_reservation_items`, and creates a Stripe PaymentIntent or PayPal order.
2. `POST /api/checkout/session` — creates a stock reservation via `lib/stockReservation.ts` before payment is initiated (TTL: 20 minutes).
3. Payment confirmation via:
   - Stripe: webhook at `POST /api/stripe/webhook` (or confirm route)
   - PayPal: `POST /api/paypal/orders/[id]/capture`
4. `GET /api/checkout/cancel` — releases the stock reservation on cancel.

### Stock Reservation (`lib/stockReservation.ts`)
Two tables (`checkout_stock_sessions`, `checkout_stock_session_items`) created on-demand with `ensureStockReservationTables()`. Uses a single SQL CTE to atomically check availability, decrement `product_variants.stock_quantity`, and insert the reservation. Expired sessions are released via `releaseExpiredReservations()`, which is called automatically on each reservation operation. These tables are **not** in `schema.sql` — they are created at runtime.

### Shipping (`lib/checkout.ts`, `lib/auspost.ts`)
Static shipping options are defined in `lib/checkout.ts` (AusPost Standard/Express/International). Live rates can be fetched via the AusPost PAC API (`lib/auspost.ts`). US orders incur a 10% tariff calculated in `calculateTariffAmount`.

### Payment Providers
- **Stripe** (`lib/` — uses `stripe` SDK): PaymentIntent flow with Stripe Elements on the frontend.
- **PayPal** (`lib/paypal.ts`): Server-side REST API calls (no SDK). Access tokens fetched per-request. Environment toggled via `PAYPAL_ENVIRONMENT=sandbox|live`.

### Email (`resend`)
Order confirmation and notification emails are sent from `POST /api/checkout/route.ts` using the Resend SDK. HTML is rendered inline in the route handler.

### Image Uploads (`/api/upload`)
`POST /api/upload` — admin-only. Validates MIME type and 10 MB size limit, then stores to Vercel Blob. `next.config.ts` allows remote images from `*.public.blob.vercel-storage.com`.

### Database Schema
Tables: `admins`, `products`, `product_images`, `product_variants`, `checkout_reservations`, `checkout_reservation_items`, `orders`, `order_items`, `links`. Two additional tables (`checkout_stock_sessions`, `checkout_stock_session_items`) are created at runtime by `lib/stockReservation.ts`.

### Frontend Libraries
- **Animations**: Framer Motion, GSAP (`lib/gsap.ts`), Lenis (smooth scroll)
- **UI**: shadcn/ui components (`components/ui/`), Radix UI primitives
- **Marquee**: `react-fast-marquee`

## Key Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | PayPal server credentials |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | PayPal client-side ID |
| `PAYPAL_ENVIRONMENT` | `sandbox` (default) or `live` |
| `AUSPOST_API_KEY` / `AUSPOST_FROM_POSTCODE` | AusPost PAC API |
| `RESEND_API_KEY` | Resend email sending |
| `STRIPE_CURRENCY` | Checkout currency, defaults to `aud` |
