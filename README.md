# 🌿 Verdant Organic Market

A complete, production-ready **organic food e-commerce platform** built with Next.js 14, TypeScript, Prisma, and PostgreSQL — including a full storefront, secure admin panel, Stripe + Cash-on-Delivery checkout, a site-wide **Custom Script Manager**, and an outbound **Webhook Manager**.

---

## ✨ Features

### Storefront
- Homepage with hero, category grid, featured products, promo banner, best-sellers, and newsletter signup
- Product catalog with category & tag filtering, search, sorting, and pagination
- Product detail pages with image gallery, organic certification badge, stock status, quantity selector, and related products
- Persistent cart (localStorage) with quantity management
- Checkout with shipping form, delivery options, coupon codes, **Stripe** payment, and **Cash on Delivery**
- Customer accounts: register/login, order history, order tracking, saved addresses
- Order confirmation page + transactional confirmation email (Resend)
- SEO meta tags, dynamic `sitemap.xml`, and `robots.txt`
- Content pages: About, Contact, FAQ, Privacy, Terms, Shipping & Returns
- Fully responsive, mobile-first design with a green/earth organic aesthetic

### Admin Panel (`/admin`, role-protected)
- **Dashboard** — revenue, orders, customers, pending orders, sales chart, low-stock alerts, recent orders
- **Products** — full CRUD, image upload (Vercel Blob), categories, tags, pricing, stock, organic attributes, bulk actions
- **Categories** — CRUD with nesting
- **Orders** — list, filter by status, detail view, status workflow (pending → processing → shipped → delivered → cancelled), refund flag
- **Customers** — list, detail, per-customer order history
- **Inventory** — stock tracking with low-stock threshold alerts
- **Coupons** — percentage & fixed discounts, min spend, expiry, usage limits
- **Custom Script Manager** — inject GTM, GA4, Meta Pixel, TikTok Pixel, and free-form head/body/footer scripts site-wide, each toggleable, no code edits required
- **Webhook Manager** — outbound webhooks on order events with HMAC-SHA256 signing, delivery log, retry, and test sends
- **Settings** — store name, logo, currency, shipping rates, tax, contact info, social links
- **Admin Users** — create staff/admin accounts with role basics

---

## 🧱 Tech Stack

| Layer        | Technology |
|--------------|------------|
| Framework    | Next.js 14 (App Router) + TypeScript |
| Styling      | Tailwind CSS + shadcn/ui |
| Database     | PostgreSQL (Vercel Postgres / Neon) via Prisma ORM |
| Auth         | NextAuth.js (credentials) |
| Payments     | Stripe (test mode) + Cash on Delivery |
| File storage | Vercel Blob |
| Email        | Resend |
| Validation   | Zod |
| Charts       | Recharts |
| Deployment   | Vercel |

---

## 🚀 Local Development

### 1. Prerequisites
- Node.js 18.18+ (20+ recommended)
- A PostgreSQL database (local, Neon, or Vercel Postgres)

### 2. Install
```bash
npm install
```

### 3. Configure environment
Copy `.env.example` to `.env` and fill in the values:
```bash
cp .env.example .env
```
At minimum you need `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`. Stripe, Resend, and Blob keys are optional for local dev (Cash on Delivery works without Stripe; email and uploads degrade gracefully).

### 4. Set up the database
```bash
npx prisma db push     # create tables from the schema
npm run seed           # seed categories, 26 products, admin user, coupons
```

### 5. Run
```bash
npm run dev
```
Visit **http://localhost:3000**. The admin panel is at **/admin** — sign in with the seeded admin credentials (see below).

---

## ☁️ Deploying to Vercel

1. Push this repo to GitHub and import it into Vercel.
2. Add a **Vercel Postgres** (Neon) store and a **Vercel Blob** store to the project — these auto-populate `DATABASE_URL` / `DIRECT_URL` and `BLOB_READ_WRITE_TOKEN`.
3. Set the remaining environment variables (see list below).
4. Deploy. The build runs `prisma generate && next build`.
5. Apply the schema and seed against the production database:
   ```bash
   # with the production DATABASE_URL / DIRECT_URL in your shell:
   npx prisma db push
   npm run seed
   ```
   (Or run `npx prisma migrate deploy` if you generate migrations.)
6. Configure the Stripe webhook endpoint at `https://<your-domain>/api/stripe/webhook` and paste the signing secret into `STRIPE_WEBHOOK_SECRET`.

---

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Pooled Postgres connection string |
| `DIRECT_URL` | ✅ | Direct Postgres connection (migrations) |
| `NEXTAUTH_URL` | ✅ | App URL (e.g. `https://yourstore.vercel.app`) |
| `NEXTAUTH_SECRET` | ✅ | Random secret (`openssl rand -base64 32`) |
| `ADMIN_EMAIL` | ✅ (seed) | Seed admin email |
| `ADMIN_PASSWORD` | ✅ (seed) | Seed admin password |
| `ADMIN_NAME` | ⬜ | Seed admin display name |
| `STRIPE_SECRET_KEY` | ⬜ | Stripe secret (enables card payments) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ⬜ | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | ⬜ | Stripe webhook signing secret |
| `BLOB_READ_WRITE_TOKEN` | ⬜ | Vercel Blob token (enables image upload) |
| `RESEND_API_KEY` | ⬜ | Resend API key (enables order emails) |
| `EMAIL_FROM` | ⬜ | Verified sender address |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public base URL (emails, sitemap, Stripe redirects) |

> Optional keys degrade gracefully: without Stripe, only Cash on Delivery is offered; without Resend, emails are skipped; without Blob, you can still attach image URLs directly.

---

## 🗂️ Project Structure
```
prisma/            Prisma schema + seed script
src/
  app/
    (shop)/        Storefront routes (header/footer layout)
    admin/         Admin panel (role-protected)
    api/           Route handlers (auth, checkout, stripe, admin/*)
  components/
    ui/            shadcn/ui primitives
    storefront/    Storefront components
    admin/         Admin components
    scripts/       Custom Script Manager renderer
  lib/             prisma, auth, pricing, coupons, webhooks, email, settings
  middleware.ts    Admin route protection
```

## 📜 Scripts
| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (runs `prisma generate`) |
| `npm run start` | Start the production server |
| `npm run seed` | Seed the database |
| `npm run db:push` | Push the Prisma schema to the DB |
| `npm run db:migrate` | Apply migrations (`prisma migrate deploy`) |

---

See **NOTES.md** for design decisions and assumptions.
