import type { Metadata } from "next";
import Link from "next/link";
import { UserCog, Search, Send, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlowSteps } from "@/components/marketing/flow-steps";

export const metadata: Metadata = { title: "For providers — FarmConnect" };

export default function ProviderPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-16">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          List what you offer. Find nearby jobs. Get confirmed.
        </h1>
        <p className="text-muted-foreground">
          FarmConnect helps you reach farmers near you who need labour, machinery, or
          agricultural services — you choose which jobs to bid on and at what price.
        </p>
      </div>

      <FlowSteps
        title="How it works"
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

      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/signup">Create your account</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    </div>
  );
}
