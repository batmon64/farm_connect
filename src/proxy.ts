import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  // Lets the root layout know when it's inside /app/** so it can skip the
  // marketing header/footer/mobile-nav there in favor of AppShell's own —
  // Server Components have no usePathname() equivalent, so this is the
  // standard way to pass the current path down to one.
  response.headers.set("x-pathname", request.nextUrl.pathname);
  return response;
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
