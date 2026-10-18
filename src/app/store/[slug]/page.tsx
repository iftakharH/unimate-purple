import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Phone, Store as StoreIcon, UserRound } from "lucide-react";

import { AmbientBackdrop } from "@/components/ambient-backdrop";
import { ListingCard, type CardListing } from "@/components/listing-card";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { StoreHero } from "@/components/store-hero";
import { Button } from "@/components/ui/button";
import { getAuthContext } from "@/lib/auth";
import { BRAND_HUE, PARTNER_HUES } from "@/lib/colors";
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
  const { user } = await getAuthContext();
  if (!user) return { title: "Sign in" };
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

  // Marketplace access requires sign-in (ADR-015).
  const { user } = await getAuthContext();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/store/${slug}`)}`);

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
    <div className="relative flex min-h-svh flex-col">
      <AmbientBackdrop hueA={BRAND_HUE} hueB={PARTNER_HUES[1]} height="480px" />
      <SiteNav />

      <div className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 pb-6 pt-24 sm:pt-28">
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
        <Button
          render={<Link href={`/profile/${store.owner_id}`} />}
          nativeButton={false}
          variant="outline"
          size="sm"
        >
          <UserRound aria-hidden /> Seller profile
        </Button>
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

      <SiteFooter />
    </div>
  );
}
