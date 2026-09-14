import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ChromeSwitcher } from "@/components/layout/chrome-switcher";

// Design system: Bricolage Grotesque for headings/display, Inter for body —
// see globals.css for the rest of the FarmConnect token set (color, radius,
// spacing) this pairs with.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "FarmConnect",
  description:
    "FarmConnect connects farmers with agricultural workers, machinery, and services on demand.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // /app/** builds its own chrome (AppShell) with role-aware navigation —
  // the marketing header/footer/mobile-nav would just double up there.
  // ChromeSwitcher decides which to show client-side (usePathname), since
  // a server-side pathname check only re-evaluates on a full page load —
  // the App Router reuses this root layout across client-side
  // navigations, so a server check left stale chrome on screen after any
  // redirect into or out of /app (e.g. straight after onboarding).
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ChromeSwitcher header={<SiteHeader />} footer={<SiteFooter />}>
          {children}
        </ChromeSwitcher>
      </body>
    </html>
  );
}
