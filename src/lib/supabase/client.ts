import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Supabase client for use in Client Components ("use client").
 * Uses the public anon key only — safe to call from the browser.
 */
export function createClient() {
  return createBrowserClient(env.supabaseUrl(), env.supabaseAnonKey());
}
