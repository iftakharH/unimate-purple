"use server";

import { revalidatePath } from "next/cache";

import { getAuthContext } from "@/lib/auth";
import { env } from "@/lib/env";
import { storeUpdateSchema } from "@/lib/validation/seller";
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

async function myStore() {
  const ctx = await getAuthContext();
  const { supabase, user } = ctx;
  if (!user || ctx.profile?.role !== "seller") return null;
  const { data: store } = await supabase
    .from("stores")
    .select("id, slug")
    .eq("owner_id", user.id)
    .maybeSingle();
  return store ? { supabase, user, store } : null;
}

export async function updateStoreAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await myStore();
  if (!ctx) return errorState("Only sellers can edit a store.");

  const parsed = storeUpdateSchema.safeParse({
    business_name: stringField(formData, "business_name"),
    description: stringField(formData, "description"),
    contact_phone: stringField(formData, "contact_phone"),
    pickup_location: stringField(formData, "pickup_location"),
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const { error } = await ctx.supabase
    .from("stores")
    .update({
      business_name: parsed.data.business_name,
      description: parsed.data.description === "" ? null : parsed.data.description,
      contact_phone: parsed.data.contact_phone === "" ? null : parsed.data.contact_phone,
      pickup_location:
        parsed.data.pickup_location === "" ? null : parsed.data.pickup_location,
    })
    .eq("owner_id", ctx.user.id);

  if (error) return errorState("Could not save the store — please try again.");

  revalidatePath("/seller/store");
  revalidatePath(`/store/${ctx.store.slug}`);
  return successState("Store updated.");
}

/**
 * Persists a logo/banner URL after the file was uploaded directly from the
 * browser to the `store-assets` bucket (owner-folder path enforced there and
 * re-checked here).
 */
export async function updateStoreAssetAction(
  kind: "logo" | "banner",
  publicUrl: string,
): Promise<ActionState> {
  const ctx = await myStore();
  if (!ctx) return errorState("Only sellers can edit a store.");

  const prefix = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/store-assets/${ctx.user.id}/`;
  if (!publicUrl.startsWith(prefix) || publicUrl.includes("..")) {
    return errorState("That image URL is not allowed.");
  }

  const { error } = await ctx.supabase
    .from("stores")
    .update(kind === "logo" ? { logo_url: publicUrl } : { banner_url: publicUrl })
    .eq("owner_id", ctx.user.id);

  if (error) return errorState("Could not save the image — please try again.");

  revalidatePath("/seller/store");
  revalidatePath(`/store/${ctx.store.slug}`);
  return successState("Image updated.");
}
