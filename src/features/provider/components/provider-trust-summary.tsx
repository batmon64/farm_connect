import { Star, BadgeCheck, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/** Presents only fields that actually exist on provider_profiles — no
 * fabricated ratings, review counts, or verification. A provider with
 * no rating/job history gets an honest "New provider" line instead of
 * a fake 0-star display; "Verified" only ever appears when
 * verification_status is actually 'verified'. */
export function ProviderTrustSummary({
  businessName,
  ratingAverage,
  ratingCount,
  completedJobsCount,
  verificationStatus,
  serviceNames,
  size = "default",
}: {
  businessName: string | null;
  ratingAverage: number | null;
  ratingCount: number;
  completedJobsCount: number;
  verificationStatus?: string;
  serviceNames?: string[];
  size?: "default" | "compact";
}) {
  const isVerified = verificationStatus === "verified";
  const hasRating = ratingCount > 0 && ratingAverage != null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className={size === "compact" ? "font-medium" : "text-lg font-semibold"}>
          {businessName || "Unnamed provider"}
        </span>
        {isVerified ? (
          <Badge variant="secondary" className="gap-1">
            <BadgeCheck className="size-3" aria-hidden />
            Verified
          </Badge>
        ) : null}
      </div>
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {hasRating ? (
          <span className="inline-flex items-center gap-1">
            <Star className="size-3.5 fill-current" aria-hidden />
            {ratingAverage!.toFixed(1)} ({ratingCount})
          </span>
        ) : (
          <span>New provider</span>
        )}
        <span className="inline-flex items-center gap-1">
          <Briefcase className="size-3.5" aria-hidden />
          {completedJobsCount > 0
            ? `${completedJobsCount} job${completedJobsCount === 1 ? "" : "s"} completed`
            : "No completed jobs yet"}
        </span>
      </div>
      {serviceNames && serviceNames.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {serviceNames.map((name) => (
            <Badge key={name} variant="outline" className="text-xs">
              {name}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
