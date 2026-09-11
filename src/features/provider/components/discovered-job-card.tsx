import Link from "next/link";
import { Calendar, IndianRupee, MapPin, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBudget, formatDate, formatDistance, formatRelativeTime } from "@/features/marketplace/format";
import type { DiscoveredJob } from "@/types/marketplace";

export function DiscoveredJobCard({ job }: { job: DiscoveredJob }) {
  const distance = formatDistance(job.distance_km);
  return (
    <Link href={`/app/provider/jobs/${job.id}`}>
      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="flex flex-col gap-2 pt-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-medium">{job.title}</h3>
            {job.has_matching_service ? (
              <Badge variant="secondary" className="shrink-0">
                <Sparkles className="size-3" aria-hidden />
                Matches you
              </Badge>
            ) : null}
          </div>
          {job.service_names && job.service_names.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {job.service_names.map((n) => (
                <Badge key={n} variant="outline" className="text-xs">
                  {n}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5" aria-hidden />
              {formatDate(job.scheduled_start)}
            </span>
            <span className="inline-flex items-center gap-1">
              <IndianRupee className="size-3.5" aria-hidden />
              {formatBudget(job.budget_min, job.budget_max, job.budget_type)}
            </span>
            {job.locality || distance ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden />
                {[job.locality, distance].filter(Boolean).join(" · ")}
              </span>
            ) : null}
          </div>
          <span className="text-muted-foreground text-xs">Posted {formatRelativeTime(job.created_at)}</span>
        </CardContent>
      </Card>
    </Link>
  );
}
