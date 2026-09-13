import { Star, BadgeCheck, MapPin, Clock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AcceptOfferButton } from "./accept-offer-button";
import { MatchTierBadge } from "@/features/marketplace/components/match-badges";
import {
  formatDateTime,
  formatDistance,
  formatDuration,
  OFFER_STATUS_LABEL,
} from "@/features/marketplace/format";
import type { OfferForJob } from "@/types/marketplace";

/** Desktop comparison table — md breakpoint and up. Every value here is
 * real data already returned by get_offers_for_job — rows already
 * arrive best-match-first (see the RPC's ORDER BY); the Match column
 * just makes that ordering visible, it isn't a separate client-side
 * ranking. */
export function OfferComparisonTable({
  offers,
  jobId,
  canAccept,
}: {
  offers: OfferForJob[];
  jobId: string;
  canAccept: boolean;
}) {
  return (
    <div className="hidden overflow-hidden rounded-lg border md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Provider</TableHead>
            <TableHead>Match</TableHead>
            <TableHead>Trust</TableHead>
            <TableHead>Distance</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead>Available</TableHead>
            <TableHead>Duration</TableHead>
            {canAccept ? <TableHead className="text-right">Action</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.map((offer) => {
            const providerName = offer.business_name || "Unnamed provider";
            const hasRating = offer.rating_count > 0 && offer.rating_average != null;
            const distance = formatDistance(offer.distance_km);
            const duration = formatDuration(offer.estimated_duration);
            return (
              <TableRow key={offer.offer_id} className={offer.status === "accepted" ? "bg-primary/5" : undefined}>
                <TableCell className="max-w-[200px] whitespace-normal">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{providerName}</span>
                    {offer.service_names && offer.service_names.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {offer.service_names.slice(0, 3).map((name) => (
                          <Badge key={name} variant="outline" className="text-[10px]">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    {offer.status === "accepted" ? (
                      <Badge className="w-fit">Accepted</Badge>
                    ) : offer.status !== "pending" ? (
                      <Badge variant="outline" className="w-fit">
                        {OFFER_STATUS_LABEL[offer.status]}
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <MatchTierBadge tier={offer.match_tier} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-xs">
                    {offer.verification_status === "verified" ? (
                      <span className="inline-flex items-center gap-1">
                        <BadgeCheck className="size-3.5" aria-hidden />
                        Verified
                      </span>
                    ) : null}
                    {hasRating ? (
                      <span className="inline-flex items-center gap-1">
                        <Star className="size-3.5 fill-current" aria-hidden />
                        {offer.rating_average!.toFixed(1)} · {offer.rating_count} review
                        {offer.rating_count === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">New provider</span>
                    )}
                    <span className="text-muted-foreground">
                      {offer.completed_jobs_count > 0
                        ? `${offer.completed_jobs_count} completed`
                        : "No jobs completed yet"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {distance ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" aria-hidden />
                      {distance}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {offer.price != null ? `₹${offer.price.toLocaleString("en-IN")}` : "Quote on request"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {offer.estimated_start ? formatDateTime(offer.estimated_start) : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {duration ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" aria-hidden />
                      {duration}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                {canAccept ? (
                  <TableCell className="text-right">
                    {offer.status === "pending" ? (
                      <AcceptOfferButton
                        offerId={offer.offer_id}
                        jobId={jobId}
                        providerName={providerName}
                      />
                    ) : null}
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
