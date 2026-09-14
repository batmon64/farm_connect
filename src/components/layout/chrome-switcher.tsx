"use client";

import { usePathname } from "next/navigation";

const AUTH_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/onboarding",
];

/**
 * Decides marketing vs. /app vs. auth chrome on every render, including
 * client-side navigations. A Server Component reading the current path
 * (e.g. via a proxy-injected request header) only re-evaluates on a full
 * page load — the App Router reuses the already-rendered root layout
 * across client-side transitions, so a server-side check left stale
 * chrome on screen after any redirect into or out of /app (e.g. the
 * onboarding-complete redirect landing on /app while still wrapped in
 * the public header/footer/mobile tab bar). usePathname() is reactive to
 * client-side navigation, so this switches correctly every time.
 *
 * Auth routes (/login, /signup, /forgot-password, /reset-password,
 * /auth/*, /onboarding) build their own full-bleed two-column shell via
 * AuthShell, which already includes its own home link — the marketing
 * header/footer would just double up there.
 */
export function ChromeSwitcher({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const inApp = pathname.startsWith("/app");
  const inAuth = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (inApp || inAuth) return <>{children}</>;

  return (
    <>
      {header}
      <main className="flex-1">{children}</main>
      {footer}
    </>
  );
}
