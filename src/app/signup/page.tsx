import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { getCurrentProfile, destinationForProfile } from "@/features/auth/profile";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { SupabaseConfigNotice } from "@/features/auth/components/supabase-config-notice";
import { SignUpForm } from "@/features/auth/components/signup-form";

export const metadata: Metadata = { title: "Sign up — FarmConnect" };

export default async function SignUpPage() {
  const configured = env.isSupabaseConfiguredPublic();

  if (configured) {
    const supabase = await createClient();
    const { user, profile } = await getCurrentProfile(supabase);
    if (user) redirect(destinationForProfile(profile));
  }

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your account"
      description="Join FarmConnect to find work or find help."
    >
      {configured ? <SignUpForm /> : <SupabaseConfigNotice />}
    </AuthShell>
  );
}
