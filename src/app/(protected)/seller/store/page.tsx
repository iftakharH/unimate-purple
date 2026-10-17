import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ExternalLink } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { StoreForm } from "./store-form";
import { StoreImageUpload } from "./store-image-upload";
import { StoreLiveReveal } from "./store-live-reveal";

export const metadata: Metadata = { title: "My store" };

export default async function SellerStorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase, user } = await requireUser();
  const params = await searchParams;
  const showWelcome = params.welcome === "1";

  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!store) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <Card className="elev-1">
          <CardHeader>
            <CardTitle className="text-base">No store found</CardTitle>
            <CardDescription>
              Your seller account doesn&apos;t have a store yet — contact an admin.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {showWelcome && <StoreLiveReveal businessName={store.business_name} slug={store.slug} />}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My store</h1>
          <p className="text-sm text-muted-foreground">
            unimate/store/<span className="text-foreground">{store.slug}</span>
          </p>
        </div>
        <Button
          render={<Link href={`/store/${store.slug}`} />}
          nativeButton={false}
          variant="outline"
          size="sm"
        >
          <ExternalLink aria-hidden /> View public page
        </Button>
      </div>

      {showWelcome && (
        <Alert>
          <CheckCircle2 aria-hidden />
          <span>
            Your store is live. Add branding and details below — buyers can already
            find your page.
          </span>
        </Alert>
      )}

      <Card className="elev-1">
        <CardHeader>
          <CardTitle className="text-base">Branding</CardTitle>
          <CardDescription>
            The banner sits across the top of your public page; the logo overlaps it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <StoreImageUpload
            kind="banner"
            userId={user.id}
            currentUrl={store.banner_url}
          />
          <StoreImageUpload kind="logo" userId={user.id} currentUrl={store.logo_url} />
        </CardContent>
      </Card>

      <Card className="elev-1" id="store-details">
        <CardHeader>
          <CardTitle className="text-base">Store details</CardTitle>
          <CardDescription>
            Name, intro and where buyers meet you. The store link stays fixed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StoreForm
            defaultValues={{
              business_name: store.business_name,
              description: store.description ?? "",
              contact_phone: store.contact_phone ?? "",
              pickup_location: store.pickup_location ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
