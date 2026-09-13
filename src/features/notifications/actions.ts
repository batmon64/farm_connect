"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationReadAction(formData: FormData) {
  const notificationId = formData.get("notificationId");
  const redirectTo = formData.get("redirectTo");
  if (typeof notificationId !== "string") return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_id", user.id);

  revalidatePath("/app/notifications");
  revalidatePath("/app");
  revalidatePath("/app/provider");

  if (typeof redirectTo === "string" && redirectTo) {
    redirect(redirectTo);
  }
}

export async function markAllNotificationsReadAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  revalidatePath("/app/notifications");
  revalidatePath("/app");
  revalidatePath("/app/provider");
}
