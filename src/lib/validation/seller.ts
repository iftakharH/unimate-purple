import { z } from "zod";

const bdPhoneRegex = /^(\+?880|0)1[3-9]\d{8}$/;

/** "Become a seller" application. */
export const sellerRequestSchema = z.object({
  business_name: z
    .string()
    .trim()
    .min(2, "Give your store a name (2+ characters)")
    .max(60, "Keep the business name under 60 characters"),
  description: z.string().trim().max(300, "Keep it under 300 characters"),
  contact_phone: z
    .string()
    .trim()
    .regex(bdPhoneRegex, "Enter a valid BD phone, e.g. 01XXXXXXXXX"),
});

/** Store editor (seller). */
export const storeUpdateSchema = z.object({
  business_name: z
    .string()
    .trim()
    .min(2, "Give your store a name (2+ characters)")
    .max(60, "Keep the business name under 60 characters"),
  description: z.string().trim().max(400, "Keep it under 400 characters"),
  contact_phone: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || bdPhoneRegex.test(value),
      "Enter a valid BD phone, e.g. 01XXXXXXXXX",
    ),
  pickup_location: z.string().trim().max(80, "Keep it short, e.g. “Library gate”"),
});

/** Admin review decision. */
export const reviewRequestSchema = z.object({
  request_id: z.uuid("Unknown request"),
  decision: z.enum(["approved", "rejected"]),
  admin_note: z.string().trim().max(300, "Keep the note under 300 characters"),
});
