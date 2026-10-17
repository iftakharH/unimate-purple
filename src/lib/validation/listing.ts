import { z } from "zod";

/** Listing create / edit. Image URLs are validated against the caller's own
 *  storage folder in the server action (defense in depth). */
export const listingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(4, "Give the listing a real title (4+ characters)")
    .max(100, "Keep the title under 100 characters"),
  description: z.string().trim().max(2000, "Keep it under 2000 characters"),
  price_bdt: z.coerce
    .number({ error: "Enter a price in BDT" })
    .min(0, "Price cannot be negative")
    .max(1_000_000, "Price looks too high for campus"),
  category_id: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[0-9a-f-]{36}$/i.test(v), "Pick a category")
    .optional(),
  condition: z.enum(["new", "used"]),
  quantity: z.coerce
    .number({ error: "Enter a quantity" })
    .int("Whole numbers only")
    .min(1, "At least 1")
    .max(99, "Maximum 99"),
  pickup_location: z.string().trim().max(80, "Keep it short, e.g. “Library gate”"),
});

export type ListingValues = z.infer<typeof listingSchema>;

/** The order of this array is the display order of the photos. */
export const listingImagesSchema = z
  .array(z.string().url("Invalid image URL"))
  .max(8, "A listing can have at most 8 photos");

export const reportListingSchema = z.object({
  listing_id: z.uuid("Unknown listing"),
  reason: z.enum(["spam", "scam", "inappropriate", "wrong-category", "other"]),
  details: z.string().trim().max(500, "Keep it under 500 characters"),
});
