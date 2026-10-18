import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Calendar,
  MapPin,
  Pencil,
  Store as StoreIcon,
} from "lucide-react";

import { ListingCard, type CardListing } from "@/components/listing-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { BRAND_HUE_RANGE, hueFromKey } from "@/lib/colors";
import { formatDate, initialsOf } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type ProfileParams = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: ProfileParams;
}): Promise<Metadata> {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { title: "Profile" };
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_profiles")
    .select("full_name")
    .eq("id", id)
    .maybeSingle();
  return { title: data?.full_name || "Profile" };
}

/**
 * Public profile (spec §5): the safe public fields only, the seller's store
 * card, and — for signed-in viewers, like every marketplace surface — their
 * active listings. The listing page and store page both link here.
 */
export default async function ProfilePage({ params }: { params: ProfileParams }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase, user } = await requireUser();

  const [profileRes, storeRes, listingsRes] = await Promise.all([
    supabase
      .from("public_profiles")
      .select("id, full_name, avatar_url, bio, role, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("stores")
      .select("id, business_name, slug, logo_url, description, pickup_location")
      .eq("owner_id", id)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("listings")
      .select("id, title, price_bdt, condition, quantity, listing_images(url, position)")
      .eq("seller_id", id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(24),
  ]);

  const profile = profileRes.data;
  if (!profile) notFound();

  const store = storeRes.data;
  const listings = (listingsRes.data ?? []) as CardListing[];
  const isSelf = user.id === profile.id;
  const hue = hueFromKey(id, BRAND_HUE_RANGE);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* banner + avatar + identity */}
      <section>
        <div
          aria-hidden
          className="grain h-32 rounded-3xl border elev-2 sm:h-40"
          style={{
            backgroundImage: `linear-gradient(120deg, oklch(0.62 0.17 ${hue}) 0%, oklch(0.45 0.15 ${(hue + 45) % 360}) 100%)`,
          }}
        />

        <div className="relative -mt-12 px-4 sm:px-6">
          <div className="relative size-24 overflow-hidden rounded-full border-4 border-background bg-card elev-3 sm:size-28">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt=""
                fill
                sizes="112px"
                className="object-cover"
              />
            ) : (
              <div className="grid size-full place-items-center bg-accent text-2xl font-semibold text-accent-foreground">
                {initialsOf(profile.full_name ?? "", "U")}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {profile.full_name || "Unimate member"}
            </h1>
            {profile.role === "seller" ? (
              <Badge variant="outline" className="gap-1.5 py-1">
                <BadgeCheck className="size-3.5 text-primary" aria-hidden />
                Seller
              </Badge>
            ) : null}
            {profile.role === "admin" ? (
              <Badge variant="outline" className="py-1">
                Admin
              </Badge>
            ) : null}
            {isSelf ? (
              <Button
                render={<Link href="/settings" />}
                nativeButton={false}
                variant="outline"
                size="sm"
                className="ml-auto"
              >
                <Pencil aria-hidden /> Edit profile
              </Button>
            ) : null}
          </div>

          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3.5" aria-hidden /> Member since{" "}
            {formatDate(profile.created_at)}
          </p>

          {profile.bio ? (
            <p className="mt-4 max-w-2xl text-pretty text-muted-foreground">
              {profile.bio}
            </p>
          ) : null}
        </div>
      </section>

      {/* store card */}
      {store ? (
        <section className="elev-1 flex flex-wrap items-center gap-4 rounded-3xl border bg-card p-4 sm:p-5">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl border bg-accent">
            {store.logo_url ? (
              <Image src={store.logo_url} alt="" fill sizes="56px" className="object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-lg font-semibold text-accent-foreground">
                {initialsOf(store.business_name)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{store.business_name}</p>
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {store.description ?? "A student store on Unimate."}
            </p>
            {store.pickup_location ? (
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5" aria-hidden /> {store.pickup_location}
              </p>
            ) : null}
          </div>
          <Button
            render={<Link href={`/store/${store.slug}`} />}
            nativeButton={false}
            size="sm"
          >
            <StoreIcon aria-hidden /> Visit store
          </Button>
        </section>
      ) : null}

      {/* their active listings (sign-in gated, like all marketplace data) */}
      <section aria-label="Active listings" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Active listings</h2>
          <span className="tabular text-sm text-muted-foreground">
            {listings.length}
          </span>
        </div>

        {listings.length === 0 ? (
          <div className="elev-1 grid place-items-center rounded-3xl border bg-card px-6 py-14 text-center">
            <StoreIcon className="size-8 text-muted-foreground" aria-hidden />
            <p className="mt-3 font-medium">Nothing on sale right now</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {isSelf
                ? "Publish a listing and it will show up here."
                : "Check back later — or browse the rest of the marketplace."}
            </p>
            <Button
              render={
                <Link href={isSelf && profile.role === "seller" ? "/seller/listings/new" : "/browse"} />
              }
              nativeButton={false}
              variant="outline"
              size="sm"
              className="mt-5"
            >
              {isSelf && profile.role === "seller" ? "Add a listing" : "Browse listings"}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
