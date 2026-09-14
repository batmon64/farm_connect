import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { getCurrentProfile } from "@/features/auth/profile";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { SupabaseConfigNotice } from "@/features/auth/components/supabase-config-notice";
import { OnboardingForm } from "@/features/auth/components/onboarding-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Set up your account — FarmConnect" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  if (!env.isSupabaseConfiguredPublic()) {
    return (
      <AuthShell eyebrow="Set up your account" title="Set up your account">
        <SupabaseConfigNotice />
      </AuthShell>
    );
  }

  const supabase = await createClient();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user) redirect("/login?next=/onboarding");
  if (profile?.onboarding_completed) redirect("/app");

  const { verified } = await searchParams;

  return (
    <AuthShell
      eyebrow="Almost there"
      title="Set up your account"
      description="Tell us a bit about how you'll use FarmConnect."
    >
      {verified === "1" ? (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertDescription>Your email is verified.</AlertDescription>
        </Alert>
      ) : null}
      <OnboardingForm defaultDisplayName={profile?.display_name ?? ""} />
    </AuthShell>
  );
}
