import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { idRegex } from "@/lib/validation/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListingEditForm } from "./listing-edit-form";

export const metadata: Metadata = { title: "Edit listing — Admin" };

export default async function AdminListingEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!idRegex.test(id)) notFound();

  const { supabase } = await requireAdmin();

  const [{ data: listing }, { data: categories }] = await Promise.all([
    supabase
      .from("listings")
      .select(
        "id, title, price_bdt, quantity, condition, status, category_id, pickup_location, stores(business_name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("categories").select("id, name").order("sort_order"),
  ]);

  if (!listing) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/admin/listings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-fast hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden /> All listings
      </Link>

      <Card className="elev-1">
        <CardHeader>
          <CardTitle className="text-base">Edit listing</CardTitle>
          <CardDescription>
            {listing.stores?.business_name ?? "Unknown store"} — changes are
            recorded in the audit log and visible immediately.{" "}
            <Link href={`/listing/${listing.id}`} className="text-primary hover:underline">
              View the public page →
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ListingEditForm
            listing={{
              id: listing.id,
              title: listing.title,
              price_bdt: listing.price_bdt,
              quantity: listing.quantity,
              condition: listing.condition,
              status: listing.status,
              category_id: listing.category_id,
              pickup_location: listing.pickup_location,
            }}
            categories={(categories ?? []).map((c) => ({ id: c.id, name: c.name }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
