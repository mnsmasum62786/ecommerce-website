# NOTES — Design Decisions & Assumptions

This document records the assumptions and architectural choices made while building Verdant Organic Market. The brief asked the builder to make all creative, content, and architectural decisions independently using sensible production defaults — these are those decisions.

## Brand & content
- **Brand name:** "Verdant Organic Market" (the repo/store needed a name; chose a trustworthy organic identity).
- **Palette:** green/earth tones via a custom Tailwind `brand-*` scale plus shadcn CSS variables themed green.
- **Copy:** all product descriptions, category blurbs, page content, and UI copy were written from scratch in professional English.
- **Imagery:** product and category images use royalty-free Unsplash URLs (hot-linked via `images.unsplash.com`, allow-listed in `next.config.mjs`). In production you'd typically re-host these in Vercel Blob; the admin product editor supports uploading replacements.

## Money & data
- **Currency stored in integer cents** throughout (DB, pricing, Stripe) to avoid floating-point errors. Display via `formatPrice()`.
- **Single-row settings tables** (`StoreSettings`, `ScriptSettings`) keyed on `id = "default"`. Simple and avoids a config sprawl.
- **Order snapshots:** orders snapshot the shipping address and each line item's name/price/image so historical orders stay accurate even if products change or are deleted (`onDelete: SetNull` on the product relation).

## Cart
- Cart is **client-side (localStorage)** for instant UX and guest support. Prices are **re-validated server-side at checkout** from the database — client prices are never trusted. A DB-backed `Cart`/`CartItem` model exists in the schema for future logged-in cart sync; the active implementation uses localStorage.

## Checkout & payments
- Two payment methods: **Stripe Checkout** (test mode) and **Cash on Delivery**. If Stripe keys are absent, the storefront automatically offers COD only — the app is fully functional without Stripe configured.
- **Stock is decremented and coupon usage incremented inside a Prisma `$transaction`** at order creation for consistency.
- `paymentStatus` starts `UNPAID` for both methods; Stripe flips it to `PAID` via the `/api/stripe/webhook` handler (verified with `STRIPE_WEBHOOK_SECRET`). COD remains `UNPAID` until an admin marks it paid/delivered.
- Discounts are passed to Stripe as a one-time `amount_off` coupon so the Stripe total matches the order total exactly.

## Auth & security
- **NextAuth credentials** provider with JWT sessions; passwords hashed with bcrypt. Roles: `CUSTOMER`, `STAFF`, `ADMIN`.
- **Admin protection is layered:** `middleware.ts` gates `/admin/*` and `/api/admin/*` by role from the JWT; the admin layout re-checks the session server-side; and each admin API handler calls `requireAdmin()`. Defense in depth.
- `STAFF` can manage catalog/orders; only `ADMIN` can change user roles. Admins cannot delete or demote their own account (prevents lockout).

## Custom Script Manager (priority feature)
- Scripts are stored in the DB and rendered by a **server component** (`ScriptInjector`) in three slots: `<head>`, immediately after `<body>`, and footer.
- Dedicated managed inputs generate correct vendor snippets for **GTM** (head + body `noscript`), **GA4**, **Meta Pixel** (base code + `noscript`), and **TikTok Pixel**; plus three free-form raw script boxes. Each integration and slot has an independent on/off toggle.
- **Security note:** raw script HTML is injected via `dangerouslySetInnerHTML`. This is the explicit purpose of the feature and is restricted to authenticated admins behind the protected admin panel. Treat admin access accordingly.

## Webhook Manager (priority feature)
- Admins register outbound webhook URLs subscribed to `order.created`, `order.paid`, `order.status_changed`, `order.cancelled`.
- Each delivery POSTs a JSON payload (order id, number, status, customer, items, totals, timestamp) with an **HMAC-SHA256 signature** in the `X-Verdant-Signature` header (and `X-Verdant-Event`), signed with the per-webhook secret so receivers can verify authenticity.
- Deliveries are **logged** with status/response/attempts and **retried once** on failure. A "Test" button sends a sample payload. Dispatch is wrapped so webhook problems never block order processing.

## Ecommerce tracking (GA4 + Meta CAPI)
- **GA4 / GTM:** the storefront emits GA4-schema ecommerce events — `view_item_list`, `view_item`, `add_to_cart`, `begin_checkout`, and `purchase`. Events are pushed to `window.dataLayer` (consumed by GTM when a Container ID is set) and, when GA4 is configured directly (Measurement ID, no GTM), also sent via `gtag('event', …)`. `TrackingConfig` injects `window.__VT__` so the client helpers (`src/lib/analytics.ts`) know which integrations are active.
- **Meta Conversions API (server-side):** when a Pixel ID + Access Token are set and CAPI is enabled in the Script Manager, ecommerce events are sent **server-side** — `ViewContent`, `AddToCart`, `InitiateCheckout` via `/api/track` (browser → our server → Meta), and `Purchase` directly from the checkout API for reliability. User data is SHA-256 hashed; `_fbp`/`_fbc`, IP, and user-agent are forwarded. See `src/lib/meta-capi.ts`.
- **Browser + server deduplication:** if the browser Meta Pixel is *also* enabled, the client fires each ecommerce event via `fbq('track', …, { eventID })` using the **same `event_id`** that the server CAPI call carries, so Meta deduplicates the two copies. `Purchase` uses the order number as the shared `event_id`. Leaving the browser pixel toggle **off** gives pure server-side tracking (no dedup needed since there's a single source).
- These activate purely from the admin **Script Manager** — no code changes needed.

## Shipping & tax (defaults)
- Flat shipping **$5.99**, **free over $75**. Express delivery adds **$7.00**. Tax rate defaults to **0%** (configurable in Settings — sales tax varies by jurisdiction, so it's left for the operator to set).

## Build & deployment choices
- `eslint.ignoreDuringBuilds = true` so lint warnings never block a production deploy.
- All DB-reading pages/segments are `force-dynamic`; settings/product helpers `try/catch` so the app builds and renders even when the database is unreachable (e.g., before the first migration).
- `npm run build` runs `prisma generate` first. Schema is applied with `prisma db push` (no migration history committed by default; switch to `prisma migrate` if you want versioned migrations).
- Email and image upload **degrade gracefully** when Resend/Blob aren't configured.

## Seed data
- 6 categories, **26 organic products** with realistic names/descriptions/prices/images, an admin user (from `ADMIN_EMAIL`/`ADMIN_PASSWORD`), store + script settings rows, and 3 sample coupons (`WELCOME15`, `FRESH10`, `GREEN20`). The seed is idempotent (upserts).
