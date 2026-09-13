import Link from "next/link";
import { Calendar, IndianRupee, MapPin, Users2, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MatchTierBadge, MatchFactList } from "@/features/marketplace/components/match-badges";
import {
  formatBudget,
  formatDateTime,
  formatDistance,
  formatRelativeTime,
  OFFER_STATUS_LABEL,
} from "@/features/marketplace/format";
import type { DiscoveredJob } from "@/types/marketplace";

export function DiscoveredJobCard({ job }: { job: DiscoveredJob }) {
  const distance = formatDistance(job.distance_km);
  const wasUpdated =
    job.updated_at && job.created_at && new Date(job.updated_at) > new Date(job.created_at);

  return (
    <Link href={`/app/provider/jobs/${job.id}`}>
      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="flex flex-col gap-2.5 pt-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-medium">{job.title}</h3>
            <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
              {job.my_offer_status ? (
                <Badge variant="outline" className="gap-1">
                  <CheckCircle2 className="size-3" aria-hidden />
                  {job.my_offer_status === "pending"
                    ? "You offered"
                    : OFFER_STATUS_LABEL[job.my_offer_status]}
                </Badge>
              ) : (
                <MatchTierBadge tier={job.match_tier} />
              )}
            </div>
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

          {job.requirement_summary ? (
            <p className="text-muted-foreground text-sm">{job.requirement_summary}</p>
          ) : null}

          <MatchFactList facts={job} />

          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5" aria-hidden />
              {formatDateTime(job.scheduled_start)}
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

          <div className="text-muted-foreground flex items-center justify-between gap-3 text-xs">
            <span>
              {wasUpdated ? "Updated" : "Posted"} {formatRelativeTime(job.updated_at ?? job.created_at)}
            </span>
            {job.offer_count > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Users2 className="size-3.5" aria-hidden />
                {job.offer_count} offer{job.offer_count === 1 ? "" : "s"} so far
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
