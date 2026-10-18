"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth";
import { dealRequestSchema } from "@/lib/validation/deal";
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
    revalidatePath("/saved");
    return { saved: false };
  }

  const { error } = await supabase
    .from("saved_items")
    .insert({ user_id: user.id, listing_id: listingId });
  if (error) return { saved: false, error: "Could not save — try again." };

  revalidatePath(`/listing/${listingId}`);
  revalidatePath("/saved");
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

/** Find-or-create the buyer's conversation for a listing, then open it. */
export async function startConversationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await getAuthContext();
  if (!user) return errorState("Sign in to message sellers.");

  const listingId = stringField(formData, "listing_id");
  if (!/^[0-9a-f-]{36}$/i.test(listingId)) return errorState("Unknown listing.");

  const { data: listing } = await supabase
    .from("listings")
    .select("id, seller_id")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing) return errorState("This listing is no longer available.");
  if (listing.seller_id === user.id) return errorState("This is your own listing.");

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", user.id)
    .maybeSingle();
  if (existing) redirect(`/messages/${existing.id}`);

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      listing_id: listingId,
      buyer_id: user.id,
      seller_id: listing.seller_id,
    })
    .select("id")
    .single();

  if (error || !created) {
    // Unique-index race with a parallel click — take the winner's row.
    const { data: raced } = await supabase
      .from("conversations")
      .select("id")
      .eq("listing_id", listingId)
      .eq("buyer_id", user.id)
      .maybeSingle();
    if (raced) redirect(`/messages/${raced.id}`);
    return errorState("Could not open the chat — please try again.");
  }

  revalidatePath("/messages");
  redirect(`/messages/${created.id}`);
}

/** Buyer offers on a listing — creates (or re-opens) the deal and opens it. */
export async function createDealAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await getAuthContext();
  if (!user) return errorState("Sign in to make an offer.");

  const listingId = stringField(formData, "listing_id");
  if (!/^[0-9a-f-]{36}$/i.test(listingId)) return errorState("Unknown listing.");

  const parsed = dealRequestSchema.safeParse({
    quantity: stringField(formData, "quantity"),
    amount_bdt: stringField(formData, "amount_bdt"),
    payment_mode: stringField(formData, "payment_mode"),
    buyer_note: stringField(formData, "buyer_note"),
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, seller_id, status, quantity")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing || listing.status !== "active") {
    return errorState("This listing is no longer available.");
  }
  if (listing.seller_id === user.id) return errorState("This is your own listing.");
  if (parsed.data.quantity > listing.quantity) {
    return errorState(`Only ${listing.quantity} left in stock.`);
  }

  // One open deal per listing per buyer — reuse it instead of stacking.
  const { data: openDeal } = await supabase
    .from("deals")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", user.id)
    .in("status", ["requested", "accepted", "paid", "handed_over"])
    .maybeSingle();
  if (openDeal) redirect(`/deals/${openDeal.id}`);

  const { data: created, error } = await supabase
    .from("deals")
    .insert({
      listing_id: listingId,
      buyer_id: user.id,
      seller_id: listing.seller_id,
      status: "requested",
      payment_mode: parsed.data.payment_mode,
      quantity: parsed.data.quantity,
      amount_bdt: parsed.data.amount_bdt,
      buyer_note: parsed.data.buyer_note === "" ? null : parsed.data.buyer_note,
    })
    .select("id")
    .single();

  if (error || !created) {
    return errorState("Could not send the offer — please try again.");
  }

  revalidatePath("/deals");
  redirect(`/deals/${created.id}`);
}
