# Deployment guide — Supabase + Vercel

Unimate ships as a Next.js app on **Vercel** backed by a **Supabase** project. Both run on
free tiers comfortably at campus scale. This guide is the full runbook: fresh Supabase
project → migrations → Vercel → post-deploy checks.

---

## 0. What you need

| Account | Why | Cost |
| --- | --- | --- |
| GitHub | hosts the repository (this one: `iftakharH/unimate-purple`) | free |
| [Supabase](https://supabase.com) | Postgres, Auth, Storage, Realtime | free tier |
| [Vercel](https://vercel.com) | builds and serves the app | free (Hobby) |

---

## 1. Supabase (data + auth + storage)

1. **Create the project** — pick the region closest to campus
   (`Southeast Asia (Singapore)` for East Delta University), set a strong database
   password, and save it somewhere safe (you will not need it day-to-day; the app talks
   through API keys).
2. **Copy the API keys** — Project Settings → API:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon / publishable key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (**server-only — never in the client**)
3. **Apply the schema** — every file in `supabase/migrations/` **in filename order** is the
   schema's source of truth (ADR-007: append-only). Two equivalent ways:
   - CLI: `supabase link --project-ref <ref>` then `supabase db push`
   - Dashboard: SQL Editor → run each migration file top to bottom, in order.
   Then run `supabase/seed.sql` (idempotent category seed; safe to re-run).
   Migrations create the storage buckets too — verify them under Storage afterwards.
4. **Auth → URL Configuration**
   - *Site URL*: `http://localhost:3000` for development; the production domain once
     Vercel gives you one (step 2.4).
   - *Redirect URLs*: add `http://localhost:3000/auth/callback` **and**
     `https://<your-domain>/auth/callback`. Email links (verification, invites, resets)
     land on `/auth/callback`, which performs the PKCE exchange.
5. **Email (SMTP)** — optional in development (test accounts are created email-free via
   `scripts/create-test-users.mjs`), **required** before real students sign up:
   Auth → SMTP Settings. Options without owning a domain: a free Gmail app password, or
   Supabase's built-in sender (heavily rate-limited, fine for a handful of users),
   or a transactional provider on a purchased domain later. Nothing else in the app
   needs changing when you do this.
6. **Super admins** — the emails in `SUPER_ADMIN_EMAILS` (env) become `admin` on first
   sign-up and can never be demoted or deleted. Keep them in sync with
   `src/lib/constants.ts` and the SQL `public.super_admin_emails()`.

## 2. Vercel (the app)

1. **Import** — vercel.com → *Add New → Project* → select the GitHub repo (grant access if
   it is private). Framework: **Next.js** is auto-detected; leave the build defaults
   (`npm run build`).
2. **Environment variables** (Production; mirror to Preview if desired):

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | from step 1.2 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from step 1.2 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from step 1.2 (**sensitive**) |
   | `SUPER_ADMIN_EMAILS` | comma-separated, e.g. `you@eastdelta.edu.bd` |
   | `ALLOWED_EMAIL_DOMAIN` | `eastdelta.edu.bd` |
   | `NEXT_PUBLIC_SITE_URL` | the production URL (see next step) |
   | `NEXT_PUBLIC_SHOW_SANDBOX_BADGE` | `true` until a real gateway exists |
   | `NEXT_PUBLIC_CURRENCY` | `BDT` |

3. **Deploy** — the first build produces a domain like `unimate-purple.vercel.app`.
4. **Close the loop** — set `NEXT_PUBLIC_SITE_URL` to that domain, add it to the Supabase
   redirect URLs (step 1.4), and **redeploy** (env changes need a new build).
5. **Optional custom domain** — Vercel → Domains → add; then update the Supabase Site URL +
   redirect URLs and `NEXT_PUBLIC_SITE_URL` to match.

## 3. Production security settings (Supabase dashboard — 5 minutes)

The app enforces its own security in code and RLS; these switches live only in the
dashboard and must be set once per project:

- **Auth → Providers → Email**: *Confirm email* **on** (the app is built around it),
  *Secure email change* **on**.
- **Auth → Passwords**: minimum length **8** (matches the app's own rule), and
  **leaked-password protection** **on** (rejects passwords seen in breach corpora).
- **Auth → Rate limits**: keep the defaults — they already throttle signup and resets.
- **Auth → URL Configuration**: production domain + `/auth/callback` (step 1.4).
- **Database → Advisors → Security Advisor**: run it after the migrations. A fresh
  project should show only "leaked password protection disabled" until you flip the
  toggle above; accepted dev findings are catalogued in ADR-009.
- **Storage**: all three buckets are public **by design** (serving photos via the public
  URL). Migration 17 removed the storage-object SELECT policies so the anon key cannot
  enumerate uploads. Do not re-add `public_read` policies.
- **SMTP**: configure before announcing the link — verification, invite and reset emails
  all depend on it (step 1.5).

## 4. Post-deploy checklist

- [ ] Visit `/login` — page renders, password eye works.
- [ ] Sign up with a `SUPER_ADMIN_EMAILS` address → avatar menu shows **Admin panel**.
- [ ] Apply as a seller with a second account → approve from `/admin` → store page works.
- [ ] Create a listing with a photo (photo uploads go browser → Storage directly).
- [ ] Message between the two accounts — delivery is realtime.
- [ ] Make an offer → run the **pay-in-app** path — sandbox badge visible, payment row
      `succeeded` in `/admin/payments`; refund it once to confirm the round-trip.
- [ ] Confirm `/admin/audit` recorded those admin actions.
- [ ] Run `supabase/tests/rls_checklist.sql` (it rolls itself back) — 21/21 pass.
- [ ] Non-campus email is rejected at signup unless invited.

## 5. Operating notes

- **Deploys**: push to `main` → Vercel builds. Every PR gets a preview URL.
- **Rollback**: Vercel → Deployments → *Promote to Production* on the last good build.
  Database migrations are **append-only** (ADR-007) — schema fixes ship as new migrations,
  never edits to old ones.
- **Secrets**: env values live in Vercel only; `.env.local` is git-ignored. If the service
  role key ever leaks, rotate it in Supabase → Project Settings → API.
- **SMTP** belongs to Supabase (Auth settings) — changing providers never touches Vercel.
- **Free-tier realities**: Supabase pauses projects after ~7 days of inactivity (click
  Restore); Vercel Hobby is for non-commercial use.
- **Costs**: nothing here charges money. The only paid upgrade path is a domain name and,
  later, a real payment gateway — both explicit product decisions, not prerequisites.
