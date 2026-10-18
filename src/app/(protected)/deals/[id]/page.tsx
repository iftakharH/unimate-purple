import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, CreditCard, MapPin, StickyNote } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { requireUser } from "@/lib/auth";
import { formatBdt, formatDate, initialsOf, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  DealStatusChip,
  dealSteps,
  TERMINAL_STATUSES,
} from "../deal-status";
import { DealActions, type DealActionVariant } from "./deal-actions";
import { SandboxCheckout } from "./sandbox-checkout";

export const metadata: Metadata = { title: "Deal" };

const STEP_LABELS: Record<string, string> = {
  requested: "Offer sent",
  accepted: "Accepted",
  paid: "Paid (sandbox)",
  handed_over: "Handed over",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export default async function DealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase, user } = await requireUser();

  const [dealRes, historyRes] = await Promise.all([
    supabase
      .from("deals")
      .select(
        "*, listings(id, title, price_bdt, status, quantity, listing_images(url, position))",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("deal_status_history")
      .select("id, status, actor_id, note, created_at")
      .eq("deal_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const deal = dealRes.data;
  if (!deal) notFound();

  const history = historyRes.data ?? [];
  const isBuyer = deal.buyer_id === user.id;
  const isSeller = deal.seller_id === user.id;
  const role: "buyer" | "seller" | "admin" = isBuyer
    ? "buyer"
    : isSeller
      ? "seller"
      : "admin";

  const partnerId = isBuyer ? deal.seller_id : deal.buyer_id;
  const { data: partner } = await supabase
    .from("public_profiles")
    .select("id, full_name, avatar_url")
    .eq("id", partnerId)
    .maybeSingle();

  const listing = deal.listings;
  const cover = listing
    ? [...listing.listing_images].sort((a, b) => a.position - b.position)[0]
    : undefined;
  const steps = dealSteps(deal.payment_mode);
  const campus = deal.payment_mode === "pay_on_campus";
  const reached = new Set<string>(history.map((row) => row.status));
  const terminalBad = (TERMINAL_STATUSES as readonly string[]).includes(deal.status);

  function actorLabel(actorId: string | null): string | null {
    if (!actorId) return null;
    if (actorId === user.id) return "You";
    if (actorId === partnerId) return partner?.full_name ?? "The other party";
    return "Admin";
  }

  const statusTime = (status: string) =>
    history.find((row) => row.status === status)?.created_at;

  let variant: DealActionVariant | null = null;
  if (deal.status === "requested") {
    variant =
      role === "seller" ? "seller-requested" : role === "buyer" ? "buyer-requested" : null;
  } else if (deal.status === "accepted") {
    if (campus) {
      variant =
        role === "seller"
          ? "seller-campus-handover"
          : role === "buyer"
            ? "buyer-accepted-campus"
            : null;
    } else {
      variant = role === "seller" ? "waiting-buyer-pay" : null;
    }
  } else if (deal.status === "paid") {
    variant = role === "seller" ? "mark-handover" : role === "buyer" ? "waiting-handover" : null;
  } else if (deal.status === "handed_over") {
    variant = role === "buyer" ? "confirm-receipt" : role === "seller" ? "waiting-receipt" : null;
  }

  const showCheckout =
    deal.status === "accepted" && !campus && role === "buyer";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/deals"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-fast hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden /> All deals
      </Link>

      {/* listing + status */}
      <div className="flex flex-wrap items-center gap-3">
        {listing ? (
          listing.status === "active" || isSeller || role === "admin" ? (
            <Link
              href={`/listing/${listing.id}`}
              className="elev-1 flex min-w-0 flex-1 items-center gap-3 rounded-2xl border bg-card p-2.5 transition-[transform,box-shadow] duration-base ease-out-soft hover:-translate-y-0.5 hover:elev-2"
            >
              <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border bg-muted/50">
                {cover ? (
                  <Image src={cover.url} alt="" fill sizes="48px" className="object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{listing.title}</p>
                <p className="tabular text-sm text-muted-foreground">
                  {formatBdt(listing.price_bdt)} each
                </p>
              </div>
            </Link>
          ) : (
            <div className="elev-1 flex min-w-0 flex-1 items-center gap-3 rounded-2xl border bg-card p-2.5">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border bg-muted/50">
                {cover ? (
                  <Image src={cover.url} alt="" fill sizes="48px" className="object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{listing.title}</p>
                <p className="text-sm text-muted-foreground">
                  Listing is {listing.status.replace("_", " ")}
                </p>
              </div>
            </div>
          )
        ) : (
          <p className="text-sm text-muted-foreground">Listing removed.</p>
        )}
        <DealStatusChip status={deal.status} className="text-sm" />
      </div>

      {/* summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="elev-1 rounded-2xl border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Amount</p>
          <p className="tabular mt-1.5 text-2xl font-semibold tracking-tight">
            {formatBdt(deal.amount_bdt)}
          </p>
        </div>
        <div className="elev-1 rounded-2xl border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Quantity</p>
          <p className="tabular mt-1.5 text-2xl font-semibold tracking-tight">×{deal.quantity}</p>
        </div>
        <div className="elev-1 rounded-2xl border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Payment</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium">
            {campus ? <MapPin className="size-4 shrink-0" aria-hidden /> : <CreditCard className="size-4 shrink-0" aria-hidden />}
            {campus ? "On campus" : "In app · sandbox"}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* timeline */}
        <div className="elev-1 rounded-2xl border bg-card p-5">
          <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Timeline
          </h2>
          <ol className="mt-4 space-y-0">
            {steps.map((step, index) => {
              const done = reached.has(step);
              const current = deal.status === step;
              const time = statusTime(step);
              const last = index === steps.length - 1 && !terminalBad;
              return (
                <li key={step} className="relative flex gap-3 pb-6 last:pb-0">
                  {!last && (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute left-[9px] top-5 h-full w-px",
                        done ? "bg-primary/50" : "bg-border",
                      )}
                    />
                  )}
                  <span
                    aria-hidden
                    className={cn(
                      "relative z-10 mt-0.5 grid size-[19px] shrink-0 place-items-center rounded-full border-2",
                      done
                        ? "border-primary bg-primary"
                        : "border-border bg-card",
                      current && "ring-4 ring-primary/20",
                    )}
                  >
                    {done && <span className="size-1.5 rounded-full bg-primary-foreground" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm", current ? "font-semibold" : done ? "font-medium" : "text-muted-foreground")}>
                      {STEP_LABELS[step] ?? step}
                    </span>
                    {time && (
                      <span className="tabular block text-xs text-muted-foreground">
                        {timeAgo(time)}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}

            {terminalBad && (
              <li className="relative flex gap-3">
                <span
                  aria-hidden
                  className="grid size-[19px] shrink-0 place-items-center rounded-full border-2 border-destructive bg-destructive"
                >
                  <span className="size-1.5 rounded-full bg-primary-foreground" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-destructive">
                    {STEP_LABELS[deal.status] ?? deal.status}
                  </span>
                  {statusTime(deal.status) && (
                    <span className="tabular block text-xs text-muted-foreground">
                      {timeAgo(statusTime(deal.status) as string)}
                      {history.find((row) => row.status === deal.status)?.actor_id
                        ? ` · ${actorLabel(history.find((row) => row.status === deal.status)?.actor_id ?? null)}`
                        : ""}
                    </span>
                  )}
                  {deal.cancel_reason && (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      “{deal.cancel_reason}”
                    </span>
                  )}
                </span>
              </li>
            )}
          </ol>

          {deal.buyer_note && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border bg-muted/40 p-3">
              <StickyNote className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">{deal.buyer_note}</p>
            </div>
          )}
        </div>

        {/* action panel */}
        <div className="space-y-4">
          <div className="elev-1 space-y-3 rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-2.5">
              <Avatar size="sm">
                {partner?.avatar_url ? <AvatarImage src={partner.avatar_url} alt="" /> : null}
                <AvatarFallback>{initialsOf(partner?.full_name ?? "")}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {partner?.full_name ?? "Unimate user"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isBuyer ? "Seller" : "Buyer"} · since {formatDate(deal.created_at)}
                </p>
              </div>
            </div>

            {variant && <DealActions dealId={deal.id} variant={variant} />}

            {showCheckout && (
              <SandboxCheckout dealId={deal.id} amount={deal.amount_bdt} />
            )}

            {deal.status === "completed" && (
              <p className="text-sm text-success">
                Deal complete — thanks for trading on campus.
              </p>
            )}
            {terminalBad && (
              <p className="text-sm text-muted-foreground">
                This deal is closed. Open a new offer from the listing if you
                changed your mind.
              </p>
            )}
            {role === "admin" && (
              <p className="text-xs text-muted-foreground">
                Admin view — participants drive the actions on this deal.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
