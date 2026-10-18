import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  BadgeCheck,
  Calendar,
  MapPin,
  Pencil,
  Package,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { AmbientBackdrop } from "@/components/ambient-backdrop";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getAuthContext } from "@/lib/auth";
import { BRAND_HUE, PARTNER_HUES } from "@/lib/colors";
import { formatBdt, formatDate, initialsOf } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { Gallery } from "./gallery";
import { MakeOfferButton } from "./make-offer";
import { MessageSellerButton } from "./message-seller";
import { ReportListing } from "./report-listing";
import { SaveButton } from "./save-button";

type ListingParams = Promise<{ id: string }>;

async function getListing(id: string) {
  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("*, stores(*), categories(name, slug)")
    .eq("id", id)
    .maybeSingle();
  return listing;
}

export async function generateMetadata({
  params,
}: {
  params: ListingParams;
}): Promise<Metadata> {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { title: "Listing not found" };
  const { user } = await getAuthContext();
  if (!user) return { title: "Sign in" };
  const listing = await getListing(id);
  if (!listing) return { title: "Listing not found" };
  return {
    title: listing.title,
    description: listing.description?.slice(0, 160) ?? undefined,
  };
}

export default async function ListingPage({
  params,
  searchParams,
}: {
  params: ListingParams;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  // Marketplace access requires sign-in (ADR-015) — check BEFORE the query so
  // anonymous visitors get the login redirect, not a 404.
  const { user, profile } = await getAuthContext();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/listing/${id}`)}`);

  const listing = await getListing(id);
  if (!listing) notFound();

  const sp = await searchParams;
  const justCreated = sp.created === "1";

  const supabase = await createClient();
  const isOwner = user?.id === listing.seller_id;
  const isAdmin = profile?.role === "admin";

  const [imagesRes, sellerRes, savedRes] = await Promise.all([
    supabase
      .from("listing_images")
      .select("url, position")
      .eq("listing_id", listing.id)
      .order("position", { ascending: true }),
    supabase
      .from("public_profiles")
      .select("id, full_name, avatar_url, bio")
      .eq("id", listing.seller_id)
      .maybeSingle(),
    supabase
      .from("saved_items")
      .select("id")
      .eq("user_id", user.id)
      .eq("listing_id", listing.id)
      .maybeSingle(),
  ]);

  const images = imagesRes.data ?? [];
  const seller = sellerRes.data;
  const initiallySaved = Boolean(savedRes.data);
  const store = listing.stores;
  const isActive = listing.status === "active";

  return (
    <div className="relative flex min-h-svh flex-col">
      <AmbientBackdrop hueA={PARTNER_HUES[2]} hueB={BRAND_HUE} height="440px" />
      <SiteNav />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 pb-16 pt-24 sm:pt-28">
        {justCreated && (
          <div className="flex items-center gap-2 rounded-2xl border border-success/40 bg-success/5 px-4 py-3 text-sm">
            <Sparkles className="size-4 text-success" aria-hidden />
            Your listing is live — share it with the link in your browser any time.
          </div>
        )}

        {!isActive && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
            <TriangleAlert className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
            <span className="font-medium capitalize">This listing is {listing.status.replace("_", " ")}.</span>
            <span className="text-muted-foreground">
              Only you {isAdmin ? "and admins " : ""}can see it in this state.
            </span>
            {isOwner && (
              <Button
                render={<Link href={`/seller/listings/${listing.id}/edit`} />}
                nativeButton={false}
                variant="outline"
                size="sm"
                className="ml-auto"
              >
                <Pencil aria-hidden /> Manage
              </Button>
            )}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            <Gallery listingId={listing.id} title={listing.title} images={images} />

            <section aria-labelledby="about-heading" className="space-y-3">
              <h2 id="about-heading" className="text-lg font-semibold tracking-tight">
                About this item
              </h2>
              <p className="whitespace-pre-line text-pretty text-sm leading-relaxed text-muted-foreground">
                {listing.description?.trim() || "The seller hasn't added a description."}
              </p>
            </section>

            <section aria-label="Details" className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-muted-foreground">
                <Package className="size-3.5" aria-hidden />
                <span className="tabular">{listing.quantity}</span>
                {listing.quantity === 1 ? "available" : "available"}
              </span>
              {listing.categories && (
                <Link
                  href={`/browse?category=${listing.categories.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-muted-foreground transition-colors duration-fast hover:text-foreground"
                >
                  {listing.categories.name}
                </Link>
              )}
              {listing.pickup_location && (
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-muted-foreground">
                  <MapPin className="size-3.5" aria-hidden /> {listing.pickup_location}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-muted-foreground">
                <Calendar className="size-3.5" aria-hidden /> posted {formatDate(listing.created_at)}
              </span>
            </section>

            <section aria-label="Report" className="border-t pt-4">
              <ReportListing listingId={listing.id} isAuthed={Boolean(user)} />
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <Card className="elev-2">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="tabular text-3xl font-semibold">
                      {formatBdt(listing.price_bdt)}
                    </CardTitle>
                    <CardDescription className="mt-1 line-clamp-2 text-balance">
                      {listing.title}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={listing.condition === "new" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {listing.condition}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!isOwner && isActive && (
                  <MakeOfferButton
                    listingId={listing.id}
                    price={listing.price_bdt}
                    maxQuantity={listing.quantity}
                  />
                )}
                <div className="flex gap-2">
                  <SaveButton
                    listingId={listing.id}
                    isAuthed={Boolean(user)}
                    initiallySaved={initiallySaved}
                  />
                  {isOwner ? (
                    <Button
                      render={<Link href={`/seller/listings/${listing.id}/edit`} />}
                      nativeButton={false}
                      variant="outline"
                      className="flex-1"
                    >
                      <Pencil aria-hidden /> Edit
                    </Button>
                  ) : (
                    <MessageSellerButton listingId={listing.id} />
                  )}
                </div>
                <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                  <ShieldCheck className="size-3.5 text-success" aria-hidden />
                  Meet in public spots — library, cafeteria, main gate.
                </p>
              </CardContent>
            </Card>

            {store && (
              <Card className="elev-1">
                <CardHeader>
                  <CardDescription>Sold by</CardDescription>
                  <div className="flex items-center gap-3">
                    <div className="relative size-11 shrink-0 overflow-hidden rounded-xl border bg-accent">
                      {store.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={store.logo_url}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="grid size-full place-items-center text-sm font-semibold text-accent-foreground">
                          {initialsOf(store.business_name)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">
                        {store.business_name}
                      </CardTitle>
                      <Link
                        href={`/store/${store.slug}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Visit store page →
                      </Link>
                    </div>
                  </div>
                </CardHeader>
                {seller && (
                  <CardContent className="flex items-center gap-2.5 border-t pt-4">
                    <Avatar size="sm">
                      {seller.avatar_url ? (
                        <AvatarImage src={seller.avatar_url} alt="" />
                      ) : null}
                      <AvatarFallback>
                        {initialsOf(seller.full_name ?? "", "U")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 truncate text-sm font-medium">
                        <Link
                          href={`/profile/${seller.id}`}
                          className="truncate hover:underline"
                        >
                          {seller.full_name ?? "Unimate seller"}
                        </Link>
                        <BadgeCheck className="size-3.5 text-primary" aria-hidden />
                      </p>
                      {seller.bio ? (
                        <p className="truncate text-xs text-muted-foreground">{seller.bio}</p>
                      ) : null}
                      <Link
                        href={`/profile/${seller.id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        View profile →
                      </Link>
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
