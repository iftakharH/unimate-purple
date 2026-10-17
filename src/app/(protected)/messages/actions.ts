"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAuthContext } from "@/lib/auth";
import {
  errorState,
  successState,
  type ActionState,
} from "@/lib/validation/helpers";

const bodySchema = z
  .string()
  .trim()
  .min(1, "Write a message")
  .max(2000, "Keep it under 2000 characters");

export async function sendMessageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await getAuthContext();
  if (!user) return errorState("Your session expired — sign in again.");

  const conversationId = String(formData.get("conversation_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(conversationId)) {
    return errorState("Unknown conversation.");
  }

  const parsed = bodySchema.safeParse(formData.get("body"));
  if (!parsed.success) {
    return errorState(parsed.error.issues[0]?.message ?? "Write a message.");
  }

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: parsed.data,
  });
  if (error) {
    return errorState("Could not send — check your connection and try again.");
  }

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return successState("Message sent.");
}

/** Marks every message the partner sent in this thread as read. */
export async function markConversationReadAction(
  conversationId: string,
): Promise<void> {
  const { supabase, user } = await getAuthContext();
  if (!user) return;
  if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return;

  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", user.id)
    .is("read_at", null);

  revalidatePath("/messages");
}
