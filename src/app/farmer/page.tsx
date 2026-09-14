import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, CalendarClock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JourneyLadder, VignetteCard, VignetteRow } from "@/components/marketing/journey-ladder";

export const metadata: Metadata = { title: "For farmers — FarmConnect" };

export default function FarmerPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="mx-auto w-full max-w-3xl px-4 py-16 text-center md:py-24">
        <p className="text-muted-foreground mb-4 flex items-center justify-center gap-2 font-mono text-[11.5px] tracking-[0.16em] uppercase">
          <span className="bg-primary inline-block size-[5px] rounded-full" />
          For farmers
        </p>
        <h1 className="font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-5xl">
          Post a job. Compare offers. Confirm who does the work.
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-[52ch] text-lg leading-relaxed">
          FarmConnect connects you with nearby workers, machinery and agricultural
          service providers — you stay in control of who you work with and at what
          price.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="h-12 px-6">
            <Link href="/signup">Create your account</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 px-6">
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </section>

      {/* Journey ladder */}
      <section className="border-border border-t py-16 md:py-20">
        <div className="mx-auto w-full max-w-5xl px-4">
          <div className="mx-auto mb-4 max-w-[60ch] text-center">
            <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
              How it works, step by step
            </h2>
          </div>

          <JourneyLadder
            rungs={[
              {
                title: "Post the job",
                description:
                  "Describe the work, the site and your timing. Add photos so providers can quote accurately, without back-and-forth.",
                bullets: [
                  "Set your own budget range",
                  "Choose fixed-scope or ongoing work",
                  "Edit or close the listing any time",
                ],
                vignette: (
                  <VignetteCard eyebrow="Job details">
                    <VignetteRow label="Category" value="Fencing" />
                    <VignetteRow label="Scope" value="Fixed" />
                    <VignetteRow label="Site" value="12 km away" />
                    <VignetteRow label="Timing" value="This week" />
                  </VignetteCard>
                ),
              },
              {
                title: "Receive offers",
                description:
                  "Verified providers send structured offers with scope, price and availability — every offer in the same format, so nothing is left vague.",
                bullets: [
                  "Only verified providers can respond",
                  "Ask questions before deciding",
                  "No obligation until you confirm",
                ],
                vignette: (
                  <VignetteCard eyebrow="Offers received">
                    <VignetteRow label="Hartwell Contracting" value="$1,240" />
                    <VignetteRow label="Rideout Farm Services" value="$1,410" />
                    <VignetteRow label="Greenline Ag Crew" value="$1,180" />
                  </VignetteCard>
                ),
              },
              {
                title: "Compare and choose",
                description:
                  "Line offers up side by side — price, availability and scope — and pick the one that fits, on your own terms.",
                bullets: [
                  "Compare structured offers directly",
                  "No pressure to respond immediately",
                  "You choose who gets hired",
                ],
                vignette: (
                  <VignetteCard eyebrow="Comparing 2 offers">
                    <VignetteRow label="Price" value="$1,240 vs $1,410" />
                    <VignetteRow label="Start date" value="Mon vs Wed" />
                    <VignetteRow label="Scope" value="Full vs Partial" />
                  </VignetteCard>
                ),
              },
              {
                title: "Get the work done",
                description:
                  "Once you confirm a provider, contact details unlock for both sides. Track the job through to completion from your dashboard.",
                bullets: [
                  "Contact details unlock on confirmation",
                  "Track progress from your dashboard",
                  "Mark the job complete when it's done",
                ],
                vignette: (
                  <VignetteCard eyebrow="Job status">
                    <VignetteRow label="Provider" value="Hartwell Contracting" />
                    <VignetteRow label="Status" value="Hired" />
                    <VignetteRow label="Contact" value="Unlocked" />
                  </VignetteCard>
                ),
              },
            ]}
          />
        </div>
      </section>

      {/* Privacy band */}
      <section className="bg-fc-ink py-20 md:py-28">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="mx-auto max-w-[64ch] text-center">
            <p className="mb-4 flex items-center justify-center gap-2 font-mono text-[11.5px] tracking-[0.16em] text-white/64 uppercase">
              <span className="inline-block size-[5px] rounded-full bg-white/64" />
              Privacy by default
            </p>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Your contact details stay private until you decide otherwise.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-6">
              <span className="mb-4 block font-mono text-[10.5px] tracking-[0.16em] text-white/50 uppercase">
                Before you confirm
              </span>
              <div className="flex flex-col gap-2.5 text-sm">
                <div className="flex items-baseline justify-between gap-4 border-b border-white/10 py-2.5 text-white/80">
                  <span className="text-white/50">Phone</span>
                  <span className="font-mono text-xs">••• •• ••42</span>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-b border-white/10 py-2.5 text-white/80">
                  <span className="text-white/50">Location</span>
                  <span className="font-mono text-xs">~12 km away</span>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-2.5 text-white/80">
                  <span className="text-white/50">Full name</span>
                  <span className="font-mono text-xs">Provider #114</span>
                </div>
              </div>
            </div>
            <div className="border-primary/40 bg-primary/10 rounded-2xl border p-6">
              <span className="text-primary-foreground/70 mb-4 block font-mono text-[10.5px] tracking-[0.16em] uppercase">
                After you confirm
              </span>
              <div className="flex flex-col gap-2.5 text-sm">
                <div className="flex items-baseline justify-between gap-4 border-b border-white/10 py-2.5 text-white">
                  <span className="text-white/60">Phone</span>
                  <span className="font-mono text-xs">Shared</span>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-b border-white/10 py-2.5 text-white">
                  <span className="text-white/60">Location</span>
                  <span className="font-mono text-xs">Shared</span>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-2.5 text-white">
                  <span className="text-white/60">Full name</span>
                  <span className="font-mono text-xs">Hartwell Contracting</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What you control */}
      <section className="border-border border-t py-20 md:py-28">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="mx-auto max-w-[60ch] text-center">
            <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
              What you control
            </h2>
          </div>

          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              {
                icon: ClipboardCheck,
                title: "Scope",
                description:
                  "Describe exactly what the job includes. Providers quote against your description, not a guess.",
              },
              {
                icon: CalendarClock,
                title: "Timing",
                description:
                  "Set when you need the work done. Close or repost the listing whenever you like.",
              },
              {
                icon: Users,
                title: "Choice",
                description:
                  "Nothing is agreed until you confirm a provider. Compare as many offers as you want first.",
              },
            ].map(({ icon: Icon, title, description }, i) => (
              <div
                key={title}
                className={
                  i > 0
                    ? "border-border border-t px-0 pt-8 md:border-t-0 md:border-l md:px-11 md:pt-0"
                    : ""
                }
              >
                <Icon className="mb-5 size-[30px]" aria-hidden />
                <h3 className="font-heading mb-2.5 text-xl font-semibold">{title}</h3>
                <p className="text-muted-foreground text-[15px] leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-border border-t py-20 md:py-28">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="bg-primary text-primary-foreground rounded-[28px] px-6 py-14 text-center shadow-[0_30px_60px_-40px_var(--primary)] md:px-16 md:py-24">
            <h2 className="font-heading mx-auto max-w-[20ch] text-3xl font-semibold text-balance md:text-4xl">
              Ready to post your first job?
            </h2>
            <p className="mx-auto mt-4 max-w-[46ch] text-lg text-white/86">
              It takes a few minutes, and offers start coming in from verified
              providers near you.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-background text-primary hover:bg-background/90 h-12 px-6"
              >
                <Link href="/signup" className="group">
                  Create your account
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
