import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { ListingForm } from "../listing-form";

export const metadata: Metadata = { title: "New listing" };

export default async function NewListingPage() {
  const { supabase, user } = await requireUser();

  const [storeRes, categoriesRes] = await Promise.all([
    supabase
      .from("stores")
      .select("pickup_location")
      .eq("owner_id", user.id)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id, name")
      .order("sort_order", { ascending: true }),
  ]);

  if (!storeRes.data) redirect("/become-seller");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New listing</h1>
        <p className="text-sm text-muted-foreground">
          It goes live on your store page and the browse feed the moment you publish.
        </p>
      </div>

      <Card className="elev-1">
        <CardHeader>
          <CardTitle className="text-base">What are you selling?</CardTitle>
          <CardDescription>
            Buyers see the cover photo first — make it count.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ListingForm
            mode="create"
            userId={user.id}
            categories={categoriesRes.data ?? []}
            defaults={{
              title: "",
              description: "",
              price_bdt: "",
              category_id: "",
              condition: "used",
              quantity: "1",
              pickup_location: "",
            }}
            initialImages={[]}
            storePickup={storeRes.data.pickup_location}
          />
        </CardContent>
      </Card>
    </div>
  );
}
