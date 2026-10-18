import { z } from "zod";

const idRegex = /^[0-9a-f-]{36}$/i;

export const adminUserRoleSchema = z.object({
  role: z.enum(["buyer", "seller", "admin"], { error: "Pick a role" }),
});

export const adminListingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "At least 3 characters")
    .max(120, "Keep the title under 120 characters"),
  price_bdt: z.coerce
    .number({ error: "Enter a price in BDT" })
    .min(0, "Price cannot be negative")
    .max(10_000_000, "That price looks off"),
  quantity: z.coerce
    .number({ error: "Enter a quantity" })
    .int("Whole numbers only")
    .min(0, "Cannot be negative")
    .max(999, "Maximum 999"),
  condition: z.enum(["new", "used"], { error: "Pick a condition" }),
  status: z.enum(["active", "sold", "sold_out", "hidden"], {
    error: "Pick a status",
  }),
  category_id: z
    .string()
    .refine((value) => value === "" || idRegex.test(value), "Unknown category")
    .optional(),
  pickup_location: z.string().trim().max(120, "Keep it under 120 characters"),
});

export const adminStoreSchema = z.object({
  business_name: z
    .string()
    .trim()
    .min(2, "At least 2 characters")
    .max(80, "Keep the name under 80 characters"),
  description: z.string().trim().max(600, "Keep it under 600 characters"),
  pickup_location: z.string().trim().max(120, "Keep it under 120 characters"),
  contact_phone: z.string().trim().max(20, "Keep it under 20 characters"),
});

export const adminCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "At least 2 characters")
    .max(40, "Keep it under 40 characters"),
  icon: z.string().trim().max(40, "Keep it under 40 characters"),
  sort_order: z.coerce
    .number({ error: "Enter a sort order" })
    .int("Whole numbers only")
    .min(0, "Cannot be negative")
    .max(999, "Maximum 999"),
});

export const adminReportDecisionSchema = z.object({
  decision: z.enum(["reviewed", "dismissed"], { error: "Pick a decision" }),
});

export const adminDealTargetSchema = z.object({
  target: z.enum(["cancelled", "completed"], { error: "Pick an action" }),
});

export const adminReasonSchema = z.object({
  reason: z.string().trim().max(300, "Keep it under 300 characters"),
});

export { idRegex };
