import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/features/auth/components/auth-shell";

export const metadata: Metadata = { title: "Link expired — FarmConnect" };

export default function AuthErrorPage() {
  return (
    <AuthShell
      eyebrow="Link expired"
      title="This link is invalid or has expired"
      description="Verification and password reset links can only be used once and expire after a while."
    >
      <div className="flex flex-col gap-2">
        <Button asChild>
          <Link href="/forgot-password">Request a new reset link</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Back to login</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
