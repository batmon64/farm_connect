# FarmConnect

A real-time agricultural services marketplace connecting farmers with
workers, machinery, and agricultural services on demand. Currently in
foundational setup — see [ARCHITECTURE.md](./ARCHITECTURE.md) for project
conventions.

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

The app renders without a configured Supabase project — the Supabase
client isn't called anywhere yet in this phase. It's required starting
from the phase that adds authentication.

## Scripts

- `npm run dev` — start the dev server (Turbopack).
- `npm run build` — production build.
- `npm run start` — run the production build.
- `npm run lint` — lint the codebase.

## Learn more

See [ARCHITECTURE.md](./ARCHITECTURE.md) for project structure, where
different kinds of code belong, and naming conventions.
