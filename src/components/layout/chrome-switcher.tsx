"use client";

import { usePathname } from "next/navigation";

/**
 * Decides marketing vs. /app chrome on every render, including
 * client-side navigations. A Server Component reading the current path
 * (e.g. via a proxy-injected request header) only re-evaluates on a full
 * page load — the App Router reuses the already-rendered root layout
 * across client-side transitions, so a server-side check left stale
 * chrome on screen after any redirect into or out of /app (e.g. the
 * onboarding-complete redirect landing on /app while still wrapped in
 * the public header/footer/mobile tab bar). usePathname() is reactive to
 * client-side navigation, so this switches correctly every time.
 */
export function ChromeSwitcher({
  header,
  footer,
  mobileTabBar,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  mobileTabBar: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const inApp = pathname.startsWith("/app");

  if (inApp) return <>{children}</>;

  return (
    <>
      {header}
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      {footer}
      {mobileTabBar}
    </>
  );
}
