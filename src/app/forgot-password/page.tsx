import type { Metadata } from "next";
import { env } from "@/lib/env";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { SupabaseConfigNotice } from "@/features/auth/components/supabase-config-notice";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password — FarmConnect" };

export default function ForgotPasswordPage() {
  const configured = env.isSupabaseConfiguredPublic();

  return (
    <AuthShell
      eyebrow="Reset password"
      title="Forgot your password?"
      description="Enter your email and we'll send you a reset link."
    >
      {configured ? <ForgotPasswordForm /> : <SupabaseConfigNotice />}
    </AuthShell>
  );
}
