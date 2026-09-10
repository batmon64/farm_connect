import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/**
 * Landing point for Supabase auth emails (signup confirmation, password
 * recovery). Verifies the token server-side via verifyOtp — this is the
 * token_hash flow, not the older implicit hash-fragment flow, so it works
 * even when the link is opened by an email client's link scanner and
 * establishes the session cookie correctly for @supabase/ssr.
 *
 * Requires the Supabase email templates to link here — see
 * ARCHITECTURE.md "Auth" section for the exact template URLs.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (env.isSupabaseConfiguredPublic() && tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      redirect(next);
    }
  }

  redirect("/auth/error");
}
