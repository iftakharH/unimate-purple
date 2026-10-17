"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth";

/** Marks one notification read and follows its link (same-origin only). */
export async function openNotificationAction(formData: FormData): Promise<void> {
  const { supabase, user } = await getAuthContext();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;

  const { data } = await supabase
    .from("notifications")
    .select("link")
    .eq("id", id)
    .maybeSingle();

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/notifications");
  const link = data?.link;
  redirect(link && link.startsWith("/") ? link : "/notifications");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const { supabase, user } = await getAuthContext();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/notifications");
}
