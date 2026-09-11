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
  migrations/             Hand-written SQL migrations. No Supabase project
                           is linked from this repo (no `supabase/config.toml`)
                           — applied via the connected Supabase tooling or
                           the SQL editor, numbered sequentially, never
                           edited once applied to the live project.
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

## Marketplace data model (Phase 3A)

Database/backend foundation only — no marketplace UI exists yet (no job
creation form, provider dashboard, offer UI, etc.). The schema exists so
those features have something correct to build against.

**Core distinction the schema enforces**: a *provider profile* (business
identity — can list services, own machines, employ workers) is separate
from a *user profile* (Phase 2 identity). A profile's `is_provider` flag
just means "this account may act as a provider"; `provider_profiles` is
what that provider actually looks like, and doesn't exist until they
create one.

```
profiles (Phase 2)
  └─ provider_profiles          1:1, cascades with the profile
       ├─ provider_services     services this provider offers  ─┐
       ├─ machines               ├─ machine_services            ├─ → services
       │    └─ machine_availability (date/time ranges, booked)  │  (catalogue)
       ├─ workers                                                │
       ├─ teams ── team_workers → workers                        │
       └─ provider_availability (recurring weekly hours)         │
                                                                  │
service_categories → services  ───────────────────────────────────┘
  (public reference catalogue — seeded, not owned by any user)

profiles (Phase 2)
  └─ farm_jobs                  owned by the farmer (created_by)
       ├─ job_services            }
       ├─ job_machine_requirements } what the job needs — kept
       ├─ job_worker_requirements  } separate from farm_jobs itself
       ├─ job_offers ← provider_profiles   a provider's response
       │    (NOT a reservation — see below)
       └─ job_assignments ← job_offers      the provider actually
            (one active assignment per job, enforced by a partial       selected
            unique index; always traces back to an accepted offer)
```

**An offer is not a reservation** (explicit product rule): submitting a
`job_offers` row never touches `machine_availability` or locks anything.
Only a `job_assignments` row represents real commitment. Accepting an
offer means the job owner creates a `job_assignments` row referencing it;
a trigger (`sync_offer_status_on_assignment`) then flips that offer to
`'accepted'` automatically — the job owner never gets UPDATE rights on
`job_offers` directly, so "accept" stays a single controlled code path
rather than an open grant. A second trigger
(`validate_job_assignment_matches_offer`) rejects an assignment whose
`job_id`/`provider_id` don't match the offer it claims to come from.

**Deletion behavior** — two different rules, deliberately:
- Provider-owned resources (`machines`, `workers`, `teams`,
  `provider_services`, `provider_availability`, `machine_services`,
  `team_workers`) **cascade** with their `provider_profiles` row. Only
  the provider has a stake in these; if they delete their provider
  profile, their listings should go with it.
- `farm_jobs`, `job_offers`, and `job_assignments` **restrict** deletion
  of the `profiles`/`provider_profiles` row they reference. A job is
  shared history between a farmer and provider(s) — it must not
  disappear because one party's profile was deleted. (Account-deletion
  flows that need to handle this — anonymize instead of delete, etc. —
  are a future, dedicated design, not an FK cascade.)
- Catalogue rows (`service_categories`, `services`) use `ON DELETE
  RESTRICT` from anything that references them — deactivate
  (`is_active = false`) instead of deleting once something depends on a
  row.

**RLS**: every table owner-scoped (no cross-user read/write) except the
catalogue (`service_categories`/`services`, publicly readable, writable
only via migrations — there's no end-user write policy at all). Two
reusable `SECURITY DEFINER` predicate functions —
`owns_provider_profile(id)` and `owns_farm_job(id)` — back most
policies; they only ever return a boolean tied to `auth.uid()`, so
they're safe to grant `EXECUTE` to `anon`/`authenticated` (a policy
calling them needs the querying role to have that grant, unlike
trigger-only functions). `job_offers` is the one asymmetric case: a
provider manages their own offers, but the job owner gets read-only
visibility into all offers on their job, not write access — enforced
via the OR in its SELECT policy, not a separate owner-write path.

**Deliberately deferred** (do not build ahead of the phase that needs it):
- Public/marketplace read access to `provider_profiles`, `machines`, or
  `farm_jobs` (e.g. "browse active providers", "browse posted jobs near
  me") — needs a decision about exactly which fields are safe to expose
  before any policy is written, not just RLS plumbing.
- Automatic `farm_jobs.status` transitions — the app sets status
  explicitly; the column just constrains it to a known set.
- Worker/machine-to-assignment junction tables (i.e. which specific
  worker or machine actually got sent) — `job_assignments.id` is a
  stable PK a future table can reference, but that table doesn't exist
  yet.
- The spatial "providers within X km of a job" query — `geography(Point,
  4326)` columns and GiST indexes exist on `provider_profiles`,
  `machines`, and `farm_jobs` for this, but no query/matching logic.
- Provider-side status updates on `job_assignments` (e.g. marking their
  own work complete) — update is job-owner-only for now.

## Marketplace UI (Phase 3B)

The first working marketplace loop: farmer posts a job → provider
discovers it → provider offers → farmer accepts → both see the
confirmed job. Built on the Phase 3A schema — see "Marketplace data
model" above for the tables this section's routes and RPCs sit on top of.

**Routing.** `/app/**` is one authenticated tree with two sub-experiences
sharing a layout:
- `/app`, `/app/jobs*`, `/app/notifications`, `/app/profile` — farmer.
- `/app/provider*` — provider (its own `layout.tsx` redirects to `/app`
  if `!profile.is_provider`).

`AppShell` (`src/features/marketplace/components/app-shell.tsx`) reads
the current pathname to decide which of the two bottom-nav sets to show,
and — when a profile has both capabilities — renders a "Switch to
Farmer/Provider" banner linking between `/app` and `/app/provider`. This
is the one role-switching mechanism; there's no per-request role state
beyond it. The root layout hides the public marketing header/footer/nav
for `/app/**` (via an `x-pathname` header `src/proxy.ts` sets and the
root layout reads — Server Components have no `usePathname()`), so the
two chrome systems never double up.

**Provider-side reads never touch `farm_jobs.location` directly.** RLS
alone can't hide one column while allowing the row — see "Marketplace
data model" for why discovery goes through `SECURITY DEFINER` functions
(`discover_jobs`, `get_offers_for_job`, `get_my_offers`, all in
`src/features/{jobs,provider}/queries.ts`) that explicitly choose safe
columns instead. `discover_jobs(p_job_id?, p_max_distance_km?)` doubles
as both the list feed and the single-job detail fetch pre-offer, to keep
that logic in one place. Once a `job_assignments` row exists, RLS grants
the assigned provider (and the job owner, the other way) real direct
table access, including exact location/phone — that's a deliberate,
narrow RLS addition (0011, 0016), not a function, because full access is
exactly correct at that point.

**Multi-table writes are atomic RPCs, not sequential client inserts** —
`create_farm_job`, `submit_job_offer`, `accept_job_offer` (0014). The
latter two are `SECURITY DEFINER` because submitting/accepting needs to
flip `farm_jobs.status`, which belongs to the *other* party; each
re-checks authorization internally before writing (see the migration's
comments). `create_farm_job` is plain `SECURITY INVOKER` — inserting
your own data needs no elevation, just atomicity.

**Job creation** (`src/features/jobs/components/create-job-wizard.tsx`)
is a client-only multi-step wizard — all draft state lives in local
React state and nothing is written to the database until the final
"Post Job" submit calls `create_farm_job`. There's no persisted
`draft` row for an abandoned wizard; the client state *is* the draft for
this phase.

**Location capture** uses the browser Geolocation API only (`"Use my
current location"`, in both the job wizard and the provider profile
form) — no geocoding/maps dependency. If a user skips it, the relevant
`geography` column stays null and that record just doesn't participate
in distance sorting/display; nothing else breaks.

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

No matching algorithm (relevance in `discover_jobs` is plain SQL
ordering — matching service, then distance, then soonest scheduled), no
payments, no real messaging (the Notifications/Alerts nav item is an
empty placeholder page — no notifications table or delivery mechanism
exists), no worker/machine-to-assignment allocation, and no admin
functionality. Auth (Phase 2), the marketplace database foundation
(Phase 3A), and the first farmer↔provider job loop (Phase 3B) exist —
see "Auth and user identity", "Marketplace data model", and "Marketplace
UI" above. These remaining items are scoped to future phases and should
not be anticipated speculatively in this codebase.
