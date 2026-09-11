import { Star, MapPin, Clock, IndianRupee, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AcceptOfferButton } from "./accept-offer-button";
import {
  formatDateTime,
  formatDistance,
  formatDuration,
  formatRelativeTime,
  OFFER_STATUS_LABEL,
} from "@/features/marketplace/format";
import type { OfferForJob } from "@/types/marketplace";

export function OfferCard({
  offer,
  jobId,
  canAccept,
}: {
  offer: OfferForJob;
  jobId: string;
  canAccept: boolean;
}) {
  const providerName = offer.business_name || "Unnamed provider";
  const distance = formatDistance(offer.distance_km);
  const duration = formatDuration(offer.estimated_duration);

  return (
    <Card className={offer.status === "accepted" ? "border-primary" : undefined}>
      <CardContent className="flex flex-col gap-3 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-medium">{providerName}</h3>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {offer.rating_count > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <Star className="size-3.5 fill-current" aria-hidden />
                  {offer.rating_average?.toFixed(1)} ({offer.rating_count})
                </span>
              ) : (
                <span>New provider</span>
              )}
              {offer.completed_jobs_count > 0 ? (
                <span>{offer.completed_jobs_count} jobs completed</span>
              ) : null}
              {distance ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden />
                  {distance}
                </span>
              ) : null}
            </div>
          </div>
          {offer.status === "accepted" ? (
            <Badge>
              <CheckCircle2 className="size-3.5" aria-hidden />
              Accepted
            </Badge>
          ) : offer.status !== "pending" ? (
            <Badge variant="outline">{OFFER_STATUS_LABEL[offer.status]}</Badge>
          ) : null}
        </div>

        {offer.description ? (
          <p className="text-muted-foreground line-clamp-2 text-sm">{offer.description}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1 font-medium">
            <IndianRupee className="size-4" aria-hidden />
            {offer.price != null ? offer.price.toLocaleString("en-IN") : "Quote on request"}
          </span>
          {offer.estimated_start ? (
            <span className="text-muted-foreground inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {formatDateTime(offer.estimated_start)}
            </span>
          ) : null}
          {duration ? <span className="text-muted-foreground">~{duration}</span> : null}
        </div>

        {offer.message ? (
          <p className="bg-muted/50 rounded-md p-3 text-sm italic">&ldquo;{offer.message}&rdquo;</p>
        ) : null}

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">
            Offered {formatRelativeTime(offer.created_at)}
          </span>
          {canAccept && offer.status === "pending" ? (
            <AcceptOfferButton offerId={offer.offer_id} jobId={jobId} providerName={providerName} />
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
