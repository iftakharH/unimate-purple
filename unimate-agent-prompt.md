# Build "Unimate": a student marketplace (Next.js + Supabase)

You are a senior full-stack engineer. Build the complete app described below, working in the phases at the end. Before using any library API (Supabase SSR auth for Next.js App Router, Auth Hooks, Realtime, Storage, MFA), look up the current official docs online and follow them rather than relying on memory. After each phase, run type-check, lint and build, and fix errors before moving on.

## 1. Product summary
Unimate is a clean, modern, responsive marketplace for East Delta University students. Everyone starts as a **Buyer**. Only **Sellers** (approved by an admin) can create listings, and each seller gets their own **store page** with a custom business name. **Admins** control everything. Currency is **BDT (৳)** everywhere.

## 2. Stack
- Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui, lucide-react icons
- Supabase: Postgres, Auth, Storage, Realtime, Row Level Security (use `@supabase/ssr`)
- Zod for validation, React Hook Form for forms, TanStack Query where helpful
- Deploy target: Vercel (frontend) + Supabase cloud

## 3. Roles and access
Roles: `buyer` (default), `seller`, `admin`. There are two hardcoded **Super Admins**: `ihrafi02ctg@gmail.com` and `242016312@eastdelta.edu.bd` (read from env `SUPER_ADMIN_EMAILS`, a comma-separated list, defaulting to these two values).

- Super Admins are `admin` automatically on first signup/login, can never be demoted or deleted by other admins, and are the only ones who can promote or demote other admins.
- Admins can: change any user's role, ban/unban, edit or delete any listing/store/deal/message/report, approve or reject seller requests, manage categories, view payments, and view an audit log.
- **Self-signup** is allowed only for `@eastdelta.edu.bd` emails. Enforce this in the UI **and** in the database (an `auth.users` insert trigger or Supabase Auth Hook that rejects other domains unless the email is a Super Admin email or exists in `invited_emails`). Never rely on client-side checks alone.
- **Admin onboarding of any email, any role (both methods):**
  1. *Invite:* admin enters email + role; the system stores it in `invited_emails` and sends a Supabase invite email with a set-password link.
  2. *Direct create:* admin enters email + role + temporary password; create the user with the service-role key in a server-only action; set `must_change_password = true` and force a password change on first login.
- Service-role key must only be used in server code (route handlers/server actions), never exposed to the client.
- **Seller requests:** a buyer taps "Request seller access" and submits desired business name, short description, and phone/contact. A `seller_requests` row (pending/approved/rejected, admin note) is created. Admin approves or rejects from the admin panel. On approval: set role to `seller` and create the user's `store`. The user sees request status and gets an in-app notification.

## 4. Database (Supabase migrations in `/supabase/migrations`)
Create SQL migrations with RLS enabled on every table:
`profiles` (id → auth.users, full_name, avatar_url, phone, bio, role, is_banned, must_change_password, created_at), `invited_emails`, `seller_requests`, `stores` (owner_id unique, business_name, slug unique, logo_url, banner_url, description, contact_phone, pickup_location, is_active), `categories`, `listings` (store_id, seller_id, title, description, price_bdt, category_id, condition `new|used`, status `active|sold|sold_out|hidden`, quantity, pickup_location, created_at), `listing_images` (listing_id, url, position), `saved_items`, `conversations` (listing_id, buyer_id, seller_id), `messages` (conversation_id, sender_id, body, read_at, created_at), `deals`, `payments`, `notifications`, `reports`, `admin_audit_log`.

RLS rules: public can read active listings, active stores and public profile fields; users edit only their own profile; only `seller` role inserts/updates their own listings and store; conversation participants only read/write their messages; deal participants read their deals; admins have full access via a security-definer `is_admin()` function. Write the policies carefully and add a short test script or checklist proving a buyer cannot create listings and a user cannot read others' messages.

Storage buckets: `listing-images`, `avatars`, `store-assets` with policies (public read, owner write, size/type limits: images only, max 5 MB, up to 8 photos per listing).

## 5. Features and pages
**Public / buyer**
- `/` Home: hero, categories, latest listings grid
- `/browse`: search (title/description), filters (category, price range in ৳, new/used, store), sort (newest, price asc/desc), pagination or infinite scroll, URL-synced filters
- `/listing/[id]`: image gallery, details, condition badge, ৳ price, status, seller info card linking to the store page and profile, Save, Message seller, Buy/Make an offer, report listing
- `/store/[slug]`: store banner, logo, business name, description, contact, all active listings
- `/saved`: saved items
- `/messages`: real-time chat (Supabase Realtime), conversation list, per-listing threads, unread badges, typing-free simple UI, auto-scroll
- `/deals`: My Deals (buyer and seller tabs) with a status timeline
- `/profile/[id]` and `/settings`: edit profile, avatar, account settings, change password, change email, security tab (active sessions/sign out everywhere, optional TOTP 2FA via Supabase MFA, delete account)
- "Become a seller" flow and request status page

**Seller (role = seller)**
- `/seller/store`: edit store (custom business name with unique slug, logo, banner, description, contact, pickup spot)
- `/seller/listings`: My Listings with create/edit/delete, photo upload with drag-reorder, new/used selector, mark **Sold** or **Sold out**, relist
- Seller view of incoming deals

**Admin (`/admin`)**
Dashboard stats (users, sellers, listings, deals, mock revenue); users table (search, change role, ban, create/invite user); seller requests queue; stores, listings, deals, payments, reports, categories management; audit log. Every admin action writes to `admin_audit_log`.

## 6. Deals
Deal statuses: `requested → accepted → paid (optional) → handed_over → completed`, plus `cancelled` and `rejected`. Buyer starts a deal from a listing; seller accepts or rejects. Two completion paths, chosen at deal start:
- **Pay on campus:** meet, hand over, seller confirms, deal completes.
- **Pay in-app:** buyer pays via the checkout (section 7), then they meet for handover and both confirm.
When a deal completes, the listing is marked `sold` (or decrements quantity and becomes `sold_out` at zero). Every status change creates a notification and is shown in a timeline on the deal page.

## 7. Mock payment system
Implement payments behind a `PaymentProvider` interface (`createPayment`, `confirmPayment`, `refund`) with a `MockPaymentProvider` as the only implementation, so a real gateway can be swapped in later.
- Build a polished, realistic checkout: order summary in ৳, method choices (Card, Mobile Wallet, Bank), card form with brand detection and Luhn/expiry/CVV format validation, a wallet flow with a number and a one-time-code screen, a processing animation, then a success screen with a receipt and transaction ID, or a clear failure state with retry.
- Simulate outcomes deterministically (for example a card number ending in `0000` fails, anything else succeeds) and with realistic latency.
- **Never store or log card numbers, CVV or expiry.** Persist only the method type, status, amount, transaction ID, and timestamps in `payments`. No real money moves and no external gateway is called.
- Use generic wallet/bank names, not real brand logos.
- Env flag `NEXT_PUBLIC_SHOW_SANDBOX_BADGE` (default `true`) controls a small "Sandbox" badge on the checkout. In the README, note that if real students use the live app, the badge should stay on, so nobody believes real money was charged.
- Admin payments page shows all transactions and can mark refunds (simulated).

## 8. Design and UX
Simple, polished and modern: soft neutral palette with a single accent color, generous whitespace, rounded cards, clear type scale, subtle motion. Mobile-first: bottom tab bar on phones (Home, Browse, Saved, Messages, Profile), top navbar on desktop. Include skeleton loaders, empty states, toasts, accessible forms (labels, focus rings, contrast), image optimization with `next/image`, and optional dark mode. Pages must work well at 360px and at 1440px.

## 9. Deployment and configuration
- Provide `.env.example` with: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPER_ADMIN_EMAILS`, `ALLOWED_EMAIL_DOMAIN=eastdelta.edu.bd`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SHOW_SANDBOX_BADGE`, `NEXT_PUBLIC_CURRENCY=BDT`.
- Provide Supabase migration files plus a `seed.sql` (categories and a few sample listings).
- Write a `README.md` with step-by-step setup: create Supabase project, run migrations, create storage buckets, configure Auth (site URL, redirect URLs, email templates, SMTP note), enable the Auth Hook if used, set env vars, deploy to Vercel, and sign up with a Super Admin email first.
- Include a `vercel.json` only if needed. No secrets in the repo.

## 10. Build phases
1. Scaffold, Tailwind/shadcn, Supabase clients (browser/server/middleware), env validation
2. Migrations, RLS, storage buckets, seed data
3. Auth: domain restriction (UI and DB), verification, Super Admin bootstrap, invite and direct-create flows, forced password change, settings and security
4. Roles, seller requests, stores and store pages
5. Listings: create/edit with photos, browse, search, filters, product page
6. Saved items, My Listings, sold/sold-out handling
7. Real-time chat and notifications
8. Deals tracker and mock payment
9. Profiles and account pages
10. Admin panel with audit log
11. Responsive polish, error/empty/loading states, README and deployment guide

## 11. Acceptance checklist
- Non-eastdelta email cannot self-register; admin invite and direct-create both work
- Both Super Admins can assign any role; a new user is a buyer and cannot create listings
- Seller request → admin approval → store page with custom business name works
- Listings with photos, filters, search, save, and product page with seller info work
- Chat updates in real time between two browsers
- Both deal paths work; listing flips to sold/sold out
- Mock checkout completes with a receipt, stores no card data
- Admin can manage users, listings, stores, deals, payments, reports; audit log records actions
- Responsive on mobile and desktop; `npm run build` passes with no type or lint errors

Start with phase 1, show me the file structure you plan to create, then proceed through the phases.
