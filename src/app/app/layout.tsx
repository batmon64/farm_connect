import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { getCurrentProfile } from "@/features/auth/profile";
import { SupabaseConfigNotice } from "@/features/auth/components/supabase-config-notice";

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

  return <div className="mx-auto w-full max-w-2xl px-4 py-8">{children}</div>;
}
