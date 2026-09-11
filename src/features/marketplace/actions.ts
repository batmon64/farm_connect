"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MarketplaceFormState } from "./types";

export async function updateAccountProfileAction(
  _prevState: MarketplaceFormState,
  formData: FormData
): Promise<MarketplaceFormState> {
  const displayName = formData.get("displayName");
  const phone = formData.get("phone");
  const location = formData.get("location");

  if (typeof displayName !== "string" || !displayName.trim()) {
    return {
      status: "error",
      message: "Please fix the errors below.",
      fieldErrors: { displayName: ["Display name is required"] },
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { status: "error", message: "Your session has expired. Please log in again." };
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
        location: typeof location === "string" && location.trim() ? location.trim() : null,
      })
      .eq("id", user.id);

    if (error) {
      return { status: "error", message: "Could not save your profile. Please try again." };
    }
  } catch {
    return { status: "error", message: "Network error. Check your connection and try again." };
  }

  revalidatePath("/app/profile");
  revalidatePath("/app/provider/profile");
  return { status: "success", message: "Profile updated." };
}
