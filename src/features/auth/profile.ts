import { cache } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Profile } from "@/types/profile";

/**
 * Uses getUser() rather than getSession() — it revalidates the JWT against
 * the Supabase Auth server instead of trusting the (spoofable) cookie, per
 * Supabase's SSR guidance. This is the right choice for server-side
 * access checks. Wrapped in React's cache() so the layout and page(s)
 * rendering the same request share one result instead of each paying
 * the extra round trip.
 */
export const getCurrentProfile = cache(async function getCurrentProfile(
  supabase: SupabaseClient
): Promise<{ user: User | null; profile: Profile | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: profile as Profile | null };
});

export function destinationForProfile(profile: Profile | null): "/onboarding" | "/app" {
  return profile?.onboarding_completed ? "/app" : "/onboarding";
}
