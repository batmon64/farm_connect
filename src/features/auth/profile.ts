import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Profile } from "@/types/profile";

/**
 * Uses getUser() rather than getSession() — it revalidates the JWT against
 * the Supabase Auth server instead of trusting the (spoofable) cookie, per
 * Supabase's SSR guidance. This is the right choice for server-side
 * access checks; it's an extra network round trip, so avoid calling it
 * more than once per request.
 */
export async function getCurrentProfile(
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
}

export function destinationForProfile(profile: Profile | null): "/onboarding" | "/app" {
  return profile?.onboarding_completed ? "/app" : "/onboarding";
}
