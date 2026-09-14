import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { SupabaseConfigNotice } from "@/features/auth/components/supabase-config-notice";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Reset password — FarmConnect" };

export default async function ResetPasswordPage() {
  const configured = env.isSupabaseConfiguredPublic();

  if (!configured) {
    return (
      <AuthShell eyebrow="Reset password" title="Reset password">
        <SupabaseConfigNotice />
      </AuthShell>
    );
  }

  // Reaching this page with a valid session means the link from
  // /auth/confirm (type=recovery) already verified successfully.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthShell
        eyebrow="Reset password"
        title="Reset link invalid or expired"
        description="Password reset links only work once and expire after a while."
      >
        <Button asChild>
          <Link href="/forgot-password">Request a new reset link</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Reset password"
      title="Set a new password"
      description="Choose a new password for your account."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
