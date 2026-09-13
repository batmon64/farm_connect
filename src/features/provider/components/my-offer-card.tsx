import Link from "next/link";
import { IndianRupee, Calendar, MapPin, Clock, CheckCircle2, XCircle, Ban, TimerOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime, OFFER_STATUS_LABEL, JOB_STATUS_LABEL } from "@/features/marketplace/format";
import type { MyOffer } from "@/types/marketplace";

const OFFER_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  accepted: "default",
  rejected: "destructive",
  withdrawn: "outline",
  expired: "outline",
};

const OFFER_ICON: Record<string, LucideIcon> = {
  pending: Clock,
  accepted: CheckCircle2,
  rejected: XCircle,
  withdrawn: Ban,
  expired: TimerOff,
};

export function MyOfferCard({ offer }: { offer: MyOffer }) {
  const StatusIcon = OFFER_ICON[offer.status];
  return (
    <Link href={`/app/provider/jobs/${offer.job_id}`}>
      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="flex flex-col gap-2 pt-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-medium">{offer.job_title}</h3>
            <Badge variant={OFFER_VARIANT[offer.status] ?? "outline"}>
              {StatusIcon ? <StatusIcon className="size-3" aria-hidden /> : null}
              {OFFER_STATUS_LABEL[offer.status] ?? offer.status}
            </Badge>
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1">
              <IndianRupee className="size-3.5" aria-hidden />
              {offer.price != null ? offer.price.toLocaleString("en-IN") : "Quoted"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5" aria-hidden />
              {formatDate(offer.scheduled_start)}
            </span>
            {offer.job_locality ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden />
                {offer.job_locality}
              </span>
            ) : null}
          </div>
          <p className="text-muted-foreground text-xs">
            Job status: {JOB_STATUS_LABEL[offer.job_status] ?? offer.job_status} · Offered{" "}
            {formatDateTime(offer.created_at)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
