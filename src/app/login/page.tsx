import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { getCurrentProfile, destinationForProfile } from "@/features/auth/profile";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { SupabaseConfigNotice } from "@/features/auth/components/supabase-config-notice";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Log in — FarmConnect" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const configured = env.isSupabaseConfiguredPublic();

  if (configured) {
    const supabase = await createClient();
    const { user, profile } = await getCurrentProfile(supabase);
    if (user) redirect(destinationForProfile(profile));
  }

  const { reset } = await searchParams;
  const notice = reset === "success" ? "Password updated. Log in with your new password." : undefined;

  return (
    <AuthShell title="Log in" description="Welcome back to FarmConnect.">
      {configured ? <LoginForm notice={notice} /> : <SupabaseConfigNotice />}
    </AuthShell>
  );
}
