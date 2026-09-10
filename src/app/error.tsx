"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary, shown automatically by Next.js when a route
 * segment throws. Must be a Client Component. Feature routes can add their
 * own error.tsx to handle errors more specifically.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-4 px-4 py-16">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground text-sm">
        Please try again. If the problem persists, come back later.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
