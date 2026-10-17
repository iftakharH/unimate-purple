"use client";

import { m } from "motion/react";
import Image from "next/image";
import { Calendar, MapPin, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { hueForStore } from "@/lib/colors";
import { formatDate, initialsOf } from "@/lib/format";
import { spring, staggerParent, bannerItem, riseItem } from "@/lib/motion";

export type StoreHeroData = {
  slug: string;
  business_name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  pickup_location: string | null;
  created_at: string;
  listingCount: number;
};

/**
 * The store page entrance: ONE orchestrated sequence (parent drives,
 * children stagger ≤6 items, total ≈650ms). Above-the-fold entrance is the
 * single allowed exception in the product UI (docs/DESIGN.md).
 */
export function StoreHero({ store }: { store: StoreHeroData }) {
  const hue = hueForStore(store.slug);

  return (
    <m.div
      variants={staggerParent}
      initial="hidden"
      animate="show"
      className="space-y-0"
    >
      <m.div
        variants={bannerItem}
        className="grain relative h-44 overflow-hidden rounded-3xl border elev-2 sm:h-60"
      >
        {store.banner_url ? (
          <Image
            src={store.banner_url}
            alt=""
            fill
            preload
            sizes="(max-width: 1280px) 100vw, 1152px"
            className="object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="ambient-drift absolute inset-0"
            style={{
              background: `linear-gradient(120deg, oklch(0.58 0.19 ${hue}) 0%, oklch(0.42 0.16 ${(hue + 50) % 360}) 100%)`,
            }}
          />
        )}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/60 to-transparent"
        />
      </m.div>

      <div className="relative px-4 sm:px-6">
        <m.div
          variants={{ hidden: { opacity: 0, y: 16, scale: 0.96 }, show: { opacity: 1, y: 0, scale: 1, transition: spring.gentle } }}
          className="-mt-10 inline-block"
        >
          <div className="relative size-20 overflow-hidden rounded-2xl border-4 border-background bg-card elev-3 sm:size-24">
            {store.logo_url ? (
              <Image src={store.logo_url} alt="" fill sizes="96px" className="object-cover" />
            ) : (
              <div className="grid size-full place-items-center bg-accent">
                <span className="text-2xl font-semibold text-accent-foreground">
                  {initialsOf(store.business_name)}
                </span>
              </div>
            )}
          </div>
        </m.div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <m.h1
            variants={riseItem}
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            {store.business_name}
          </m.h1>
          <m.div variants={riseItem}>
            <Badge variant="outline" className="gap-1.5 py-1">
              <span className="live-dot size-1.5 rounded-full bg-success" aria-hidden />
              Active store
            </Badge>
          </m.div>
        </div>

        <m.div variants={riseItem} className="mt-3 flex flex-wrap gap-2 text-xs">
          {store.pickup_location && (
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden /> {store.pickup_location}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-muted-foreground">
            <Package className="size-3.5" aria-hidden />{" "}
            <span className="tabular">{store.listingCount}</span>{" "}
            {store.listingCount === 1 ? "listing" : "listings"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-muted-foreground">
            <Calendar className="size-3.5" aria-hidden /> since{" "}
            {formatDate(store.created_at)}
          </span>
        </m.div>

        {store.description && (
          <m.p
            variants={riseItem}
            className="mt-4 max-w-2xl text-pretty text-muted-foreground"
          >
            {store.description}
          </m.p>
        )}
      </div>
    </m.div>
  );
}
