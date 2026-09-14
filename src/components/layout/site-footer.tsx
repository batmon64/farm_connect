import Link from "next/link";
import { Sprout } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-border/60 text-muted-foreground border-t text-sm">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 py-14 sm:grid-cols-2 md:grid-cols-[1.7fr_1fr_1fr_1fr] md:py-16">
        <div className="sm:col-span-2 md:col-span-1">
          <span className="font-heading text-foreground flex items-center gap-2.5 text-lg font-semibold">
            <Sprout className="text-primary size-[22px]" aria-hidden />
            FarmConnect
          </span>
          <p className="mt-4 max-w-[32ch] text-sm">
            The marketplace for local farm work — farmers and verified providers, working
            from the same information.
          </p>
        </div>

        <nav aria-label="Product" className="flex flex-col">
          <h4 className="text-muted-foreground mb-3.5 font-mono text-[11px] font-medium tracking-[0.16em] uppercase">
            Product
          </h4>
          <Link href="/farmer" className="hover:text-foreground py-1.5 text-sm">
            For farmers
          </Link>
          <Link href="/provider" className="hover:text-foreground py-1.5 text-sm">
            For providers
          </Link>
          <Link href="/login" className="hover:text-foreground py-1.5 text-sm">
            Sign in
          </Link>
        </nav>

        <nav aria-label="Trust" className="flex flex-col">
          <h4 className="text-muted-foreground mb-3.5 font-mono text-[11px] font-medium tracking-[0.16em] uppercase">
            Trust
          </h4>
          <Link href="/farmer" className="hover:text-foreground py-1.5 text-sm">
            Verification
          </Link>
          <Link href="/provider" className="hover:text-foreground py-1.5 text-sm">
            Privacy
          </Link>
        </nav>

        <nav aria-label="Contact" className="flex flex-col">
          <h4 className="text-muted-foreground mb-3.5 font-mono text-[11px] font-medium tracking-[0.16em] uppercase">
            Contact
          </h4>
          <span className="py-1.5 font-mono text-xs">hello@farmconnect.example</span>
        </nav>
      </div>

      <div className="border-border/60 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 border-t px-4 py-5">
        <span>© {new Date().getFullYear()} FarmConnect</span>
        <span className="font-mono text-xs">
          FarmConnect is a marketplace platform. Providers are independent businesses.
        </span>
      </div>
    </footer>
  );
}
