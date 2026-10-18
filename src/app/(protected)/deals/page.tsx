import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Handshake } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { formatBdt, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DealStatusChip } from "./deal-status";

export const metadata: Metadata = { title: "Deals" };

type DealRow = {
  id: string;
  status: string;
  payment_mode: string;
  quantity: number;
  amount_bdt: number;
  updated_at: string;
  buyer_id: string;
  seller_id: string;
  listings: {
    id: string;
    title: string;
    listing_images: { url: string; position: number }[];
  } | null;
};

const DEAL_SELECT =
  "id, status, payment_mode, quantity, amount_bdt, updated_at, buyer_id, seller_id, listings(id, title, listing_images(url, position))";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "seller" ? "seller" : "buyer";
  const { supabase, user } = await requireUser();

  const [buyerRes, sellerRes] = await Promise.all([
    supabase
      .from("deals")
      .select(DEAL_SELECT)
      .eq("buyer_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("deals")
      .select(DEAL_SELECT)
      .eq("seller_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  const buyerDeals = (buyerRes.data ?? []) as unknown as DealRow[];
  const sellerDeals = (sellerRes.data ?? []) as unknown as DealRow[];
  const deals = tab === "buyer" ? buyerDeals : sellerDeals;

  const partnerIds = [
    ...new Set(
      deals.map((deal) => (tab === "buyer" ? deal.seller_id : deal.buyer_id)),
    ),
  ];
  const { data: partners } = partnerIds.length
    ? await supabase
        .from("public_profiles")
        .select("id, full_name")
        .in("id", partnerIds)
    : { data: [] };
  const partnerById = new Map((partners ?? []).map((p) => [p.id, p.full_name]));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Deals</h1>
        <p className="text-sm text-muted-foreground">
          Offers, payments and campus handovers — tracked end to end.
        </p>
      </div>

      <div className="flex gap-1 rounded-full border p-1">
        {(
          [
            ["buyer", `As buyer (${buyerDeals.length})`],
            ["seller", `As seller (${sellerDeals.length})`],
          ] as const
        ).map(([value, label]) => (
          <Link
            key={value}
            href={`/deals${value === "seller" ? "?tab=seller" : ""}`}
            aria-current={tab === value ? "page" : undefined}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-center text-sm font-medium transition-colors duration-fast",
              tab === value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {deals.length === 0 ? (
        <Card className="elev-1">
          <CardHeader className="items-center text-center">
            <Handshake className="size-8 text-muted-foreground" aria-hidden />
            <CardTitle className="text-xl">
              {tab === "buyer" ? "No offers yet" : "No incoming requests"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {tab === "buyer"
                ? "Open a listing and hit “Make an offer” — it lands here."
                : "When a buyer offers on one of your listings, it lands here."}
            </p>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button render={<Link href="/browse" />} nativeButton={false}>
              Browse listings
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {deals.map((deal) => {
            const partnerName =
              partnerById.get(
                tab === "buyer" ? deal.seller_id : deal.buyer_id,
              ) ?? "Unimate user";
            const cover = deal.listings
              ? [...deal.listings.listing_images].sort(
                  (a, b) => a.position - b.position,
                )[0]
              : undefined;

            return (
              <li key={deal.id}>
                <Link
                  href={`/deals/${deal.id}`}
                  className="elev-1 flex items-center gap-3 rounded-2xl border bg-card p-3 outline-none transition-[transform,box-shadow] duration-base ease-out-soft hover:-translate-y-0.5 hover:elev-2 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border bg-muted/50">
                    {cover ? (
                      <Image
                        src={cover.url}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="grid size-full place-items-center text-[10px] text-muted-foreground">
                        no photo
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {deal.listings?.title ?? "Listing removed"}
                    </p>
                    <p className="tabular mt-0.5 text-sm text-muted-foreground">
                      {formatBdt(deal.amount_bdt)} · ×{deal.quantity} ·{" "}
                      {tab === "buyer" ? "sold by" : "offered by"} {partnerName}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <DealStatusChip status={deal.status} />
                    <span className="tabular text-xs text-muted-foreground">
                      {timeAgo(deal.updated_at)}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
