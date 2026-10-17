"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth";
import { env } from "@/lib/env";
import {
  listingImagesSchema,
  listingSchema,
} from "@/lib/validation/listing";
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

function parseImages(formData: FormData): string[] | null {
  try {
    const raw = stringField(formData, "images");
    const parsed = listingImagesSchema.safeParse(raw ? JSON.parse(raw) : []);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Storage-path helper: only files inside the caller's own bucket folder. */
function storagePathFromUrl(url: string, userId: string): string | null {
  const prefix = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${userId}/`;
  if (!url.startsWith(prefix) || url.includes("..")) return null;
  return url.slice(`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/`.length);
}

async function sellerContext() {
  const ctx = await getAuthContext();
  const { supabase, user, profile } = ctx;
  if (!user || profile?.role !== "seller") {
    return { ok: false as const, state: errorState("Only approved sellers can manage listings.") };
  }
  const { data: store } = await supabase
    .from("stores")
    .select("id, is_active, pickup_location")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!store || !store.is_active) {
    return { ok: false as const, state: errorState("Your store isn't active yet — contact an admin.") };
  }
  return { ok: true as const, supabase, user, store };
}

// ---------- create ------------------------------------------------------------------

export async function createListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await sellerContext();
  if (!auth.ok) return auth.state;
  const { supabase, user, store } = auth;

  const parsed = listingSchema.safeParse({
    title: stringField(formData, "title"),
    description: stringField(formData, "description"),
    price_bdt: stringField(formData, "price_bdt"),
    category_id: stringField(formData, "category_id"),
    condition: stringField(formData, "condition"),
    quantity: stringField(formData, "quantity"),
    pickup_location: stringField(formData, "pickup_location"),
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const images = parseImages(formData);
  if (!images) return errorState("One of the photos is invalid — remove and re-add it.");
  for (const url of images) {
    if (!storagePathFromUrl(url, user.id)) {
      return errorState("Photos must be uploaded through the form.");
    }
  }

  const { data: listing, error } = await supabase
    .from("listings")
    .insert({
      store_id: store.id,
      seller_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description === "" ? null : parsed.data.description,
      price_bdt: parsed.data.price_bdt,
      category_id: parsed.data.category_id || null,
      condition: parsed.data.condition,
      quantity: parsed.data.quantity,
      pickup_location:
        parsed.data.pickup_location === ""
          ? store.pickup_location
          : parsed.data.pickup_location,
    })
    .select("id")
    .single();

  if (error || !listing) {
    return errorState("Could not publish the listing — please try again.");
  }

  if (images.length > 0) {
    const { error: imageError } = await supabase.from("listing_images").insert(
      images.map((url, index) => ({
        listing_id: listing.id,
        url,
        position: index,
      })),
    );
    if (imageError) {
      // The listing exists without photos — the seller can add them via Edit.
      revalidatePath("/seller/listings");
      redirect(`/seller/listings/${listing.id}/edit?photos=1`);
    }
  }

  revalidatePath("/seller/listings");
  revalidatePath("/browse");
  revalidatePath("/");
  redirect(`/listing/${listing.id}?created=1`);
}

// ---------- update ------------------------------------------------------------------

export async function updateListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await sellerContext();
  if (!auth.ok) return auth.state;
  const { supabase, user } = auth;

  const listingId = stringField(formData, "listing_id");
  if (!/^[0-9a-f-]{36}$/i.test(listingId)) return errorState("Unknown listing.");

  const parsed = listingSchema.safeParse({
    title: stringField(formData, "title"),
    description: stringField(formData, "description"),
    price_bdt: stringField(formData, "price_bdt"),
    category_id: stringField(formData, "category_id"),
    condition: stringField(formData, "condition"),
    quantity: stringField(formData, "quantity"),
    pickup_location: stringField(formData, "pickup_location"),
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const images = parseImages(formData);
  if (!images) return errorState("One of the photos is invalid — remove and re-add it.");
  for (const url of images) {
    if (!storagePathFromUrl(url, user.id)) {
      return errorState("Photos must be uploaded through the form.");
    }
  }

  const { data: updated, error } = await supabase
    .from("listings")
    .update({
      title: parsed.data.title,
      description: parsed.data.description === "" ? null : parsed.data.description,
      price_bdt: parsed.data.price_bdt,
      category_id: parsed.data.category_id || null,
      condition: parsed.data.condition,
      quantity: parsed.data.quantity,
      pickup_location: parsed.data.pickup_location === "" ? null : parsed.data.pickup_location,
    })
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .select("id");

  if (error) return errorState("Could not save the listing — please try again.");
  if (!updated || updated.length === 0) return errorState("Listing not found.");

  // Sync photos: remove rows for URLs no longer present, upsert positions.
  const { data: existingRows } = await supabase
    .from("listing_images")
    .select("id, url")
    .eq("listing_id", listingId);
  const existing = existingRows ?? [];
  const keepUrls = new Set(images);

  const removed = existing.filter((row) => !keepUrls.has(row.url));
  if (removed.length > 0) {
    await supabase
      .from("listing_images")
      .delete()
      .in(
        "id",
        removed.map((row) => row.id),
      );
    const paths = removed
      .map((row) => storagePathFromUrl(row.url, user.id))
      .filter((path): path is string => Boolean(path));
    if (paths.length > 0) {
      await supabase.storage.from("listing-images").remove(paths).catch(() => undefined);
    }
  }

  for (const [index, url] of images.entries()) {
    const match = existing.find((row) => row.url === url);
    if (match) {
      await supabase
        .from("listing_images")
        .update({ position: index })
        .eq("id", match.id);
    } else {
      await supabase
        .from("listing_images")
        .insert({ listing_id: listingId, url, position: index });
    }
  }

  revalidatePath("/seller/listings");
  revalidatePath(`/listing/${listingId}`);
  revalidatePath("/browse");
  return successState("Listing updated.");
}

// ---------- delete ------------------------------------------------------------------

export async function deleteListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await sellerContext();
  if (!auth.ok) return auth.state;
  const { supabase, user } = auth;

  const listingId = stringField(formData, "listing_id");
  if (!/^[0-9a-f-]{36}$/i.test(listingId)) return errorState("Unknown listing.");

  const { data: rows } = await supabase
    .from("listing_images")
    .select("url")
    .eq("listing_id", listingId);

  const { data: deleted, error } = await supabase
    .from("listings")
    .delete()
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .select("id");
  if (error) return errorState("Could not delete the listing — please try again.");
  if (!deleted || deleted.length === 0) return errorState("Listing not found.");

  const paths = (rows ?? [])
    .map((row) => storagePathFromUrl(row.url, user.id))
    .filter((path): path is string => Boolean(path));
  if (paths.length > 0) {
    await supabase.storage.from("listing-images").remove(paths).catch(() => undefined);
  }

  revalidatePath("/seller/listings");
  revalidatePath("/browse");
  redirect("/seller/listings");
}

// ---------- status (sold / sold out / relist) ------------------------------------------

const STATUS_MESSAGES: Record<string, string> = {
  sold: "Marked as sold — it's hidden from browse but stays in your list.",
  sold_out: "Marked as sold out — buyers can't see it any more.",
  active: "Listing is live again.",
};

export async function setListingStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await sellerContext();
  if (!auth.ok) return auth.state;
  const { supabase, user } = auth;

  const listingId = stringField(formData, "listing_id");
  const status = stringField(formData, "status");
  if (!/^[0-9a-f-]{36}$/i.test(listingId)) return errorState("Unknown listing.");
  if (status !== "sold" && status !== "sold_out" && status !== "active") {
    return errorState("Unknown status.");
  }

  const { data: updated, error } = await supabase
    .from("listings")
    .update({ status })
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .select("id");

  if (error) return errorState("Could not update the listing — please try again.");
  if (!updated || updated.length === 0) return errorState("Listing not found.");

  revalidatePath("/seller/listings");
  revalidatePath(`/listing/${listingId}`);
  revalidatePath("/browse");
  return successState(STATUS_MESSAGES[status]);
}
