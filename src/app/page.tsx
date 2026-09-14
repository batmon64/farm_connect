import Link from "next/link";
import { ArrowRight, ShieldCheck, FileText, Lock, MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlowSteps } from "@/components/marketing/flow-steps";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:gap-16 md:py-24">
        <div className="flex flex-col gap-5">
          <p className="text-muted-foreground flex items-center gap-2 font-mono text-[11.5px] tracking-[0.16em] uppercase">
            <span className="bg-primary inline-block size-[5px] rounded-full" />
            Two-sided marketplace · Local farm services
          </p>
          <h1 className="font-heading max-w-[14ch] text-4xl leading-[1.03] font-semibold tracking-tight text-balance md:text-6xl">
            Farm work, matched with providers you can trust.
          </h1>
          <p className="text-muted-foreground max-w-[52ch] text-lg leading-relaxed">
            FarmConnect connects farmers who need work done with verified local
            providers — structured offers, clear scope, and no guesswork.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 px-6">
              <Link href="/signup">Post a Job</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6">
              <Link href="/signup" className="group">
                Find Work
                <MoveRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
          <ul className="text-muted-foreground mt-6 flex flex-wrap gap-x-0 gap-y-2 font-mono text-[11px] tracking-[0.12em] uppercase">
            {["Verified providers", "Offers in writing", "Contact details private"].map(
              (item, i) => (
                <li
                  key={item}
                  className={i > 0 ? "border-border border-l px-4.5" : "pr-4.5"}
                >
                  {item}
                </li>
              )
            )}
          </ul>
        </div>

        <div className="relative hidden md:block" aria-hidden>
          <div className="bg-fc-surface-2 border-border absolute -inset-5 rounded-[calc(var(--radius-xl)+2px)] border" />
          <div className="border-border bg-card relative flex flex-col gap-5 rounded-2xl border p-7 shadow-xl shadow-black/5">
            <div className="flex items-center justify-between gap-3">
              <span className="border-border bg-card text-muted-foreground rounded-full border px-2.5 py-1 text-xs font-medium">
                Open job
              </span>
              <span className="bg-fc-ok/13 text-fc-ok rounded-full px-2.5 py-1 text-xs font-medium">
                3 offers received
              </span>
            </div>
            <div>
              <h3 className="font-heading text-xl font-semibold">
                Post-and-wire fence, 400 m
              </h3>
              <p className="text-muted-foreground mt-1.5 text-sm">
                South pasture · materials on site · needed this week
              </p>
            </div>
            <div className="border-border grid grid-cols-3 gap-4 border-y py-5">
              {[
                ["Category", "Fencing"],
                ["Scope", "Fixed"],
                ["Distance", "12 km"],
              ].map(([label, value]) => (
                <div key={label}>
                  <span className="text-muted-foreground font-mono text-[10.5px] tracking-[0.14em] uppercase">
                    {label}
                  </span>
                  <span className="mt-1 block text-sm font-medium">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="border-border bg-fc-surface-3 text-muted-foreground flex size-9.5 shrink-0 items-center justify-center rounded-full border font-mono text-xs">
                HC
              </span>
              <div className="min-w-0 flex-1">
                <strong className="block text-sm font-semibold">
                  Hartwell Contracting
                </strong>
                <span className="text-muted-foreground text-xs">
                  Fencing · 24 km · Verified provider
                </span>
              </div>
              <span className="bg-fc-ok/13 text-fc-ok rounded-full px-2.5 py-1 text-xs font-medium">
                Matched
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Two-sided marketplace */}
      <section className="border-border border-t py-20 md:py-28">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="grid items-end gap-8 md:grid-cols-[1.05fr_1fr]">
            <div>
              <p className="text-muted-foreground mb-4 flex items-center gap-2 font-mono text-[11.5px] tracking-[0.16em] uppercase">
                <span className="bg-primary inline-block size-[5px] rounded-full" />
                The marketplace
              </p>
              <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
                One marketplace, built around both sides of the work.
              </h2>
            </div>
            <p className="text-muted-foreground max-w-[52ch] text-lg leading-relaxed">
              Farmers describe the job once and receive structured offers. Providers
              see the work that fits them and quote on clear terms. Both sides work
              from the same information.
            </p>
          </div>

          <MarketplaceCanvas className="mt-12" />
        </div>
      </section>

      {/* Farmer journey */}
      <section className="border-border border-t py-20 md:py-28">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="grid items-end gap-8 md:grid-cols-[1.05fr_1fr]">
            <div>
              <p className="text-muted-foreground mb-4 flex items-center gap-2 font-mono text-[11.5px] tracking-[0.16em] uppercase">
                <span className="bg-primary inline-block size-[5px] rounded-full" />
                For farmers
              </p>
              <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
                From posted job to finished work, in four steps.
              </h2>
            </div>
            <p className="text-muted-foreground max-w-[52ch] text-lg leading-relaxed">
              You stay in control of scope, timing and who you hire. Nothing is
              agreed until you choose.
            </p>
          </div>

          <div className="mt-12">
            <FlowSteps
              steps={[
                {
                  title: "Post the job",
                  description:
                    "Describe the work, the site and the timing. Add photos so providers can quote accurately.",
                },
                {
                  title: "Receive offers",
                  description:
                    "Verified providers send structured offers with scope, price and availability.",
                },
                {
                  title: "Choose a provider",
                  description:
                    "Compare offers side by side and ask questions before you commit to anything.",
                },
                {
                  title: "Get the work done",
                  description:
                    "Confirm the details, track the job, and mark it complete when it is finished.",
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Provider journey — ink band */}
      <section className="bg-fc-ink py-20 md:py-28">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="grid items-end gap-8 md:grid-cols-[1.05fr_1fr]">
            <div>
              <p className="mb-4 flex items-center gap-2 font-mono text-[11.5px] tracking-[0.16em] text-white/64 uppercase">
                <span className="inline-block size-[5px] rounded-full bg-white/64" />
                For providers
              </p>
              <h2 className="font-heading text-3xl font-semibold tracking-tight text-white md:text-4xl">
                From first look to final payment, in four steps.
              </h2>
            </div>
            <p className="max-w-[52ch] text-lg leading-relaxed text-white/64">
              Find local work that matches your trade, send offers on your own
              terms, and build a record on every job.
            </p>
          </div>

          <ol className="relative mt-12 grid gap-8 border-t border-white/15 sm:grid-cols-2 sm:gap-x-6 md:grid-cols-4">
            {[
              ["Discover jobs", "Browse local work that matches your services, your trade and your travel range."],
              ["Send an offer", "Quote with clear terms: scope, price, start date and what the job includes."],
              ["Get hired", "The farmer compares offers and confirms the one that fits the job."],
              ["Complete the work", "Do the work, mark it complete, and let every finished job strengthen your record."],
            ].map(([title, description], i) => (
              <li key={title} className="flex flex-col gap-2.5 pt-5">
                <span className="font-mono text-[11px] tracking-[0.16em] text-white/64 uppercase">
                  Step {String(i + 1).padStart(2, "0")}
                </span>
                <p className="font-heading text-lg font-semibold text-white">{title}</p>
                <p className="max-w-[32ch] text-sm leading-relaxed text-white/64">
                  {description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Trust pillars */}
      <section className="border-border border-t py-20 md:py-28">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="mx-auto max-w-[66ch] text-center">
            <p className="text-muted-foreground mb-4 flex items-center justify-center gap-2 font-mono text-[11.5px] tracking-[0.16em] uppercase">
              <span className="bg-primary inline-block size-[5px] rounded-full" />
              Trust &amp; privacy
            </p>
            <h2 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
              Built so both sides can act with confidence.
            </h2>
          </div>

          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: "Verified profiles",
                description:
                  "Providers confirm their business details, insurance and trade references before their profile goes live. Farmers can see what has been checked.",
              },
              {
                icon: FileText,
                title: "Transparent offers",
                description:
                  "Every offer states scope, price and timing in the same structure, so comparing providers is straightforward and nothing is left vague.",
              },
              {
                icon: Lock,
                title: "Privacy by default",
                description:
                  "Contact details stay hidden until you choose to share them. You decide who can reach you, and you can change that at any time.",
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
            <p className="mb-4 flex items-center justify-center gap-2 font-mono text-[11.5px] tracking-[0.16em] text-white/82 uppercase">
              <span className="inline-block size-[5px] rounded-full bg-white/72" />
              Start on FarmConnect
            </p>
            <h2 className="font-heading mx-auto max-w-[20ch] text-3xl font-semibold text-balance md:text-4xl">
              Ready to get the work moving?
            </h2>
            <p className="mx-auto mt-4 max-w-[46ch] text-lg text-white/86">
              Post a job on FarmConnect and start receiving structured offers from
              verified local providers.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-background text-primary hover:bg-background/90 h-12 px-6"
              >
                <Link href="/signup">Post a Job</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="group h-12 px-6 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/signup">
                  Find work instead
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

function MarketplaceCanvas({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-card border-border grid grid-cols-1 items-stretch gap-4 rounded-[28px] border p-4 shadow-xl shadow-black/5 md:grid-cols-[1fr_auto_1fr] md:p-6 ${className}`}
    >
      <article className="bg-fc-surface-2 border-border flex flex-col gap-4 rounded-2xl border p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground font-mono text-[10.5px] tracking-[0.16em] uppercase">
            Farmer
          </span>
          <span className="border-border bg-card text-muted-foreground rounded-full border px-2.5 py-1 text-xs font-medium">
            Job posted
          </span>
        </div>
        <h3 className="font-heading text-lg font-semibold">
          Fence repair · 400 m post-and-wire
        </h3>
        <p className="text-muted-foreground text-sm">
          South pasture · materials on site · needed this week
        </p>
        <ul className="border-border border-t text-sm">
          {[
            ["Category", "Fencing"],
            ["Structure", "Fixed scope"],
            ["Site", "12 km from town"],
          ].map(([k, v]) => (
            <li
              key={k}
              className="border-border flex items-baseline justify-between gap-4 border-b py-2.5"
            >
              <span className="text-muted-foreground">{k}</span>
              <span className="font-mono text-xs">{v}</span>
            </li>
          ))}
        </ul>
        <div className="border-border bg-card mt-auto flex items-center gap-3 rounded-xl border p-3.5 shadow-xs">
          <span className="border-border bg-fc-surface-3 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full border font-mono text-xs">
            HC
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block text-sm font-semibold">
              Hartwell Contracting
            </strong>
            <span className="text-muted-foreground text-xs">
              Fencing · 24 km · Verified provider
            </span>
          </div>
          <span className="bg-fc-ok/13 text-fc-ok rounded-full px-2.5 py-1 text-xs font-medium">
            Offer received
          </span>
        </div>
      </article>

      <div className="flex flex-row items-center justify-center gap-3 md:min-w-15 md:flex-col" aria-hidden>
        <span className="bg-border h-px flex-1 md:h-auto md:w-px" />
        <span className="border-primary bg-card text-primary shadow-[0_0_0_6px_var(--primary-soft,color-mix(in_oklch,var(--primary)_12%,transparent))] flex size-12 shrink-0 items-center justify-center rounded-full border">
          <ArrowRight className="size-5" />
        </span>
        <span className="bg-border h-px flex-1 md:h-auto md:w-px" />
      </div>

      <article className="bg-fc-surface-2 border-border flex flex-col gap-4 rounded-2xl border p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground font-mono text-[10.5px] tracking-[0.16em] uppercase">
            Provider
          </span>
          <span className="bg-fc-ok/13 text-fc-ok rounded-full px-2.5 py-1 text-xs font-medium">
            Verified
          </span>
        </div>
        <h3 className="font-heading text-lg font-semibold">Hartwell Contracting</h3>
        <p className="text-muted-foreground text-sm">Fencing · Drainage · Groundworks</p>
        <ul className="border-border border-t text-sm">
          {[
            ["Coverage", "Within 25 km"],
            ["Availability", "From Monday"],
            ["Insurance", "On file"],
          ].map(([k, v]) => (
            <li
              key={k}
              className="border-border flex items-baseline justify-between gap-4 border-b py-2.5"
            >
              <span className="text-muted-foreground">{k}</span>
              <span className="font-mono text-xs">{v}</span>
            </li>
          ))}
        </ul>
        <div className="border-border bg-card mt-auto flex items-center gap-3 rounded-xl border p-3.5 shadow-xs">
          <span className="border-border bg-fc-surface-3 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full border font-mono text-xs">
            HC
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block text-sm font-semibold">Your offer</strong>
            <span className="text-muted-foreground text-xs">
              Site visit Thursday · fixed price
            </span>
          </div>
          <span className="border-border bg-card text-muted-foreground rounded-full border px-2.5 py-1 text-xs font-medium">
            Sent
          </span>
        </div>
      </article>
    </div>
  );
}
