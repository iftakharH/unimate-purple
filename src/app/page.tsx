import {
  ArrowRight,
  Handshake,
  LockKeyhole,
  MessagesSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import Link from "next/link";

import { AmbientBackdrop } from "@/components/ambient-backdrop";
import { CategoryRail } from "@/components/category-rail";
import { ListingCard, type CardListing } from "@/components/listing-card";
import { PublicHeader } from "@/components/public-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { getAuthContext } from "@/lib/auth";
import { BRAND_HUE, PARTNER_HUES } from "@/lib/colors";
import { createClient } from "@/lib/supabase/server";

const GRADIENT_TEXT =
  "block bg-gradient-to-r from-primary via-[oklch(0.55_0.2_320)] to-[oklch(0.6_0.17_240)] bg-clip-text text-transparent";

/** What the marketplace is — landing copy for signed-out visitors. */
const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Verified campus only",
    copy: "Every account is checked against an East Delta University email address — the marketplace stays students-only.",
  },
  {
    icon: Handshake,
    title: "Deals you can track",
    copy: "Offers, payments and handover status in one place — buyer and seller always on the same page.",
  },
  {
    icon: MessagesSquare,
    title: "Real-time chat",
    copy: "Message a seller right from a listing and agree where on campus to meet up.",
  },
] as const;

export default async function Home() {
  const { user, profile } = await getAuthContext();
  const supabase = await createClient();

  const [categoriesRes, listingCountRes, storeCountRes, listingsRes] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name, slug, icon")
        .order("sort_order", { ascending: true }),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("stores")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      user
        ? supabase
            .from("listings")
            .select(
              "id, title, price_bdt, condition, quantity, listing_images(url, position), stores(business_name)",
            )
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(8)
        : Promise.resolve({ data: [] }),
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
      <AmbientBackdrop hueA={BRAND_HUE} hueB={PARTNER_HUES[0]} height="700px" />
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
            <span className={GRADIENT_TEXT}>done properly.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-lg text-muted-foreground">
            {user
              ? "Buy and sell with verified students — books, tech, dorm gear and more. Deal in ৳ BDT, chat in real time, meet on campus."
              : "Buy and sell with verified students. Create your account with your East Delta University email and the marketplace unlocks straight away."}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <>
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
                    render={<Link href="/become-seller" />}
                    nativeButton={false}
                    size="lg"
                    variant="outline"
                  >
                    Start selling
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button render={<Link href="/signup" />} nativeButton={false} size="lg">
                  Create free account <ArrowRight aria-hidden />
                </Button>
                <Button
                  render={<Link href="/login" />}
                  nativeButton={false}
                  size="lg"
                  variant="outline"
                >
                  Sign in
                </Button>
              </>
            )}
          </div>

          {user ? (
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
          ) : (
            <p className="elev-1 mx-auto mt-10 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border bg-card px-5 py-2.5 text-sm text-muted-foreground">
              <LockKeyhole className="size-4 text-primary" aria-hidden />
              <span>
                <span className="tabular font-medium text-foreground">
                  {listingCount}
                </span>{" "}
                listings live from{" "}
                <span className="tabular font-medium text-foreground">
                  {storeCount}
                </span>{" "}
                campus {storeCount === 1 ? "store" : "stores"} —
                <Link href="/login" className="ml-1 font-medium text-primary hover:underline">
                  sign in
                </Link>{" "}
                to browse
              </span>
            </p>
          )}
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

        {user ? (
          <>
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
                    render={<Link href={canSell ? "/seller/listings/new" : "/become-seller"} />}
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
                    render={<Link href="/become-seller" />}
                    nativeButton={false}
                    className="mt-5"
                  >
                    Become a seller <ArrowRight aria-hidden />
                  </Button>
                </div>
              </section>
            )}
          </>
        ) : (
          <>
            {/* ---------- what's inside (landing) ---------- */}
            <section aria-labelledby="features-heading" className="space-y-5">
              <div className="text-center">
                <h2 id="features-heading" className="text-2xl font-semibold tracking-tight">
                  What&apos;s inside
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  A marketplace built for how campus actually trades — not a
                  classifieds page with a coat of paint.
                </p>
              </div>
              <div className="scroll-reveal grid gap-4 sm:grid-cols-3">
                {FEATURES.map((feature, index) => {
                  const Icon = feature.icon;
                  const hue = PARTNER_HUES[index + 1];
                  return (
                    <div
                      key={feature.title}
                      className="elev-1 rounded-2xl border bg-card p-5 transition-[transform,box-shadow] duration-base ease-out-soft hover:-translate-y-0.5 hover:elev-2"
                    >
                      <div
                        className="grid size-10 place-items-center rounded-xl text-foreground/70"
                        style={{
                          backgroundImage: `linear-gradient(135deg, oklch(0.82 0.12 ${hue} / 0.5), oklch(0.85 0.1 ${hue} / 0.42))`,
                        }}
                      >
                        <Icon className="size-5" aria-hidden />
                      </div>
                      <h3 className="mt-4 font-medium">{feature.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {feature.copy}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ---------- closing CTA (landing) ---------- */}
            <section className="scroll-reveal">
              <div className="grain relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/12 via-card to-[oklch(0.85_0.08_240/0.25)] p-8 text-center dark:from-primary/20 dark:via-card dark:to-[oklch(0.35_0.08_240/0.3)]">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Your campus, your marketplace
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                  Sign up with your East Delta University email — it takes a minute
                  and your first browse is right after.
                </p>
                <Button render={<Link href="/signup" />} nativeButton={false} className="mt-5">
                  Create free account <ArrowRight aria-hidden />
                </Button>
              </div>
            </section>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
