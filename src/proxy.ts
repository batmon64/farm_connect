import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

/**
 * Scoped to routes that actually touch Supabase (auth + the protected app
 * + onboarding). The public marketing pages (/, /farmer, /provider) are
 * deliberately excluded so they never depend on Supabase being
 * configured — see ARCHITECTURE.md "Supabase access".
 */
export const config = {
  matcher: [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/auth/:path*",
    "/onboarding",
    "/app/:path*",
  ],
};
