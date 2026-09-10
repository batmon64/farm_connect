import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading UI, shown automatically by Next.js while a route
 * segment's data is loading. Feature routes can add their own loading.tsx
 * for more specific skeletons.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-10">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
