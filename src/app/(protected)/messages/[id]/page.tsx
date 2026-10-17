import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { requireUser } from "@/lib/auth";
import { formatBdt, initialsOf } from "@/lib/format";
import { Thread } from "./thread";

export const metadata: Metadata = { title: "Conversation" };

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { supabase, user } = await requireUser();

  const { data: conversation } = await supabase
    .from("conversations")
    .select(
      "id, buyer_id, seller_id, listings(id, title, price_bdt, listing_images(url, position))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!conversation) notFound();

  const partnerId =
    conversation.buyer_id === user.id
      ? conversation.seller_id
      : conversation.buyer_id;
  const isSeller = conversation.seller_id === user.id;

  const [messagesRes, partnerRes] = await Promise.all([
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(300),
    supabase
      .from("public_profiles")
      .select("id, full_name, avatar_url")
      .eq("id", partnerId)
      .maybeSingle(),
  ]);

  const listing = conversation.listings;
  const cover = listing
    ? [...listing.listing_images].sort((a, b) => a.position - b.position)[0]
    : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/messages"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-fast hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden /> All messages
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Avatar>
          {partnerRes.data?.avatar_url ? (
            <AvatarImage src={partnerRes.data.avatar_url} alt="" />
          ) : null}
          <AvatarFallback>
            {initialsOf(partnerRes.data?.full_name ?? "")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">
            {partnerRes.data?.full_name ?? "Unimate user"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isSeller ? "Buyer" : "Seller"} · deals stay on campus
          </p>
        </div>
      </div>

      {listing && (
        <Link
          href={`/listing/${listing.id}`}
          className="elev-1 flex items-center gap-3 rounded-2xl border bg-card p-2.5 transition-[transform,box-shadow] duration-base ease-out-soft hover:-translate-y-0.5 hover:elev-2"
        >
          <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border bg-muted/50">
            {cover ? (
              <Image src={cover.url} alt="" fill sizes="48px" className="object-cover" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{listing.title}</p>
            <p className="tabular text-sm text-muted-foreground">
              {formatBdt(listing.price_bdt)}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">View listing →</span>
        </Link>
      )}

      <Thread
        conversationId={conversation.id}
        userId={user.id}
        initialMessages={(messagesRes.data ?? []).map((message) => ({
          id: message.id,
          sender_id: message.sender_id,
          body: message.body,
          created_at: message.created_at,
        }))}
      />
    </div>
  );
}
