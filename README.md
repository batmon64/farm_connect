# FarmConnect

A real-time agricultural services marketplace connecting farmers with
workers, machinery, and agricultural services on demand. Currently has
email/password authentication and a minimal user profile — see
[ARCHITECTURE.md](./ARCHITECTURE.md) for project conventions.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase
(Postgres, PostGIS, Auth, Storage, Realtime) · Vercel.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in your Supabase project's
   values (Project Settings → API in the Supabase dashboard):

   ```bash
   cp .env.example .env.local
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

The public marketing pages (`/`, `/farmer`, `/provider`) render even
without a configured Supabase project. Every auth-related page
(`/login`, `/signup`, `/app`, ...) checks for configuration first and
shows a clear "Supabase isn't configured" message instead of crashing if
the env vars above aren't set.

## Supabase setup (required for auth)

1. **Run the migration.** Open the Supabase SQL editor for your project
   and run [`supabase/migrations/0001_profiles.sql`](./supabase/migrations/0001_profiles.sql).
   This repo has no linked Supabase project, so this must be applied
   manually (or via `supabase db push` if you set up the CLI yourself).
   It creates `public.profiles`, enables RLS with owner-only policies, and
   adds a trigger that creates a profile row whenever a new
   `auth.users` row is created.

2. **Email auth.** In Authentication → Providers, Email should already be
   enabled by default. Decide whether to keep "Confirm email" on
   (Authentication → Sign In / Providers → Email, or Auth settings,
   depending on your Supabase dashboard version) — this app assumes
   confirmation is required (the sign-up flow tells users to check their
   inbox) but works either way.

3. **Email templates — required.** In Authentication → Email Templates,
   edit **Confirm signup** and **Reset password** so their link points at
   this app's `/auth/confirm` route instead of Supabase's default
   `{{ .ConfirmationURL }}`:

   Confirm signup:
   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/onboarding?verified=1
   ```

   Reset password:
   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
   ```

   (The stray `?` inside the `next` value is fine — it's just a literal
   character within that query value, not a second query string.)

   Without this change, confirmation/reset links will point at Supabase's
   hosted verify endpoint instead of this app and the flow will break.

4. **URL configuration.** In Authentication → URL Configuration:
   - **Site URL**: `http://localhost:3000` for local dev (update to your
     production domain later; you can add multiple redirect URLs, not
     multiple site URLs — see next point).
   - **Redirect URLs**: add `http://localhost:3000/**` (and your Vercel
     preview/production URLs once deployed) so Supabase allows redirecting
     back here after email confirmation.

5. **Local email testing.** Supabase's hosted free tier has a very low
   outbound email rate limit and can be slow/unreliable for testing sign-up
   repeatedly. For local development, consider either:
   - The Supabase CLI's local stack (`supabase start`, needs Docker) —
     captures all outgoing auth emails in a local Inbucket inbox at
     `http://localhost:54324` so you never wait on real email delivery.
   - Or just using the real hosted project and checking the test inbox
     manually — fine for occasional testing, slower for iterating.

   This wasn't set up in this repo (no Docker available in the build
   environment) — decide which fits your workflow.

## Scripts

- `npm run dev` — start the dev server (Turbopack).
- `npm run build` — production build.
- `npm run start` — run the production build.
- `npm run lint` — lint the codebase.

## Learn more

See [ARCHITECTURE.md](./ARCHITECTURE.md) for project structure, where
different kinds of code belong, and naming conventions.
