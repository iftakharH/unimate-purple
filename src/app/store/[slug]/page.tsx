import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone, Store as StoreIcon } from "lucide-react";

import { ListingCard, type CardListing } from "@/components/listing-card";
import { StoreHero } from "@/components/store-hero";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

type StorePageParams = Promise<{ slug: string }>;

async function getStore(slug: string) {
  const supabase = await createClient();
  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return store;
}

export async function generateMetadata({
  params,
}: {
  params: StorePageParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) return { title: "Store not found" };
  return {
    title: store.business_name,
    description:
      store.description ??
      `${store.business_name} — a student store on Unimate, East Delta University.`,
  };
}

export default async function StorePage({ params }: { params: StorePageParams }) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store || !store.is_active) notFound();

  const supabase = await createClient();
  const { data: listings } = await supabase
    .from("listings")
    .select(
      "id, title, price_bdt, condition, quantity, created_at, listing_images(url, position)",
    )
    .eq("store_id", store.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const activeListings = (listings ?? []) as CardListing[];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:py-8">
      <StoreHero
        store={{
          slug: store.slug,
          business_name: store.business_name,
          description: store.description,
          logo_url: store.logo_url,
          banner_url: store.banner_url,
          pickup_location: store.pickup_location,
          created_at: store.created_at,
          listingCount: activeListings.length,
        }}
      />

      <div className="flex flex-wrap items-center gap-3 px-4 sm:px-6">
        {store.contact_phone && (
          <Button
            render={<a href={`tel:${store.contact_phone}`} />}
            nativeButton={false}
            variant="outline"
            size="sm"
          >
            <Phone aria-hidden /> {store.contact_phone}
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          Open any listing to message the seller.
        </p>
      </div>

      <section
        aria-label={`Listings from ${store.business_name}`}
        className="space-y-4 px-4 sm:px-6"
      >
        <div className="scroll-reveal flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Listings</h2>
          <span className="tabular text-sm text-muted-foreground">
            {activeListings.length}
          </span>
        </div>

        {activeListings.length === 0 ? (
          <div className="scroll-reveal elev-1 grid place-items-center rounded-3xl border bg-card px-6 py-16 text-center">
            <StoreIcon className="size-8 text-muted-foreground" aria-hidden />
            <p className="mt-3 font-medium">Nothing listed yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              This store hasn&apos;t published any listings — follow it by checking
              back soon.
            </p>
            <Button
              render={<Link href="/" />}
              nativeButton={false}
              variant="outline"
              size="sm"
              className="mt-5"
            >
              Browse the marketplace
            </Button>
          </div>
        ) : (
          <div className="scroll-reveal grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {activeListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
