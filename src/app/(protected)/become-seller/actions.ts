"use server";

import { revalidatePath } from "next/cache";

import { getAuthContext } from "@/lib/auth";
import { sellerRequestSchema } from "@/lib/validation/seller";
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

export async function requestSellerAccessAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user, profile } = await getAuthContext();
  if (!user) return errorState("Your session expired — sign in again.");

  if (profile?.role === "seller") {
    return errorState("You're already a seller — manage your store from My Store.");
  }
  if (profile?.role === "admin") {
    return errorState("Admins run the platform from the admin panel.");
  }
  if (profile?.is_banned) {
    return errorState("This account is suspended.");
  }

  const parsed = sellerRequestSchema.safeParse({
    business_name: stringField(formData, "business_name"),
    description: stringField(formData, "description"),
    contact_phone: stringField(formData, "contact_phone"),
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const { error } = await supabase.from("seller_requests").insert({
    user_id: user.id,
    business_name: parsed.data.business_name,
    description: parsed.data.description === "" ? null : parsed.data.description,
    contact_phone: parsed.data.contact_phone,
  });

  if (error) {
    if (error.code === "23505") {
      return errorState("You already have a request under review — hang tight.");
    }
    return errorState("Could not send the request — please try again.");
  }

  revalidatePath("/become-seller");
  return successState(
    "Request sent! An admin will review it shortly — you'll get a notification either way.",
  );
}
