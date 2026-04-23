# ThreeD4G

ThreeD4G is a Next.js 16 app for showcasing and managing 3D-printed grow-tent accessories.
It includes a public storefront, a contact form, a links page, and an authenticated admin dashboard for product, admin-user, and links management.

## Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Neon Postgres (`@neondatabase/serverless`)
- Vercel Blob for image uploads
- Tailwind CSS 4
- Resend (contact form emails)
- Stripe (checkout and payments)
- PostHog (optional analytics)

## Features

- Public pages: home, products, product detail, links, contact
- Admin dashboard at `/admin`
- Session-based auth using secure HTTP-only cookies
- Product management with:
    - multiple images per product
    - multiple variants per product
    - featured products
- Linktree-style links management with optional promo codes
- Contact form email delivery via Resend
- Image upload endpoint with type and size validation

## Requirements

- Node.js 20+
- pnpm
- A Neon Postgres database
- A Vercel Blob token (for uploads)
- Stripe API keys and webhook secret

## Quick Start

1. Install dependencies:

```bash
pnpm install
```

2. Create your env file:

```bash
cp .env.example .env.local
```

3. Add required values in `.env.local`:

```env
DATABASE_URL="postgresql://..."
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
ORDER_NOTIFICATION_EMAIL="contact@threed420.com"
ORDER_FROM_EMAIL="ThreeD420 Orders <contact@threed420.com>"
STRIPE_CURRENCY="aud"
AUSPOST_API_KEY="your_auspost_pac_api_key"
AUSPOST_FROM_POSTCODE="3000"
RESEND_API_KEY="re_..."
```

4. Initialize the database schema (run `schema.sql` against your Postgres DB).

5. Create an initial admin user:

```bash
npx tsx scripts/create-admin.ts <username> <password>
```

6. Start development server:

```bash
pnpm dev
```

7. Open:

- App: http://localhost:3000
- Login: http://localhost:3000/login
- Admin: http://localhost:3000/admin

## Environment Variables

### Required

- `DATABASE_URL`: Neon/Postgres connection string
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob read/write token
- `STRIPE_SECRET_KEY`: Stripe secret key used for checkout and webhook fulfillment
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key for Elements
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret
- `AUSPOST_API_KEY`: Australia Post PAC API key for live shipping rates and AU address suggestions
- `AUSPOST_FROM_POSTCODE`: Origin postcode used for domestic shipping quotes

### Optional

- `NEXT_PUBLIC_BASE_URL`: base URL for production
- `RESEND_API_KEY`: required to enable contact form email sending
- `CONTACT_EMAIL`: recipient address for contact form messages
- `NEXT_PUBLIC_POSTHOG_KEY`: enables PostHog analytics
- `NEXT_PUBLIC_POSTHOG_HOST`: PostHog host (defaults to `https://us.i.posthog.com`)
- `STRIPE_CURRENCY`: Stripe currency for checkout, defaults to `aud`
- `ORDER_NOTIFICATION_EMAIL`: inbox that receives new order notifications, defaults to `contact@threed420.com`
- `ORDER_FROM_EMAIL`: verified sender address for order emails
- `AUSPOST_DEFAULT_WEIGHT_KG`: default parcel weight for PAC quotes (defaults to `1`)
- `AUSPOST_DEFAULT_LENGTH_CM`: default parcel length for PAC quotes (defaults to `22`)
- `AUSPOST_DEFAULT_WIDTH_CM`: default parcel width for PAC quotes (defaults to `16`)
- `AUSPOST_DEFAULT_HEIGHT_CM`: default parcel height for PAC quotes (defaults to `7`)

## Database

Apply [schema.sql](schema.sql), which creates:

- `admins`
- `products`
- `product_images`
- `product_variants`
- `checkout_reservations`
- `checkout_reservation_items`
- `links`

with indexes for common query paths.

## Scripts

- `pnpm dev` - run local dev server
- `pnpm build` - create production build
- `pnpm start` - run production server
- `pnpm lint` - run ESLint

## API Overview

- Public read endpoints:
    - `GET /api/products`
    - `GET /api/products/[id]`
    - `GET /api/links`
    - `POST /api/contact`
- Auth endpoints:
    - `POST /api/auth/login`
    - `POST /api/auth/logout`
- Admin-protected endpoints:
    - `POST /api/upload`
    - `POST /api/products`
    - `PUT /api/products/[id]`
    - `DELETE /api/products/[id]`
    - `GET /api/admin`
    - `POST /api/admin`
    - links write endpoints under `/api/links/[id]`

Admin route protection and login redirects are handled in `proxy.ts`.

## Deployment

Deploy on Vercel (recommended) or any Node.js host supporting Next.js.

Minimum production setup:

1. Set environment variables
2. Run `pnpm build`
3. Run `pnpm start`

## Notes

- Uploaded files are validated as images and limited to 10 MB.
- Admin session cookie name is `threed4g_session`.
- Passwords are hashed with bcrypt.
