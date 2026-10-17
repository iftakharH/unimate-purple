import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatBdt, initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CardListing = {
  id: string;
  title: string;
  price_bdt: number;
  condition: "new" | "used";
  quantity: number;
  listing_images: { url: string; position: number }[];
};

/**
 * Shared listing card. Hover lift is CSS-only (transform + shadow) — cheap,
 * interruptible, and off the JavaScript budget. Reused by the store page now
 * and the browse/home grids in Phase 4.
 */
export function ListingCard({
  listing,
  className,
}: {
  listing: CardListing;
  className?: string;
}) {
  const image = [...listing.listing_images].sort(
    (a, b) => a.position - b.position,
  )[0];

  return (
    <Link
      href={`/listing/${listing.id}`}
      className={cn(
        "group block overflow-hidden rounded-2xl border bg-card outline-none transition-[transform,box-shadow] duration-base ease-out-soft elev-1 hover:-translate-y-0.5 hover:elev-2 focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-accent/60">
        {image ? (
          <Image
            src={image.url}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-slow ease-out-soft group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid size-full place-items-center">
            <span className="text-3xl font-semibold text-primary/50">
              {initialsOf(listing.title)}
            </span>
          </div>
        )}

        <div className="absolute left-2 top-2">
          <Badge
            variant={listing.condition === "new" ? "default" : "secondary"}
            className="capitalize"
          >
            {listing.condition}
          </Badge>
        </div>

        {listing.quantity > 1 && (
          <span className="tabular absolute bottom-2 right-2 rounded-full bg-background/85 px-2 py-0.5 text-xs font-medium">
            {listing.quantity} left
          </span>
        )}
      </div>

      <div className="space-y-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium">{listing.title}</h3>
        <p className="tabular text-base font-semibold">
          {formatBdt(listing.price_bdt)}
        </p>
      </div>
    </Link>
  );
}
