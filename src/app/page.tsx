import { ArrowRight, Search, ShieldCheck, Sparkles, Store } from "lucide-react";
import Link from "next/link";

import { AmbientBackdrop } from "@/components/ambient-backdrop";
import { CategoryRail } from "@/components/category-rail";
import { ListingCard, type CardListing } from "@/components/listing-card";
import { PublicHeader } from "@/components/public-header";
import { Button } from "@/components/ui/button";
import { getAuthContext } from "@/lib/auth";
import { BRAND_HUE, PARTNER_HUES } from "@/lib/colors";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const { user, profile } = await getAuthContext();
  const supabase = await createClient();

  const [categoriesRes, listingsRes, listingCountRes, storeCountRes] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name, slug, icon")
        .order("sort_order", { ascending: true }),
      supabase
        .from("listings")
        .select(
          "id, title, price_bdt, condition, quantity, listing_images(url, position), stores(business_name)",
        )
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("stores")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
    ]);

  const categories = categoriesRes.data ?? [];
  const listings = (listingsRes.data ?? []) as (CardListing & {
    stores: { business_name: string } | null;
  })[];
  const listingCount = listingCountRes.count ?? 0;
  const storeCount = storeCountRes.count ?? 0;

  const canSell = profile?.role === "seller";

  return (
    <div className="relative flex min-h-svh flex-col">
      <AmbientBackdrop hueA={BRAND_HUE} hueB={PARTNER_HUES[0]} />

      <PublicHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-16 px-4 pb-16 pt-10">
        {/* ---------- hero ---------- */}
        <section className="text-center">
          <p className="elev-1 mb-6 inline-flex items-center gap-1.5 rounded-full border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            For East Delta University students
          </p>
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            The campus marketplace,
            <span className="block bg-gradient-to-r from-primary via-[oklch(0.55_0.2_320)] to-[oklch(0.6_0.17_240)] bg-clip-text text-transparent">
              done properly.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-lg text-muted-foreground">
            Buy and sell with verified students — books, tech, dorm gear and more.
            Deal in ৳ BDT, chat in real time, meet on campus.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button render={<Link href="/browse" />} nativeButton={false} size="lg">
              <Search aria-hidden /> Browse listings
            </Button>
            {canSell ? (
              <Button
                render={<Link href="/seller/listings/new" />}
                nativeButton={false}
                size="lg"
                variant="outline"
              >
                Sell something
              </Button>
            ) : (
              <Button
                render={<Link href={user ? "/become-seller" : "/signup"} />}
                nativeButton={false}
                size="lg"
                variant="outline"
              >
                Start selling
              </Button>
            )}
          </div>

          <dl className="mt-10 flex items-center justify-center gap-8">
            <div className="text-center">
              <dd className="tabular text-2xl font-semibold">{listingCount}</dd>
              <dt className="text-xs text-muted-foreground">live listings</dt>
            </div>
            <div aria-hidden className="h-8 w-px bg-border" />
            <div className="text-center">
              <dd className="tabular text-2xl font-semibold">{storeCount}</dd>
              <dt className="text-xs text-muted-foreground">campus stores</dt>
            </div>
            <div aria-hidden className="h-8 w-px bg-border" />
            <div className="text-center">
              <dd className="flex items-center justify-center gap-1 text-2xl font-semibold">
                <ShieldCheck className="size-5 text-success" aria-hidden />
              </dd>
              <dt className="text-xs text-muted-foreground">students only</dt>
            </div>
          </dl>
        </section>

        {/* ---------- categories ---------- */}
        <section aria-labelledby="categories-heading" className="space-y-5">
          <div className="flex items-baseline justify-between">
            <h2 id="categories-heading" className="text-2xl font-semibold tracking-tight">
              Shop by category
            </h2>
            <Link
              href="/browse"
              className="text-sm font-medium text-primary hover:underline"
            >
              See all
            </Link>
          </div>
          <div className="scroll-reveal">
            <CategoryRail categories={categories} />
          </div>
        </section>

        {/* ---------- latest listings ---------- */}
        <section aria-labelledby="latest-heading" className="space-y-5">
          <div className="flex items-baseline justify-between">
            <h2 id="latest-heading" className="text-2xl font-semibold tracking-tight">
              Fresh on campus
            </h2>
            <Link
              href="/browse?sort=newest"
              className="text-sm font-medium text-primary hover:underline"
            >
              Browse everything
            </Link>
          </div>

          {listings.length === 0 ? (
            <div className="elev-1 grid place-items-center rounded-3xl border bg-card px-6 py-16 text-center">
              <Store className="size-8 text-muted-foreground" aria-hidden />
              <p className="mt-3 font-medium">The shelves are still empty</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Be the first store on campus — seller applications take a minute.
              </p>
              <Button
                render={<Link href={user ? "/become-seller" : "/signup"} />}
                nativeButton={false}
                size="sm"
                className="mt-5"
              >
                Become a seller
              </Button>
            </div>
          ) : (
            <div className="scroll-reveal grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  storeName={listing.stores?.business_name ?? null}
                />
              ))}
            </div>
          )}
        </section>

        {/* ---------- seller CTA ---------- */}
        {!canSell && (
          <section className="scroll-reveal">
            <div className="grain relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/12 via-card to-[oklch(0.85_0.08_240/0.25)] p-8 text-center dark:from-primary/20 dark:via-card dark:to-[oklch(0.35_0.08_240/0.3)]">
              <h2 className="text-2xl font-semibold tracking-tight">
                Have something gathering dust?
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Open your own campus store — an admin approves in a day, and your
                page gets its own link to share.
              </p>
              <Button
                render={<Link href={user ? "/become-seller" : "/signup"} />}
                nativeButton={false}
                className="mt-5"
              >
                Become a seller <ArrowRight aria-hidden />
              </Button>
            </div>
          </section>
        )}
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 py-6 text-center text-xs text-muted-foreground">
        Unimate · East Delta University student marketplace
      </footer>
    </div>
  );
}
