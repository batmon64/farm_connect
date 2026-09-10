import Link from "next/link";
import { Sprout, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-12 md:py-20">
      <section className="flex flex-col gap-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
          Agricultural help, on demand.
        </h1>
        <p className="text-muted-foreground mx-auto max-w-2xl text-balance md:text-lg">
          FarmConnect is building a real-time marketplace to connect farmers
          with workers, machinery, and agricultural services when they need
          them.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Sprout className="text-primary size-8" aria-hidden />
            <CardTitle className="text-xl">I need work done</CardTitle>
            <CardDescription>
              Post a farm job — labour, machinery, or services — and find
              nearby providers.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Button asChild>
              <Link href="/farmer">Explore for farmers</Link>
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <Wrench className="text-primary size-8" aria-hidden />
            <CardTitle className="text-xl">I provide services</CardTitle>
            <CardDescription>
              Offer your labour, machinery, or expertise and get matched with
              nearby jobs.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Button asChild variant="secondary">
              <Link href="/provider">Explore for providers</Link>
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
