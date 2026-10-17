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
import { Magnetic } from "@/components/motion/magnetic";
import { Marquee } from "@/components/motion/marquee";
import { WordReveal } from "@/components/motion/word-reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { getAuthContext } from "@/lib/auth";
import { BRAND_HUE, PARTNER_HUES } from "@/lib/colors";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

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

const DISPLAY_CLASS =
  "text-[clamp(2.6rem,8.5vw,7rem)] font-semibold leading-[0.95] tracking-tighter";

export default async function Home() {
  const { user, profile } = await getAuthContext();
  const supabase = await createClient();

  const [categoriesRes, statsRes, listingsRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug, icon")
      .order("sort_order", { ascending: true }),
    // Aggregates only — works for signed-out visitors (migration 15).
    supabase.rpc("marketplace_stats"),
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
  const stats = statsRes.data?.[0];
  const listingCount = Number(stats?.active_listings ?? 0);
  const storeCount = Number(stats?.active_stores ?? 0);
  const canSell = profile?.role === "seller";

  return (
    <div className="relative flex min-h-svh flex-col">
      <AmbientBackdrop hueA={BRAND_HUE} hueB={PARTNER_HUES[0]} height="720px" />
      <SiteNav />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-28 sm:pt-32">
        {user ? (
          /* ============================ MARKETPLACE (signed in) ============ */
          <div className="space-y-16">
            <section className="max-w-3xl">
              <p className="elev-1 mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
                <span className="size-1.5 rounded-full bg-[var(--neon)]" aria-hidden />
                <Sparkles className="size-3.5 text-primary" aria-hidden />
                Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
              </p>
              <h1 className={DISPLAY_CLASS}>
                <WordReveal text="The campus" className="block" />
                <WordReveal text="marketplace," className="block text-primary" delay={0.12} />
                <WordReveal
                  text="done properly."
                  className="text-outline block opacity-70"
                  delay={0.24}
                />
              </h1>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Magnetic>
                  <Button render={<Link href="/browse" />} nativeButton={false} size="lg">
                    <Search aria-hidden /> Browse listings
                  </Button>
                </Magnetic>
                <Magnetic strength={8}>
                  <Button
                    render={
                      <Link href={canSell ? "/seller/listings/new" : "/become-seller"} />
                    }
                    nativeButton={false}
                    size="lg"
                    variant="outline"
                  >
                    {canSell ? "Sell something" : "Start selling"}
                  </Button>
                </Magnetic>
              </div>

              <dl className="mt-10 flex items-center gap-8">
                <div>
                  <dd className="tabular text-3xl font-semibold">{listingCount}</dd>
                  <dt className="text-xs text-muted-foreground">live listings</dt>
                </div>
                <div aria-hidden className="h-9 w-px bg-border" />
                <div>
                  <dd className="tabular text-3xl font-semibold">{storeCount}</dd>
                  <dt className="text-xs text-muted-foreground">campus stores</dt>
                </div>
                <div aria-hidden className="h-9 w-px bg-border" />
                <div>
                  <dd className="flex items-center gap-1 text-3xl font-semibold">
                    <ShieldCheck className="size-6 text-success" aria-hidden />
                  </dd>
                  <dt className="text-xs text-muted-foreground">students only</dt>
                </div>
              </dl>
            </section>

            <Marquee items={categories.map((category) => category.name)} />

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
                    render={
                      <Link href={canSell ? "/seller/listings/new" : "/become-seller"} />
                    }
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
                  <Magnetic className="mt-5">
                    <Button render={<Link href="/become-seller" />} nativeButton={false}>
                      Become a seller <ArrowRight aria-hidden />
                    </Button>
                  </Magnetic>
                </div>
              </section>
            )}
          </div>
        ) : (
          /* ============================== LANDING (signed out) ============= */
          <div>
            {/* hero — deliberately asymmetric: type first, offset stat card */}
            <section className="grid items-end gap-10 lg:grid-cols-[1.3fr_0.7fr]">
              <div>
                <p className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-[var(--neon)]" aria-hidden />
                  For East Delta University students
                </p>
                <h1 className={DISPLAY_CLASS}>
                  <WordReveal text="The campus" className="block" />
                  <WordReveal text="marketplace," className="block text-primary" delay={0.1} />
                  <WordReveal
                    text="done properly."
                    className="text-outline block opacity-70"
                    delay={0.2}
                  />
                </h1>

                <p className="mt-6 max-w-md text-lg text-pretty text-muted-foreground">
                  Buy and sell with verified students. Create your account with your
                  East Delta University email and the marketplace unlocks straight away.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Magnetic>
                    <Button render={<Link href="/signup" />} nativeButton={false} size="lg">
                      Create free account <ArrowRight aria-hidden />
                    </Button>
                  </Magnetic>
                  <Magnetic strength={8}>
                    <Button
                      render={<Link href="/login" />}
                      nativeButton={false}
                      size="lg"
                      variant="ghost"
                      className="rounded-full border border-foreground/15"
                    >
                      Sign in
                    </Button>
                  </Magnetic>
                </div>
              </div>

              {/* offset column — a glass card, dropped lower than the type */}
              <div className="lg:pb-4 lg:pl-4">
                <div className="glass rounded-3xl p-6 sm:p-7">
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    <LockKeyhole className="size-3.5 text-primary" aria-hidden />
                    Right now inside
                  </p>
                  <p className="mt-5 flex items-baseline gap-3">
                    <span className="tabular text-5xl font-semibold tracking-tighter">
                      {listingCount}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      live listing{listingCount === 1 ? "" : "s"}
                    </span>
                  </p>
                  <p className="mt-2 flex items-baseline gap-3">
                    <span className="tabular text-5xl font-semibold tracking-tighter">
                      {storeCount}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      campus store{storeCount === 1 ? "" : "s"}
                    </span>
                  </p>
                  <p className="mt-6 border-t pt-4 text-sm text-muted-foreground">
                    Products are for students only —{" "}
                    <Link
                      href="/login"
                      className="font-medium text-primary hover:underline"
                    >
                      sign in
                    </Link>{" "}
                    to browse everything.
                  </p>
                </div>
              </div>
            </section>

            {/* marquee divider — horizontal, kinetic, zero grid */}
            <Marquee
              className="mt-16 sm:mt-20"
              items={categories.map((category) => category.name)}
            />

            {/* bento categories — uneven tiles, two heroes first */}
            <section aria-labelledby="categories-heading" className="mt-16 space-y-5">
              <div className="flex items-baseline justify-between">
                <h2
                  id="categories-heading"
                  className="text-3xl font-semibold tracking-tighter sm:text-4xl"
                >
                  What campus trades
                </h2>
                <Link
                  href="/login"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  See everything
                </Link>
              </div>
              <div className="scroll-reveal">
                <CategoryRail categories={categories} variant="bento" />
              </div>
            </section>

            {/* features — horizontal snap scroller instead of a 3-col grid */}
            <section aria-labelledby="features-heading" className="mt-16 space-y-5">
              <div className="flex items-baseline justify-between">
                <h2
                  id="features-heading"
                  className="text-3xl font-semibold tracking-tighter sm:text-4xl"
                >
                  What&apos;s inside
                </h2>
                <span className="hidden text-xs uppercase tracking-[0.2em] text-muted-foreground sm:block">
                  Scroll →
                </span>
              </div>

              <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2">
                {FEATURES.map((feature, index) => {
                  const Icon = feature.icon;
                  const hue = PARTNER_HUES[index + 1];
                  return (
                    <article
                      key={feature.title}
                      className={cn(
                        "elev-1 w-[78%] min-w-[280px] max-w-[360px] shrink-0 snap-start rounded-3xl border bg-card p-6 transition-[transform,box-shadow] duration-base ease-out-soft hover:-translate-y-1 hover:elev-2 sm:w-[46%]",
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div
                          className="grid size-12 place-items-center rounded-2xl text-foreground/70"
                          style={{
                            backgroundImage: `linear-gradient(135deg, oklch(0.82 0.12 ${hue} / 0.55), oklch(0.85 0.1 ${hue} / 0.42))`,
                          }}
                        >
                          <Icon className="size-6" aria-hidden />
                        </div>
                        <span className="tabular text-sm text-muted-foreground">
                          0{index + 1}
                        </span>
                      </div>
                      <h3 className="mt-6 text-xl font-semibold tracking-tight">
                        {feature.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {feature.copy}
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* closing CTA — inverted block, brutalist contrast */}
            <section className="mt-16 sm:mt-20">
              <div className="relative overflow-hidden rounded-3xl bg-foreground px-6 py-16 text-center text-background sm:px-12">
                <p className="text-xs font-medium uppercase tracking-[0.3em] opacity-60">
                  East Delta University · BDT
                </p>
                <h2 className="mx-auto mt-5 max-w-2xl text-[clamp(2rem,5.5vw,3.75rem)] font-semibold leading-[1.02] tracking-tighter">
                  Your campus,
                  <br />
                  your marketplace.
                </h2>
                <p className="mx-auto mt-4 max-w-md text-sm opacity-70">
                  One minute to sign up with your university email — your first browse
                  is right after.
                </p>
                <Magnetic className="mt-8">
                  <Button
                    render={<Link href="/signup" />}
                    nativeButton={false}
                    size="lg"
                    className="bg-background text-foreground hover:bg-[var(--neon)] hover:text-[var(--neon-ink)]"
                  >
                    Create free account <ArrowRight aria-hidden />
                  </Button>
                </Magnetic>
              </div>
            </section>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
