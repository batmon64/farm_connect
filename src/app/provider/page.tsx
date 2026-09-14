import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Tag, CalendarDays, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JourneyLadder, VignetteCard, VignetteRow } from "@/components/marketing/journey-ladder";

export const metadata: Metadata = { title: "For providers — FarmConnect" };

const REP_STAGES = [
  {
    title: "New",
    description:
      "Your profile is verified and visible. Send offers and complete your first jobs to start building a record.",
    dots: 1,
  },
  {
    title: "Building",
    description:
      "A handful of completed jobs and reviews start showing on your profile, giving farmers more to go on.",
    dots: 3,
  },
  {
    title: "Established",
    description:
      "A consistent track record of completed work and reviews makes your offers stand out in comparisons.",
    dots: 5,
  },
];

export default function ProviderPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="mx-auto w-full max-w-3xl px-4 py-16 text-center md:py-24">
        <p className="text-muted-foreground mb-4 flex items-center justify-center gap-2 font-mono text-[11.5px] tracking-[0.16em] uppercase">
          <span className="bg-primary inline-block size-[5px] rounded-full" />
          For providers
        </p>
        <h1 className="font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-5xl">
          List what you offer. Find nearby jobs. Get confirmed.
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-[52ch] text-lg leading-relaxed">
          FarmConnect helps you reach farmers near you who need labour, machinery or
          agricultural services — you choose which jobs to quote on and at what
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
                title: "Discover jobs",
                description:
                  "Browse local work that matches your services, your trade and how far you're willing to travel.",
                bullets: [
                  "Filter by category and distance",
                  "See full job details up front",
                  "New listings as farmers post them",
                ],
                vignette: (
                  <VignetteCard eyebrow="Nearby jobs">
                    <VignetteRow label="Fence repair" value="12 km" />
                    <VignetteRow label="Field drainage" value="18 km" />
                    <VignetteRow label="Hedge trimming" value="6 km" />
                  </VignetteCard>
                ),
              },
              {
                title: "Review the details",
                description:
                  "Every job lists scope, site and timing up front, so you can quote accurately without a back-and-forth first.",
                bullets: [
                  "Structured job details, not vague posts",
                  "Photos included where relevant",
                  "See budget range before you quote",
                ],
                vignette: (
                  <VignetteCard eyebrow="Job details">
                    <VignetteRow label="Category" value="Fencing" />
                    <VignetteRow label="Scope" value="Fixed" />
                    <VignetteRow label="Budget" value="$1,000–1,500" />
                  </VignetteCard>
                ),
              },
              {
                title: "Send an offer",
                description:
                  "Quote with clear terms: scope, price, start date and what the job includes. The farmer sees it in the same structured format as every other offer.",
                bullets: [
                  "Set your own price and availability",
                  "Add a short message with your quote",
                  "Withdraw or edit before it's accepted",
                ],
                vignette: (
                  <VignetteCard eyebrow="Your offer">
                    <VignetteRow label="Price" value="$1,240" />
                    <VignetteRow label="Start date" value="Monday" />
                    <VignetteRow label="Status" value="Sent" />
                  </VignetteCard>
                ),
              },
              {
                title: "Complete the work",
                description:
                  "Once the farmer confirms your offer, contact details unlock. Do the work, mark it complete, and let it strengthen your record.",
                bullets: [
                  "Contact details unlock on confirmation",
                  "Mark the job complete when finished",
                  "Completed jobs build your profile",
                ],
                vignette: (
                  <VignetteCard eyebrow="Job status">
                    <VignetteRow label="Farmer" value="Contact unlocked" />
                    <VignetteRow label="Status" value="Complete" />
                    <VignetteRow label="Review" value="Requested" />
                  </VignetteCard>
                ),
              },
            ]}
          />
        </div>
      </section>

      {/* Transparency band */}
      <section className="bg-fc-ink py-20 md:py-28">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="mx-auto max-w-[60ch] text-center">
            <p className="mb-4 flex items-center justify-center gap-2 font-mono text-[11.5px] tracking-[0.16em] text-white/64 uppercase">
              <span className="inline-block size-[5px] rounded-full bg-white/64" />
              Transparent by design
            </p>
            <h2 className="font-heading text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Everything you need to quote with confidence.
            </h2>
          </div>

          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              {
                icon: Tag,
                title: "Pricing",
                description:
                  "Every job shows a budget range up front, so you're never quoting blind or guessing what a farmer can pay.",
              },
              {
                icon: CalendarDays,
                title: "Availability",
                description:
                  "Set your own availability and only see jobs whose timing you can actually meet.",
              },
              {
                icon: Star,
                title: "Reputation",
                description:
                  "Completed jobs and reviews build a visible track record that farmers can see when comparing offers.",
              },
            ].map(({ icon: Icon, title, description }, i) => (
              <div
                key={title}
                className={
                  i > 0
                    ? "border-t border-white/12 px-0 pt-8 md:border-t-0 md:border-l md:px-11 md:pt-0"
                    : ""
                }
              >
                <Icon className="mb-5 size-[30px] text-white" aria-hidden />
                <h3 className="font-heading mb-2.5 text-xl font-semibold text-white">
                  {title}
                </h3>
                <p className="text-[15px] leading-relaxed text-white/64">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reputation stages */}
      <section className="border-border border-t py-20 md:py-28">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="mx-auto max-w-[60ch] text-center">
            <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
              Your record grows with every job
            </h2>
          </div>

          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {REP_STAGES.map(({ title, description, dots }, i) => (
              <div
                key={title}
                className={
                  i > 0
                    ? "border-border border-t px-0 pt-8 md:border-t-0 md:border-l md:px-11 md:pt-0"
                    : ""
                }
              >
                <div className="mb-5 flex gap-1.5" aria-hidden>
                  {Array.from({ length: 5 }).map((_, dot) => (
                    <span
                      key={dot}
                      className={`h-1.5 w-6 rounded-full ${
                        dot < dots ? "bg-primary" : "bg-fc-surface-3"
                      }`}
                    />
                  ))}
                </div>
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
              Ready to find your next job?
            </h2>
            <p className="mx-auto mt-4 max-w-[46ch] text-lg text-white/86">
              Create your profile and start browsing local work that matches what you
              offer.
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
