"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid,
  Briefcase,
  Handshake,
  Search,
  Bell,
  User,
  Menu,
  Plus,
  ArrowLeftRight,
  Sprout,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: boolean };

const FARMER_PRIMARY: NavItem[] = [
  { href: "/app", label: "Overview", icon: LayoutGrid },
  { href: "/app/jobs", label: "My Jobs", icon: Briefcase },
];
const FARMER_MORE: NavItem[] = [
  { href: "/app/notifications", label: "Activity", icon: Bell, badge: true },
  { href: "/app/profile", label: "Profile", icon: User },
];
const FARMER_CTA = { href: "/app/jobs/new", label: "Post a Job" };

const PROVIDER_PRIMARY: NavItem[] = [
  { href: "/app/provider", label: "Overview", icon: LayoutGrid },
  { href: "/app/provider/jobs", label: "Find Work", icon: Search },
  { href: "/app/provider/offers", label: "My Offers", icon: Handshake },
];
const PROVIDER_MORE: NavItem[] = [
  { href: "/app/notifications", label: "Activity", icon: Bell, badge: true },
  { href: "/app/provider/profile", label: "Profile", icon: User },
];
const PROVIDER_CTA = { href: "/app/provider/jobs", label: "Find Work" };

function isActive(pathname: string, href: string) {
  return href === "/app" || href === "/app/provider" ? pathname === href : pathname.startsWith(href);
}

function NavLink({
  item,
  active,
  unreadCount,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  unreadCount: number;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const showBadge = item.badge && unreadCount > 0;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-fc-surface-2"
      )}
    >
      <Icon className="size-4.5 shrink-0" aria-hidden />
      <span className="flex-1">{item.label}</span>
      {showBadge ? (
        <span className="bg-fc-ink flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-mono text-[10px] text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}

function SidebarContent({
  primary,
  more,
  cta,
  unreadCount,
  displayName,
  location,
  onNavigate,
}: {
  primary: NavItem[];
  more: NavItem[];
  cta: { href: string; label: string };
  unreadCount: number;
  displayName: string;
  location: string | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const initials = initialsFor(displayName);

  return (
    <div className="flex h-full flex-col gap-6 px-4 py-5">
      <Link href="/" className="font-heading flex items-center gap-2.5 px-2 text-lg font-semibold">
        <Sprout className="text-primary size-[22px]" aria-hidden />
        FarmConnect
      </Link>

      <Button asChild className="w-full justify-center">
        <Link href={cta.href} onClick={onNavigate}>
          <Plus className="size-4" aria-hidden />
          {cta.label}
        </Link>
      </Button>

      <nav className="flex flex-col gap-1">
        {primary.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            unreadCount={unreadCount}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <nav className="flex flex-col gap-1">
        <span className="text-muted-foreground px-3 pb-1 font-mono text-[10.5px] tracking-[0.14em] uppercase">
          More
        </span>
        {more.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            unreadCount={unreadCount}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="border-border bg-fc-surface-2 mt-auto flex items-center gap-2.5 rounded-lg border p-3">
        <span className="bg-fc-ink flex size-9 shrink-0 items-center justify-center rounded-full font-mono text-xs text-white">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{displayName || "Your account"}</p>
          {location ? <p className="text-muted-foreground truncate text-xs">{location}</p> : null}
        </div>
      </div>
    </div>
  );
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase();
}

export function AppShell({
  isFarmer,
  isProvider,
  unreadCount = 0,
  displayName = "",
  location = null,
  children,
}: {
  isFarmer: boolean;
  isProvider: boolean;
  unreadCount?: number;
  displayName?: string;
  location?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // A provider-only account has nowhere else to go, so it always gets
  // the provider nav — including on shared routes like /app/notifications
  // that aren't under /app/provider. Dual-role and farmer-only accounts
  // keep the previous path-based switch.
  const inProvider = isProvider && (!isFarmer || pathname.startsWith("/app/provider"));
  const primary = inProvider ? PROVIDER_PRIMARY : FARMER_PRIMARY;
  const more = inProvider ? PROVIDER_MORE : FARMER_MORE;
  const cta = inProvider ? PROVIDER_CTA : FARMER_CTA;
  const canSwitch = isFarmer && isProvider;
  const allNav = [...primary, ...more];

  return (
    <div className="bg-background flex min-h-dvh">
      <aside className="border-border bg-card sticky top-0 hidden h-dvh w-64 shrink-0 border-r md:block">
        <SidebarContent
          primary={primary}
          more={more}
          cta={cta}
          unreadCount={unreadCount}
          displayName={displayName}
          location={location}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {canSwitch ? (
          <div className="border-border bg-fc-surface-2 border-b">
            <div className="flex items-center justify-between gap-3 px-4 py-2 text-sm md:px-6">
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

        <header className="border-border bg-background/88 sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur-md md:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <SidebarContent
                primary={primary}
                more={more}
                cta={cta}
                unreadCount={unreadCount}
                displayName={displayName}
                location={location}
              />
            </SheetContent>
          </Sheet>

          <Link href="/" className="font-heading flex items-center gap-2 text-base font-semibold md:hidden">
            <Sprout className="text-primary size-5" aria-hidden />
            FarmConnect
          </Link>

          <div className="flex-1" />

          <Button asChild variant="outline" size="icon" className="relative" aria-label="Notifications">
            <Link href="/app/notifications">
              <Bell className="size-4.5" aria-hidden />
              {unreadCount > 0 ? (
                <span className="bg-fc-ink text-fc-ink-foreground absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full font-mono text-[9px]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </Link>
          </Button>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 md:px-6 md:pb-10">{children}</main>

        <nav
          className="bg-background/95 border-border fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur md:hidden"
          aria-label="Primary"
        >
          <div className="flex items-stretch justify-around">
            {allNav.slice(0, 5).map(({ href, label, icon: Icon, badge }) => {
              const active = isActive(pathname, href);
              const showBadge = badge && unreadCount > 0;
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
                        className="bg-fc-ink absolute -right-1.5 -top-1.5 flex size-3.5 items-center justify-center rounded-full text-[9px] font-semibold text-white"
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
    </div>
  );
}
