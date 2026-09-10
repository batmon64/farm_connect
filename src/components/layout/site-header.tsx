import Link from "next/link";
import { Sprout, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getHeaderAuthState } from "@/features/auth/session-status";
import { LogoutButton } from "@/features/auth/components/logout-button";

const NAV_LINKS = [
  { href: "/farmer", label: "I need work done" },
  { href: "/provider", label: "I provide services" },
];

export async function SiteHeader() {
  const auth = await getHeaderAuthState();
  const accountHref = auth.authenticated
    ? auth.onboardingCompleted
      ? "/app"
      : "/onboarding"
    : null;

  return (
    <header className="border-border/60 bg-background/95 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Sprout className="text-primary size-6" aria-hidden />
          <span>FarmConnect</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Button key={link.href} asChild variant="ghost">
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
          {auth.authenticated ? (
            <>
              <Button asChild variant="ghost">
                <Link href={accountHref!}>
                  {auth.onboardingCompleted ? "Dashboard" : "Finish setup"}
                </Link>
              </Button>
              <LogoutButton variant="ghost" />
            </>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </nav>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Sprout className="text-primary size-5" aria-hidden />
                  FarmConnect
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {NAV_LINKS.map((link) => (
                  <Button key={link.href} asChild variant="ghost" className="justify-start">
                    <Link href={link.href}>{link.label}</Link>
                  </Button>
                ))}
                {auth.authenticated ? (
                  <>
                    <Button asChild variant="ghost" className="justify-start">
                      <Link href={accountHref!}>
                        {auth.onboardingCompleted ? "Dashboard" : "Finish setup"}
                      </Link>
                    </Button>
                    <div className="px-0 pt-1">
                      <LogoutButton variant="ghost" />
                    </div>
                  </>
                ) : (
                  <>
                    <Button asChild variant="ghost" className="justify-start">
                      <Link href="/login">Log in</Link>
                    </Button>
                    <Button asChild variant="ghost" className="justify-start">
                      <Link href="/signup">Sign up</Link>
                    </Button>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
