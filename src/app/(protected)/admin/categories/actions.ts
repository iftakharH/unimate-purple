"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { logAdminAction, requireAdminContext } from "@/lib/admin";
import { adminCategorySchema, idRegex } from "@/lib/validation/admin";
import {
  errorState,
  fieldErrorsOf,
  successState,
  type ActionState,
} from "@/lib/validation/helpers";
import type { Database } from "@/types/database";

function stringField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "category";
}

/** Slug stays unique even after renames — append -2, -3 … when needed. */
async function uniqueSlug(
  supabase: SupabaseClient<Database>,
  name: string,
  excludeId?: string,
): Promise<string> {
  const { data: existing } = await supabase.from("categories").select("id, slug");
  const taken = new Set(
    (existing ?? []).filter((c) => c.id !== excludeId).map((c) => c.slug),
  );
  const base = slugify(name);
  let slug = base;
  let suffix = 2;
  while (taken.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

export async function createCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdminContext();
  if (!auth.ok) return auth.state;
  const { supabase } = auth;

  const parsed = adminCategorySchema.safeParse({
    name: stringField(formData, "name"),
    icon: stringField(formData, "icon"),
    sort_order: stringField(formData, "sort_order"),
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const slug = await uniqueSlug(supabase, parsed.data.name);

  const { error } = await supabase.from("categories").insert({
    name: parsed.data.name,
    slug,
    icon: parsed.data.icon === "" ? null : parsed.data.icon,
    sort_order: parsed.data.sort_order,
  });
  if (error) {
    if (error.code === "23505") return errorState("That name is already taken.");
    return errorState("Could not save the category — try again.");
  }

  await logAdminAction(supabase, {
    action: "category.create",
    targetType: "category",
    targetId: slug,
    details: { name: parsed.data.name },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/browse");
  revalidatePath("/");
  return successState(`Category "${parsed.data.name}" added.`);
}

export async function updateCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdminContext();
  if (!auth.ok) return auth.state;
  const { supabase } = auth;

  const categoryId = stringField(formData, "category_id");
  if (!idRegex.test(categoryId)) return errorState("Unknown category.");

  const parsed = adminCategorySchema.safeParse({
    name: stringField(formData, "name"),
    icon: stringField(formData, "icon"),
    sort_order: stringField(formData, "sort_order"),
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const { data: existing } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("id", categoryId)
    .maybeSingle();
  if (!existing) return errorState("Category not found.");

  const slug =
    parsed.data.name === existing.name
      ? existing.slug
      : await uniqueSlug(supabase, parsed.data.name, categoryId);

  const { error } = await supabase
    .from("categories")
    .update({
      name: parsed.data.name,
      slug,
      icon: parsed.data.icon === "" ? null : parsed.data.icon,
      sort_order: parsed.data.sort_order,
    })
    .eq("id", categoryId);
  if (error) {
    if (error.code === "23505") return errorState("That name is already taken.");
    return errorState("Could not update the category — try again.");
  }

  await logAdminAction(supabase, {
    action: "category.update",
    targetType: "category",
    targetId: categoryId,
    details: { from: existing.name, to: parsed.data.name },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/browse");
  revalidatePath("/");
  return successState(`Category "${parsed.data.name}" updated.`);
}

export async function deleteCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdminContext();
  if (!auth.ok) return auth.state;
  const { supabase } = auth;

  const categoryId = stringField(formData, "category_id");
  if (!idRegex.test(categoryId)) return errorState("Unknown category.");

  const { data: existing } = await supabase
    .from("categories")
    .select("id, name")
    .eq("id", categoryId)
    .maybeSingle();
  if (!existing) return errorState("Category not found.");

  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) return errorState("Could not delete the category — try again.");

  await logAdminAction(supabase, {
    action: "category.delete",
    targetType: "category",
    targetId: categoryId,
    details: { name: existing.name },
  });

  revalidatePath("/admin/categories");
  revalidatePath("/browse");
  revalidatePath("/");
  return successState(
    `Category "${existing.name}" deleted — its listings are now uncategorised.`,
  );
}
