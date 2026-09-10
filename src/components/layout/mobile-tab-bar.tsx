import Link from "next/link";
import { Home, Sprout, Wrench } from "lucide-react";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/farmer", label: "Find Help", icon: Sprout },
  { href: "/provider", label: "Provide Work", icon: Wrench },
];

/**
 * Fixed bottom tab bar for small screens. Hidden at the md breakpoint,
 * where SiteHeader's inline nav takes over.
 */
export function MobileTabBar() {
  return (
    <nav
      className="bg-background/95 border-border/60 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur md:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-6xl items-stretch justify-around">
        {TABS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="text-muted-foreground hover:text-foreground flex flex-1 flex-col items-center gap-1 py-2 text-xs"
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
