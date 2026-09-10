# FarmConnect — Architecture

Practical conventions for this codebase. Keep this short and update it as
conventions actually change — don't let it drift from the code.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui, backed by
Supabase (Postgres + PostGIS, Auth, Storage, Realtime, Edge Functions).
Deployed on Vercel. No separate backend server — Supabase is the backend.

## Project structure

```
src/
  app/                  Routes only (App Router). Pages, layouts,
                         loading.tsx, error.tsx, route handlers.
  components/
    ui/                 shadcn/ui primitives (button, card, sheet, ...).
                         Generated via `npx shadcn add <component>` —
                         don't hand-edit these beyond what shadcn generates.
    layout/             App-wide chrome: header, footer, nav. Not tied to
                         one feature.
  features/             Feature-specific code, one folder per feature
                         (e.g. features/auth/, future features/jobs/).
                         Each feature folder owns its own components,
                         server actions, schemas, and feature-local types.
  lib/
    supabase/           Supabase client factories: client.ts, server.ts,
                         middleware.ts. See "Supabase access" below.
    env.ts               Typed, validated access to environment variables.
    get-origin.ts         Request origin, for building auth email redirect
                           URLs.
    utils.ts             Generic helpers (currently just shadcn's `cn`).
  types/                 Shared cross-feature types (profile.ts mirrors
                          the profiles table — see "Auth" below).
  proxy.ts                Next.js middleware entry point, scoped to
                           Supabase-dependent routes only (see below).
supabase/
  migrations/             Hand-written SQL migrations, applied manually via
                           the Supabase SQL editor or `supabase db push`
                           (no Supabase project is linked from this repo).
```

Rule of thumb: if code is used by exactly one feature, it lives inside that
feature's folder under `src/features/`. If it's shared UI chrome or a
cross-cutting concern, it lives in `src/components/layout` or `src/lib`.
`src/components/ui` is reserved for shadcn primitives — compose them into
feature UI rather than editing them.

## Supabase access

Three entry points, matching where the code runs:

- `src/lib/supabase/client.ts` — `createClient()` for Client Components.
  Uses the public anon key. Import only from files with `"use client"`.
- `src/lib/supabase/server.ts` — `createClient()` (async) for Server
  Components, Server Actions, and Route Handlers. Also uses the anon key,
  scoped by the request's session via cookies — RLS still applies.
- `src/lib/supabase/middleware.ts` — `updateSession()`, wired into
  `src/proxy.ts` (Next.js's middleware entry point — Next 16 renamed the
  file convention from `middleware.ts` to `proxy.ts`, same mechanism).
  Refreshes the session cookie so server components see a valid session.

`src/proxy.ts`'s matcher is scoped to only the routes that touch Supabase
(`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/*`,
`/onboarding`, `/app/*`) — it deliberately never runs on `/`, `/farmer`,
or `/provider`, so the public marketing pages can never depend on
Supabase being configured. Every one of those Supabase-touching routes
also checks `env.isSupabaseConfiguredPublic()` (a non-throwing check)
before rendering a form, and `getHeaderAuthState()` (used by
`SiteHeader`, which renders on every page) wraps its Supabase call in
try/catch and falls back to the logged-out header on any failure —
config missing or a network error alike. Follow this pattern for any new
Supabase-dependent route: check config first, degrade to a clear message
or safe fallback, never let a missing/unreachable Supabase break
rendering.

There is deliberately no service-role client yet. Add one only when
server-only, RLS-bypassing access is actually needed (e.g. an admin
action or an Edge Function). It must read `env.supabaseServiceRoleKey()`
and never be imported from a Client Component or any code path reachable
from the browser bundle.

Never disable RLS to make a query "just work" — fix the policy instead.

## Auth and user identity

Identity (Supabase Auth: email + password, `auth.users`) is kept separate
from the application profile (`public.profiles`, one row per user, holds
display name, phone, location, and marketplace capabilities). Phone
number is a profile field, not a credential — this is intentional, so
phone verification can be added later without touching the identity
model.

Farmer and provider are independent booleans (`is_farmer`, `is_provider`)
on the profile, not a single exclusive role — a person can be either or
both. Don't reintroduce an exclusive `role` enum for this.

Auth feature code lives in `src/features/auth/`:

- `schemas.ts` — zod schemas, the single source of truth for validation
  rules (password policy, etc.), used by both the client-rendered forms
  and the server actions that enforce them.
- `actions.ts` — Server Actions (`"use server"`) for sign up, log in, log
  out, password reset, resend verification, and completing onboarding.
  Each checks `env.isSupabaseConfiguredPublic()` first and wraps Supabase
  calls in try/catch, returning a typed `AuthFormState` rather than
  throwing, so forms can show inline errors instead of crashing to the
  nearest error boundary.
- `errors.ts` — translates raw Supabase Auth error messages into
  user-facing copy. Extend `mapAuthError` here, not inline in components.
- `profile.ts` / `session-status.ts` — server-side helpers to fetch the
  current user + profile. Use `getUser()`, not `getSession()`, for any
  access-control decision — it revalidates the JWT against the Supabase
  Auth server instead of trusting the cookie.
- `components/` — form components (client components using React 19's
  `useActionState`) and `AuthShell`, the shared card layout for auth
  pages.

Routing/access control is enforced in layouts, not in `src/proxy.ts`
(middleware only refreshes the session cookie — it doesn't query the
database):

- `src/app/app/layout.tsx` — requires a signed-in user with
  `onboarding_completed`; redirects to `/login` or `/onboarding`
  otherwise.
- `src/app/onboarding/page.tsx` — requires a signed-in user; redirects
  completed users to `/app`.
- `src/app/login/page.tsx` / `signup/page.tsx` — redirect an
  already-signed-in user to `/app` or `/onboarding`.

A note on Next.js's render model: a layout and its page render
concurrently, not sequentially — a page can't rely on its layout's
redirect/guard having "already happened" before the page body runs. Each
protected page in `src/app/app/` should assume it might execute even on a
request the layout will redirect away from, and stay safe if so
(`src/app/app/page.tsx` bails out early when Supabase isn't configured
for exactly this reason).

**Email confirmation flow**: Supabase's email templates must link to
`/auth/confirm?token_hash=...&type=...&next=...` (the `token_hash` flow,
verified server-side via `supabase.auth.verifyOtp` in
`src/app/auth/confirm/route.ts`) rather than the default
`{{ .ConfirmationURL }}`. See the Supabase dashboard configuration steps
in the README. An invalid or expired link lands on `/auth/error`.

## Environment variables

All access goes through `src/lib/env.ts`, which throws a clear error if a
variable is missing rather than silently using `undefined`. Don't read
`process.env.*` directly outside that file.

- `.env.example` documents every variable and is committed.
- `.env.local` holds real values and is git-ignored. Copy the example to
  create it.
- Anything prefixed `NEXT_PUBLIC_` is shipped to the browser — only put
  values there that are safe to expose (Supabase URL, anon key). Secrets
  (service role key) must never carry that prefix.

## Error and loading conventions

- `src/app/loading.tsx` and `src/app/error.tsx` provide the app-wide
  fallback (skeleton / error boundary with retry). Next.js renders these
  automatically for the route tree.
- A feature route with meaningfully different loading or error UI adds its
  own `loading.tsx` / `error.tsx` inside that route segment — Next.js
  scopes them automatically, no wiring needed.
- `error.tsx` must be a Client Component (`"use client"`) — this is a
  Next.js requirement, not a project convention.

## UI components

- Reach for an existing `src/components/ui/*` primitive before writing a
  new one. Add more with `npx shadcn add <name>`.
- Feature-specific composite components (e.g. a job card) live in that
  feature's folder, built out of `components/ui` primitives.
- Mobile-first: design for the small viewport first, then add `md:`/`lg:`
  overrides. The app shell uses a bottom tab bar on mobile
  (`components/layout/mobile-tab-bar.tsx`) and an inline header nav at the
  `md` breakpoint (`components/layout/site-header.tsx`).

## Naming conventions

- Files/folders: `kebab-case` (`site-header.tsx`, `job-card.tsx`).
- Components: `PascalCase` export names, one primary component per file.
- Route folders under `src/app`: lowercase, matching the URL segment.
- Types/interfaces: `PascalCase`; prefer `type` over `interface` unless
  declaration merging is actually needed.

## Adding a new feature (future phases)

1. Create `src/features/<feature-name>/`.
2. Put feature UI, hooks, server actions, and feature-local types inside
   it.
3. Add routes under `src/app/<route>/` that import from the feature
   folder — keep `app/` files thin (composition + data fetching wiring),
   push logic into `features/`.
4. Add shared types to `src/types/` only once something outside the
   feature needs them.
5. If the feature needs new tables, add a migration (migrations directory
   to be established alongside the first schema change) and regenerate
   Supabase types rather than hand-writing them.

## Explicitly not decided yet

No job/machinery/matching schema, no marketplace logic, no
payments/messaging integration. Auth and the base user profile
(`public.profiles`) exist as of Phase 2 — see "Auth and user identity"
above. These remaining items are scoped to future phases and should not
be anticipated speculatively in this codebase.
