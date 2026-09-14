"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StarRatingInput } from "./star-rating-input";
import { submitReviewAction } from "../actions";
import { initialMarketplaceFormState } from "@/features/marketplace/types";
import { REVIEW_COMMENT_MAX_LENGTH } from "@/types/marketplace";
import type { Review } from "@/types/marketplace";

export function ReviewForm({
  jobId,
  assignmentId,
  revieweeName,
  existingReview,
}: {
  jobId: string;
  assignmentId: string;
  revieweeName: string;
  existingReview: Review | null;
}) {
  const [state, formAction, isPending] = useActionState(submitReviewAction, initialMarketplaceFormState);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const submitted = existingReview != null || state.status === "success";

  if (submitted) {
    const shownRating = existingReview?.rating ?? rating;
    return (
      <div className="border-primary/30 bg-primary/5 flex flex-col gap-2 rounded-lg border p-4">
        <p className="text-primary inline-flex items-center gap-1.5 text-sm font-medium">
          <CheckCircle2 className="size-4" aria-hidden />
          Review submitted
        </p>
        {shownRating ? (
          <div className="flex items-center gap-0.5" aria-label={`You rated ${shownRating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`size-4 ${n <= shownRating ? "fill-fc-star text-fc-star" : "text-muted-foreground"}`}
                aria-hidden
              />
            ))}
          </div>
        ) : null}
        {existingReview?.comment ? (
          <p className="text-muted-foreground text-sm italic">&ldquo;{existingReview.comment}&rdquo;</p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border p-4">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="jobId" value={jobId} />

      <div>
        <h3 className="font-heading font-semibold">How was your experience?</h3>
        <p className="text-muted-foreground text-sm">Rate {revieweeName}</p>
      </div>

      {state.status === "error" && state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <StarRatingInput value={rating} onChange={setRating} />
      {state.fieldErrors?.rating ? (
        <p id="rating-error" className="text-destructive -mt-2 text-sm">
          {state.fieldErrors.rating[0]}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="comment" className="sr-only">
          Comment
        </Label>
        <Textarea
          id="comment"
          name="comment"
          placeholder="Write a comment (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, REVIEW_COMMENT_MAX_LENGTH))}
          maxLength={REVIEW_COMMENT_MAX_LENGTH}
          className="min-h-24"
          aria-describedby={state.fieldErrors?.comment ? "comment-error" : undefined}
        />
        <div className="flex items-center justify-between">
          {state.fieldErrors?.comment ? (
            <p id="comment-error" className="text-destructive text-xs">
              {state.fieldErrors.comment[0]}
            </p>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground text-xs">
            {comment.length}/{REVIEW_COMMENT_MAX_LENGTH}
          </span>
        </div>
      </div>

      <Button type="submit" disabled={isPending || rating === 0} className="h-11 text-base">
        {isPending ? (
          <>
            <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
            Submitting…
          </>
        ) : (
          "Submit Review"
        )}
      </Button>
    </form>
  );
}
