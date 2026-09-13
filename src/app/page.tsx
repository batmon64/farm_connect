import Link from "next/link";
import {
  Sprout,
  Wrench,
  ClipboardList,
  ListChecks,
  UserCheck,
  CheckCircle2,
  UserCog,
  Search,
  Send,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FlowSteps } from "@/components/marketing/flow-steps";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 py-12 md:py-20">
      <section className="flex flex-col gap-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-5xl">
          Find the right people and machinery for your farm, when you need them.
        </h1>
        <p className="text-muted-foreground mx-auto max-w-2xl text-balance md:text-lg">
          FarmConnect is a marketplace connecting farmers with workers, machinery, and
          agricultural service providers nearby — from posting a job to confirming who does it.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Sprout className="text-primary size-8" aria-hidden />
            <CardTitle className="text-xl">I need work done</CardTitle>
            <CardDescription>
              Post a farm job — labour, machinery, or services — and compare offers from
              nearby providers.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Button asChild>
              <Link href="/farmer">See how it works</Link>
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <Wrench className="text-primary size-8" aria-hidden />
            <CardTitle className="text-xl">I provide services</CardTitle>
            <CardDescription>
              Offer your labour, machinery, or expertise and get matched with nearby jobs.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Button asChild variant="secondary">
              <Link href="/provider">See how it works</Link>
            </Button>
          </div>
        </Card>
      </section>

      <section className="flex flex-col gap-10">
        <FlowSteps
          title="For farmers"
          steps={[
            {
              icon: ClipboardList,
              title: "Post your job",
              description: "Describe the work, when you need it, and your budget.",
            },
            {
              icon: ListChecks,
              title: "Compare offers",
              description: "See price, availability, and provider trust signals side by side.",
            },
            {
              icon: UserCheck,
              title: "Confirm a provider",
              description: "Their exact location and contact details unlock once confirmed.",
            },
            {
              icon: CheckCircle2,
              title: "Get it done",
              description: "Track the job through to completion from your dashboard.",
            },
          ]}
        />

        <FlowSteps
          title="For providers"
          steps={[
            {
              icon: UserCog,
              title: "Set up your profile",
              description: "List your services or machinery and your service area.",
            },
            {
              icon: Search,
              title: "Browse nearby jobs",
              description: "See open jobs that match what you offer, with distance shown.",
            },
            {
              icon: Send,
              title: "Submit an offer",
              description: "Share your price, availability, and a short message.",
            },
            {
              icon: BadgeCheck,
              title: "Get confirmed",
              description: "Job and contact details unlock once a farmer accepts your offer.",
            },
          ]}
        />
      </section>

      <section className="flex flex-col items-center gap-3 text-center">
        <p className="text-muted-foreground text-sm">Ready to get started?</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">Create your account</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
