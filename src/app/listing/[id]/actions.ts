"use server";

import { revalidatePath } from "next/cache";

import { getAuthContext } from "@/lib/auth";
import { reportListingSchema } from "@/lib/validation/listing";
import {
  errorState,
  fieldErrorsOf,
  successState,
  type ActionState,
} from "@/lib/validation/helpers";

function stringField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** Heart toggle on the listing page. */
export async function toggleSavedItemAction(
  listingId: string,
): Promise<{ saved: boolean; error?: string }> {
  const { supabase, user } = await getAuthContext();
  if (!user) return { saved: false, error: "Sign in to save items." };

  const { data: existing } = await supabase
    .from("saved_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("saved_items").delete().eq("id", existing.id);
    if (error) return { saved: true, error: "Could not remove — try again." };
    revalidatePath(`/listing/${listingId}`);
    return { saved: false };
  }

  const { error } = await supabase
    .from("saved_items")
    .insert({ user_id: user.id, listing_id: listingId });
  if (error) return { saved: false, error: "Could not save — try again." };

  revalidatePath(`/listing/${listingId}`);
  return { saved: true };
}

export async function reportListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await getAuthContext();
  if (!user) return errorState("Sign in to report a listing.");

  const parsed = reportListingSchema.safeParse({
    listing_id: stringField(formData, "listing_id"),
    reason: stringField(formData, "reason"),
    details: stringField(formData, "details"),
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: "listing",
    target_id: parsed.data.listing_id,
    reason: parsed.data.reason,
    details: parsed.data.details === "" ? null : parsed.data.details,
  });
  if (error) return errorState("Could not send the report — please try again.");

  return successState("Thanks — an admin will review this listing.");
}
