import { Star, MessageSquareOff } from "lucide-react";
import { formatRelativeTime } from "@/features/marketplace/format";
import type { ProviderReview } from "@/types/marketplace";

/** Real review content only — no generated/placeholder review text.
 * Reviewer identity is whatever privacy-safe label get_provider_reviews
 * already computed server-side (see 0024); this component never sees a
 * reviewer's real name, phone, or id. */
export function ProviderReviewsList({ reviews }: { reviews: ProviderReview[] }) {
  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center">
        <MessageSquareOff className="text-muted-foreground size-6" aria-hidden />
        <p className="text-muted-foreground text-sm">No reviews yet</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {reviews.map((review) => (
        <li key={review.id} className="border-border/60 border-b pb-4 last:border-0 last:pb-0">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`size-4 ${n <= review.rating ? "fill-fc-star text-fc-star" : "text-muted-foreground"}`}
                aria-hidden
              />
            ))}
            <span className="sr-only">{review.rating} out of 5 stars</span>
          </div>
          {review.comment ? <p className="mt-1.5 text-sm">&ldquo;{review.comment}&rdquo;</p> : null}
          <p className="text-muted-foreground mt-1 text-xs">
            — {review.reviewer_label} · {formatRelativeTime(review.created_at)}
          </p>
        </li>
      ))}
    </ul>
  );
}
