import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { getCurrentProfile } from "./profile";

export type HeaderAuthState =
  | { authenticated: false }
  | { authenticated: true; displayName: string | null; onboardingCompleted: boolean };

/**
 * Used by SiteHeader, which renders on every page including the public
 * marketing routes. Must never throw: missing config or a Supabase network
 * error both just fall back to the logged-out header, so a Supabase
 * problem can never take down page rendering.
 */
export async function getHeaderAuthState(): Promise<HeaderAuthState> {
  if (!env.isSupabaseConfiguredPublic()) return { authenticated: false };

  try {
    const supabase = await createClient();
    const { user, profile } = await getCurrentProfile(supabase);
    if (!user) return { authenticated: false };

    return {
      authenticated: true,
      displayName: profile?.display_name ?? null,
      onboardingCompleted: Boolean(profile?.onboarding_completed),
    };
  } catch {
    return { authenticated: false };
  }
}
