"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Briefcase,
  Bell,
  User,
  Search,
  FileText,
  Wrench,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FARMER_NAV = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/jobs", label: "Jobs", icon: Briefcase },
  { href: "/app/notifications", label: "Alerts", icon: Bell },
  { href: "/app/profile", label: "Profile", icon: User },
];

const PROVIDER_NAV = [
  { href: "/app/provider/jobs", label: "Jobs", icon: Search },
  { href: "/app/provider/offers", label: "My Offers", icon: FileText },
  { href: "/app/provider", label: "Work", icon: Wrench },
  { href: "/app/provider/profile", label: "Profile", icon: User },
];

export function AppShell({
  isFarmer,
  isProvider,
  unreadCount = 0,
  children,
}: {
  isFarmer: boolean;
  isProvider: boolean;
  unreadCount?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const inProvider = pathname.startsWith("/app/provider");
  const nav = inProvider ? PROVIDER_NAV : FARMER_NAV;
  const canSwitch = isFarmer && isProvider;

  return (
    <div className="flex min-h-full flex-col">
      {canSwitch ? (
        <div className="border-border/60 bg-muted/40 border-b">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-2 text-sm">
            <span className="text-muted-foreground">
              {inProvider ? "Providing services" : "Finding services"}
            </span>
            <Link
              href={inProvider ? "/app" : "/app/provider"}
              className="text-foreground inline-flex items-center gap-1.5 font-medium underline underline-offset-4"
            >
              <ArrowLeftRight className="size-3.5" aria-hidden />
              {inProvider ? "Find Services" : "Provide Services"}
            </Link>
          </div>
        </div>
      ) : null}

      <nav
        className="border-border/60 bg-background sticky top-0 z-30 hidden border-b md:block"
        aria-label="Primary"
      >
        <div className="mx-auto flex max-w-3xl items-center gap-1 px-4 py-2">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = href === "/app" || href === "/app/provider"
              ? pathname === href
              : pathname.startsWith(href);
            const showBadge = Icon === Bell && unreadCount > 0;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="relative">
                  <Icon className="size-4" aria-hidden />
                  {showBadge ? (
                    <span
                      className="bg-destructive absolute -right-1.5 -top-1.5 flex size-3.5 items-center justify-center rounded-full text-[9px] font-semibold text-white"
                      aria-hidden
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : null}
                </span>
                {label}
                {showBadge ? <span className="sr-only">({unreadCount} unread)</span> : null}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-6 md:pb-10">
        {children}
      </main>

      <nav
        className="bg-background/95 border-border/60 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur md:hidden"
        aria-label="Primary"
      >
        <div className="mx-auto flex max-w-3xl items-stretch justify-around">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = href === "/app" || href === "/app/provider"
              ? pathname === href
              : pathname.startsWith(href);
            const showBadge = Icon === Bell && unreadCount > 0;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <span className="relative">
                  <Icon className="size-5" aria-hidden />
                  {showBadge ? (
                    <span
                      className="bg-destructive absolute -right-1.5 -top-1.5 flex size-3.5 items-center justify-center rounded-full text-[9px] font-semibold text-white"
                      aria-hidden
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : null}
                </span>
                {label}
                {showBadge ? <span className="sr-only">({unreadCount} unread)</span> : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
