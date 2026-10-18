"use server";

import { revalidatePath } from "next/cache";

import { logAdminAction, requireAdminContext } from "@/lib/admin";
import { adminListingSchema, idRegex } from "@/lib/validation/admin";
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

function humanize(message: string): string {
  if (message.includes("row-level security")) {
    return "That change was refused by the database — refresh and try again.";
  }
  return message.length < 140 ? message : "That didn't work — please try again.";
}

function revalidateListingSurfaces(listingId: string): void {
  revalidatePath("/admin/listings");
  revalidatePath("/browse");
  revalidatePath("/");
  revalidatePath(`/listing/${listingId}`);
}

/** Hide (unpublish) or restore a listing. */
export async function setListingStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdminContext();
  if (!auth.ok) return auth.state;
  const { supabase } = auth;

  const listingId = stringField(formData, "listing_id");
  const status = stringField(formData, "status");
  if (!idRegex.test(listingId)) return errorState("Unknown listing.");
  if (status !== "active" && status !== "hidden") {
    return errorState("Unknown status.");
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, title")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing) return errorState("Listing not found.");

  const { error } = await supabase
    .from("listings")
    .update({ status })
    .eq("id", listingId);
  if (error) return errorState(humanize(error.message));

  await logAdminAction(supabase, {
    action: status === "hidden" ? "listing.hide" : "listing.restore",
    targetType: "listing",
    targetId: listingId,
    details: { title: listing.title, status },
  });

  revalidateListingSurfaces(listingId);
  return successState(
    status === "hidden"
      ? `"${listing.title}" is hidden from the marketplace.`
      : `"${listing.title}" is live again.`,
  );
}

/** Admin edit — title, price, stock, condition, status, category, pickup. */
export async function updateListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdminContext();
  if (!auth.ok) return auth.state;
  const { supabase } = auth;

  const listingId = stringField(formData, "listing_id");
  if (!idRegex.test(listingId)) return errorState("Unknown listing.");

  const parsed = adminListingSchema.safeParse({
    title: stringField(formData, "title"),
    price_bdt: stringField(formData, "price_bdt"),
    quantity: stringField(formData, "quantity"),
    condition: stringField(formData, "condition"),
    status: stringField(formData, "status"),
    category_id: stringField(formData, "category_id"),
    pickup_location: stringField(formData, "pickup_location"),
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const { data: existing } = await supabase
    .from("listings")
    .select("id, title")
    .eq("id", listingId)
    .maybeSingle();
  if (!existing) return errorState("Listing not found.");

  const { error } = await supabase
    .from("listings")
    .update({
      title: parsed.data.title,
      price_bdt: parsed.data.price_bdt,
      quantity: parsed.data.quantity,
      condition: parsed.data.condition,
      status: parsed.data.status,
      category_id: parsed.data.category_id === "" ? null : parsed.data.category_id,
      pickup_location: parsed.data.pickup_location === "" ? null : parsed.data.pickup_location,
    })
    .eq("id", listingId);
  if (error) return errorState(humanize(error.message));

  await logAdminAction(supabase, {
    action: "listing.update",
    targetType: "listing",
    targetId: listingId,
    details: {
      before: { title: existing.title },
      after: {
        title: parsed.data.title,
        price_bdt: parsed.data.price_bdt,
        status: parsed.data.status,
      },
    },
  });

  revalidateListingSurfaces(listingId);
  return successState("Listing updated.");
}

export async function deleteListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdminContext();
  if (!auth.ok) return auth.state;
  const { supabase } = auth;

  const listingId = stringField(formData, "listing_id");
  if (!idRegex.test(listingId)) return errorState("Unknown listing.");

  const { data: listing } = await supabase
    .from("listings")
    .select("id, title")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing) return errorState("Listing not found.");

  const { error } = await supabase.from("listings").delete().eq("id", listingId);
  if (error) return errorState(humanize(error.message));

  await logAdminAction(supabase, {
    action: "listing.delete",
    targetType: "listing",
    targetId: listingId,
    details: { title: listing.title },
  });

  revalidateListingSurfaces(listingId);
  return successState(`"${listing.title}" is deleted.`);
}
