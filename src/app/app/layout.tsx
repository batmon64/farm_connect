import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { getCurrentProfile } from "@/features/auth/profile";
import { SupabaseConfigNotice } from "@/features/auth/components/supabase-config-notice";
import { AppShell } from "@/features/marketplace/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!env.isSupabaseConfiguredPublic()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-12">
        <SupabaseConfigNotice />
      </div>
    );
  }

  const supabase = await createClient();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user) redirect("/login?next=/app");
  if (!profile?.onboarding_completed) redirect("/onboarding");

  return (
    <AppShell isFarmer={profile.is_farmer} isProvider={profile.is_provider}>
      {children}
    </AppShell>
  );
}
