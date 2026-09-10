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
                         (e.g. features/jobs/, features/providers/).
                         Each feature folder owns its own components,
                         hooks, server actions, and types. Created when
                         the first feature lands — doesn't exist yet.
  lib/
    supabase/           Supabase client factories (client.ts, server.ts).
                         See "Supabase access" below.
    env.ts               Typed, validated access to environment variables.
    utils.ts             Generic helpers (currently just shadcn's `cn`).
  types/                 Shared cross-feature types (e.g. generated
                          Supabase database types, once the schema exists).
```

Rule of thumb: if code is used by exactly one feature, it lives inside that
feature's folder under `src/features/`. If it's shared UI chrome or a
cross-cutting concern, it lives in `src/components/layout` or `src/lib`.
`src/components/ui` is reserved for shadcn primitives — compose them into
feature UI rather than editing them.

## Supabase access

Two entry points, matching where the code runs:

- `src/lib/supabase/client.ts` — `createClient()` for Client Components.
  Uses the public anon key. Import only from files with `"use client"`.
- `src/lib/supabase/server.ts` — `createClient()` (async) for Server
  Components, Server Actions, and Route Handlers. Also uses the anon key,
  scoped by the request's session via cookies — RLS still applies.

Neither is called anywhere yet — this phase only wires up the
configuration. There is deliberately no auth-session-refresh middleware
and no service-role client yet:

- Session-refresh middleware (`src/proxy.ts`, using `@supabase/ssr`'s
  cookie-refresh pattern) belongs with the phase that adds authentication
  — add it then, not before, since it would otherwise make every request
  depend on Supabase being configured.
- A service-role client should be added only when server-only,
  RLS-bypassing access is actually needed (e.g. an admin action or an
  Edge Function). It must read `env.supabaseServiceRoleKey()` and never be
  imported from a Client Component or any code path reachable from the
  browser bundle.

Never disable RLS to make a query "just work" — fix the policy instead.

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

No database schema, no auth flow, no job/matching logic, no
payments/messaging integration. These are scoped to future phases and
should not be anticipated speculatively in this codebase.
