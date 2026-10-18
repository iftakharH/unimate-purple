import { z } from "zod";

export const dealRequestSchema = z.object({
  quantity: z.coerce
    .number({ error: "Enter a quantity" })
    .int("Whole numbers only")
    .min(1, "At least 1")
    .max(99, "Maximum 99"),
  amount_bdt: z.coerce
    .number({ error: "Enter an offer amount in BDT" })
    .min(1, "Offer at least ৳1")
    .max(1_000_000, "That amount looks off"),
  payment_mode: z.enum(["pay_on_campus", "pay_in_app"], {
    error: "Pick how you want to pay",
  }),
  buyer_note: z.string().trim().max(400, "Keep the note under 400 characters"),
});

export const cancelDealSchema = z.object({
  reason: z.string().trim().max(200, "Keep it under 200 characters"),
});

export const payDealSchema = z.object({
  method: z.enum(["card", "mobile_wallet", "bank"], {
    error: "Pick a payment method",
  }),
});
