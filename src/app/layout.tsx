import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FarmConnect",
  description:
    "FarmConnect connects farmers with agricultural workers, machinery, and services on demand.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // /app/** builds its own chrome (AppShell) with role-aware navigation —
  // the marketing header/footer/mobile-nav would just double up there.
  // Server Components have no usePathname(); src/proxy.ts forwards the
  // path via a response header for exactly this.
  const pathname = (await headers()).get("x-pathname") ?? "";
  const inApp = pathname.startsWith("/app");

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        {inApp ? (
          children
        ) : (
          <>
            <SiteHeader />
            <main className="flex-1 pb-16 md:pb-0">{children}</main>
            <SiteFooter />
            <MobileTabBar />
          </>
        )}
      </body>
    </html>
  );
}
