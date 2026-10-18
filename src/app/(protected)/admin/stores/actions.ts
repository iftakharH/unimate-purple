"use server";

import { revalidatePath } from "next/cache";

import { logAdminAction, requireAdminContext } from "@/lib/admin";
import { adminStoreSchema, idRegex } from "@/lib/validation/admin";
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

function revalidateStore(slug: string): void {
  revalidatePath("/admin/stores");
  revalidatePath(`/store/${slug}`);
}

export async function toggleStoreActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdminContext();
  if (!auth.ok) return auth.state;
  const { supabase } = auth;

  const storeId = stringField(formData, "store_id");
  const next = stringField(formData, "next");
  if (!idRegex.test(storeId)) return errorState("Unknown store.");
  if (next !== "active" && next !== "inactive") return errorState("Unknown action.");

  const { data: store } = await supabase
    .from("stores")
    .select("id, business_name, slug")
    .eq("id", storeId)
    .maybeSingle();
  if (!store) return errorState("Store not found.");

  const { error } = await supabase
    .from("stores")
    .update({ is_active: next === "active" })
    .eq("id", storeId);
  if (error) return errorState(humanize(error.message));

  await logAdminAction(supabase, {
    action: next === "active" ? "store.activate" : "store.deactivate",
    targetType: "store",
    targetId: storeId,
    details: { business_name: store.business_name },
  });

  revalidateStore(store.slug);
  return successState(
    next === "active"
      ? `"${store.business_name}" is live again.`
      : `"${store.business_name}" is deactivated — its storefront is offline.`,
  );
}

export async function updateStoreAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdminContext();
  if (!auth.ok) return auth.state;
  const { supabase } = auth;

  const storeId = stringField(formData, "store_id");
  if (!idRegex.test(storeId)) return errorState("Unknown store.");

  const parsed = adminStoreSchema.safeParse({
    business_name: stringField(formData, "business_name"),
    description: stringField(formData, "description"),
    pickup_location: stringField(formData, "pickup_location"),
    contact_phone: stringField(formData, "contact_phone"),
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const { data: store } = await supabase
    .from("stores")
    .select("id, slug")
    .eq("id", storeId)
    .maybeSingle();
  if (!store) return errorState("Store not found.");

  const { error } = await supabase
    .from("stores")
    .update({
      business_name: parsed.data.business_name,
      description: parsed.data.description === "" ? null : parsed.data.description,
      pickup_location:
        parsed.data.pickup_location === "" ? null : parsed.data.pickup_location,
      contact_phone: parsed.data.contact_phone === "" ? null : parsed.data.contact_phone,
    })
    .eq("id", storeId);
  if (error) return errorState(humanize(error.message));

  await logAdminAction(supabase, {
    action: "store.update",
    targetType: "store",
    targetId: storeId,
    details: { business_name: parsed.data.business_name },
  });

  revalidateStore(store.slug);
  return successState("Store updated.");
}

export async function deleteStoreAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdminContext();
  if (!auth.ok) return auth.state;
  const { supabase } = auth;

  const storeId = stringField(formData, "store_id");
  if (!idRegex.test(storeId)) return errorState("Unknown store.");

  const { data: store } = await supabase
    .from("stores")
    .select("id, business_name, slug")
    .eq("id", storeId)
    .maybeSingle();
  if (!store) return errorState("Store not found.");

  const { error } = await supabase.from("stores").delete().eq("id", storeId);
  if (error) return errorState(humanize(error.message));

  await logAdminAction(supabase, {
    action: "store.delete",
    targetType: "store",
    targetId: storeId,
    details: { business_name: store.business_name },
  });

  revalidatePath("/admin/stores");
  revalidatePath("/browse");
  revalidatePath("/");
  return successState(
    `"${store.business_name}" and its listings are deleted.`,
  );
}
