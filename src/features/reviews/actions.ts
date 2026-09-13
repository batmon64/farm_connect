"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { submitReviewSchema } from "./schemas";
import type { MarketplaceFormState } from "@/features/marketplace/types";

export async function submitReviewAction(
  _prevState: MarketplaceFormState,
  formData: FormData
): Promise<MarketplaceFormState> {
  const raw = {
    assignmentId: formData.get("assignmentId"),
    jobId: formData.get("jobId"),
    rating: formData.get("rating"),
    comment: formData.get("comment") || undefined,
  };

  const parsed = submitReviewSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("submit_review", {
      p_assignment_id: parsed.data.assignmentId,
      p_rating: parsed.data.rating,
      p_comment: parsed.data.comment || null,
    });

    if (error) {
      if (error.message.includes("already reviewed")) {
        return { status: "error", message: "You've already reviewed this completed job." };
      }
      if (error.message.includes("not completed")) {
        return { status: "error", message: "You can't review this job yet." };
      }
      if (error.message.includes("not authorized") || error.message.includes("not found")) {
        return { status: "error", message: "You can't review this job." };
      }
      if (error.message.includes("rating must be")) {
        return { status: "error", message: "Choose a rating between 1 and 5 stars." };
      }
      if (error.message.includes("too long")) {
        return { status: "error", message: "Your comment is too long." };
      }
      return { status: "error", message: "Could not submit your review. Please try again." };
    }
  } catch {
    return { status: "error", message: "Network error. Check your connection and try again." };
  }

  revalidatePath(`/app/jobs/${parsed.data.jobId}`);
  revalidatePath(`/app/provider/jobs/${parsed.data.jobId}`);
  revalidatePath("/app/provider/profile");
  return { status: "success", message: "Review submitted." };
}
