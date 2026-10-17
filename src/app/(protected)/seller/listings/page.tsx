import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Eye, PackagePlus, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { formatBdt, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "My listings" };

const STATUS_VARIANT = {
  active: "default",
  sold: "secondary",
  sold_out: "outline",
  hidden: "outline",
} as const;

export default async function SellerListingsPage() {
  const { supabase, user } = await requireUser();

  const { data: listings } = await supabase
    .from("listings")
    .select(
      "id, title, price_bdt, status, condition, quantity, created_at, updated_at, listing_images(url, position)",
    )
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  const rows = listings ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My listings</h1>
          <p className="text-sm text-muted-foreground">
            <span className="tabular">{rows.length}</span> total · everything you have
            on the marketplace.
          </p>
        </div>
        <Button render={<Link href="/seller/listings/new" />} nativeButton={false} size="sm">
          <PackagePlus aria-hidden /> New listing
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card className="elev-1">
          <CardHeader className="items-center text-center">
            <PackagePlus className="size-8 text-muted-foreground" aria-hidden />
            <CardTitle className="text-xl">Nothing listed yet</CardTitle>
            <CardDescription className="text-balance">
              Your first listing takes two minutes — snap a few photos, set a price,
              publish.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button render={<Link href="/seller/listings/new" />} nativeButton={false}>
              Create your first listing
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((listing) => {
            const cover = [...listing.listing_images].sort(
              (a, b) => a.position - b.position,
            )[0];

            return (
              <div
                key={listing.id}
                className="elev-1 flex items-center gap-4 rounded-2xl border bg-card p-3"
              >
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border bg-muted/50">
                  {cover ? (
                    <Image src={cover.url} alt="" fill sizes="64px" className="object-cover" />
                  ) : (
                    <span className="grid size-full place-items-center text-xs text-muted-foreground">
                      no photo
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/listing/${listing.id}`}
                    className="line-clamp-1 font-medium hover:underline"
                  >
                    {listing.title}
                  </Link>
                  <p className="tabular mt-0.5 text-sm text-muted-foreground">
                    {formatBdt(listing.price_bdt)} · {listing.condition} ·{" "}
                    {listing.quantity} in stock · updated {formatDate(listing.updated_at)}
                  </p>
                </div>

                <Badge
                  variant={STATUS_VARIANT[listing.status] ?? "outline"}
                  className="capitalize"
                >
                  {listing.status.replace("_", " ")}
                </Badge>

                <div className="flex shrink-0 gap-1.5">
                  <Button
                    render={<Link href={`/listing/${listing.id}`} />}
                    nativeButton={false}
                    variant="ghost"
                    size="icon-sm"
                    aria-label="View public page"
                  >
                    <Eye aria-hidden />
                  </Button>
                  <Button
                    render={<Link href={`/seller/listings/${listing.id}/edit`} />}
                    nativeButton={false}
                    variant="outline"
                    size="icon-sm"
                    aria-label="Edit listing"
                  >
                    <Pencil aria-hidden />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
