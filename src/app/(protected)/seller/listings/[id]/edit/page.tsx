import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { DeleteListing } from "../../delete-listing";
import { ListingForm } from "../../listing-form";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase, user } = await requireUser();

  const [listingRes, imagesRes, categoriesRes, storeRes] = await Promise.all([
    supabase.from("listings").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("listing_images")
      .select("url, position")
      .eq("listing_id", id)
      .order("position", { ascending: true }),
    supabase
      .from("categories")
      .select("id, name")
      .order("sort_order", { ascending: true }),
    supabase
      .from("stores")
      .select("pickup_location")
      .eq("owner_id", user.id)
      .maybeSingle(),
  ]);

  const listing = listingRes.data;
  if (!listing || listing.seller_id !== user.id) notFound();

  const photosHint = sp.photos === "1";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit listing</h1>
        <p className="text-sm text-muted-foreground">
          Changes go live immediately. Removing a photo deletes the file too.
        </p>
      </div>

      {photosHint && (
        <p className="flex items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <Sparkles className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
          Your listing is already live — add its photos below and save.
        </p>
      )}

      <Card className="elev-1">
        <CardHeader>
          <CardTitle className="text-base">Listing details</CardTitle>
          <CardDescription>Everything buyers will see.</CardDescription>
        </CardHeader>
        <CardContent>
          <ListingForm
            mode="edit"
            userId={user.id}
            listingId={listing.id}
            categories={categoriesRes.data ?? []}
            defaults={{
              title: listing.title,
              description: listing.description ?? "",
              price_bdt: String(listing.price_bdt),
              category_id: listing.category_id ?? "",
              condition: listing.condition,
              quantity: String(listing.quantity),
              pickup_location: listing.pickup_location ?? "",
            }}
            initialImages={(imagesRes.data ?? []).map((image) => image.url)}
            storePickup={storeRes.data?.pickup_location ?? null}
          />

          <div className="mt-8">
            <DeleteListing listingId={listing.id} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
