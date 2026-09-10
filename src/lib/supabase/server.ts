import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/**
 * Supabase client for use in Server Components, Server Actions, and Route
 * Handlers. Reads/writes the user's session via cookies. Still scoped by
 * RLS through the anon key — this is not the service-role client.
 *
 * Server Components can't set cookies, so the `setAll` call below is
 * wrapped in a try/catch: it no-ops there and relies on middleware to keep
 * the session cookie refreshed.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — safe to ignore.
        }
      },
    },
  });
}
