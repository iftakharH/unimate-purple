import type { Metadata } from "next";
import { Heart } from "lucide-react";
import Link from "next/link";

import { ListingCard, type CardListing } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { RemoveSavedButton } from "./remove-saved-button";

export const metadata: Metadata = { title: "Saved items" };

type SavedRow = {
  id: string;
  listings:
    | (CardListing & { stores: { business_name: string } | null })
    | null;
};

export default async function SavedPage() {
  const { supabase, user } = await requireUser();

  const { data } = await supabase
    .from("saved_items")
    .select(
      "id, created_at, listings(id, title, price_bdt, condition, quantity, listing_images(url, position), stores(business_name))",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as SavedRow[];
  const saved = rows.flatMap((row) =>
    row.listings ? [{ savedId: row.id, listing: row.listings }] : [],
  );
  const unavailableCount = rows.length - saved.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Saved items</h1>
          <p className="text-sm text-muted-foreground">
            <span className="tabular">{saved.length}</span> saved ·{" "}
            {unavailableCount > 0
              ? `${unavailableCount} no longer available`
              : "everything still up for grabs"}
          </p>
        </div>
      </div>

      {saved.length === 0 ? (
        <Card className="elev-1">
          <CardHeader className="items-center text-center">
            <Heart className="size-8 text-muted-foreground" aria-hidden />
            <CardTitle className="text-xl">Nothing saved yet</CardTitle>
            <CardDescription className="text-balance">
              Tap the heart on any listing to keep it here while you decide.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button render={<Link href="/browse" />} nativeButton={false}>
              Browse listings
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {saved.map(({ savedId, listing }) => (
            <div key={savedId} className="space-y-2">
              <ListingCard
                listing={listing}
                storeName={listing.stores?.business_name ?? null}
              />
              <RemoveSavedButton listingId={listing.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
