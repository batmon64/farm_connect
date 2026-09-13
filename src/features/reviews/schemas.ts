import { z } from "zod";
import { REVIEW_COMMENT_MAX_LENGTH } from "@/types/marketplace";

export const submitReviewSchema = z.object({
  assignmentId: z.string().uuid(),
  jobId: z.string().uuid(),
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5, "Choose a rating"),
  comment: z.string().trim().max(REVIEW_COMMENT_MAX_LENGTH, "Comment is too long").optional(),
});

export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
