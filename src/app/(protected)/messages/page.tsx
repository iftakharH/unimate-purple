import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MessagesSquare } from "lucide-react";

import { LiveRefresh } from "@/components/live-refresh";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { initialsOf, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };

type ConversationRow = {
  id: string;
  updated_at: string;
  buyer_id: string;
  seller_id: string;
  listings: {
    id: string;
    title: string;
    price_bdt: number;
    listing_images: { url: string; position: number }[];
  } | null;
};

export default async function MessagesPage() {
  const { supabase, user } = await requireUser();

  const { data } = await supabase
    .from("conversations")
    .select(
      "id, updated_at, buyer_id, seller_id, listings(id, title, price_bdt, listing_images(url, position))",
    )
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("updated_at", { ascending: false });

  const conversations = (data ?? []) as unknown as ConversationRow[];
  const ids = conversations.map((conversation) => conversation.id);

  const lastMessage = new Map<
    string,
    { body: string; sender_id: string; created_at: string }
  >();
  const unread = new Map<string, number>();

  if (ids.length > 0) {
    const { data: rows } = await supabase
      .from("messages")
      .select("conversation_id, body, sender_id, created_at, read_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false })
      .limit(400);

    for (const row of rows ?? []) {
      if (!lastMessage.has(row.conversation_id)) {
        lastMessage.set(row.conversation_id, row);
      }
      if (row.read_at === null && row.sender_id !== user.id) {
        unread.set(
          row.conversation_id,
          (unread.get(row.conversation_id) ?? 0) + 1,
        );
      }
    }
  }

  const partnerIds = [
    ...new Set(
      conversations.map((conversation) =>
        conversation.buyer_id === user.id
          ? conversation.seller_id
          : conversation.buyer_id,
      ),
    ),
  ];
  const { data: partners } = partnerIds.length
    ? await supabase
        .from("public_profiles")
        .select("id, full_name, avatar_url")
        .in("id", partnerIds)
    : { data: [] };
  const partnerById = new Map((partners ?? []).map((p) => [p.id, p]));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <LiveRefresh table="messages" channelName="messages-list" />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground">
          {conversations.length === 0
            ? "Chat with sellers right from a listing."
            : `${conversations.length} conversation${conversations.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {conversations.length === 0 ? (
        <Card className="elev-1">
          <CardHeader className="items-center text-center">
            <MessagesSquare className="size-8 text-muted-foreground" aria-hidden />
            <CardTitle className="text-xl">No conversations yet</CardTitle>
            <p className="text-sm text-muted-foreground">
              Open any listing and hit “Message seller” — the thread lands here.
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
          {conversations.map((conversation) => {
            const partnerId =
              conversation.buyer_id === user.id
                ? conversation.seller_id
                : conversation.buyer_id;
            const partner = partnerById.get(partnerId);
            const last = lastMessage.get(conversation.id);
            const unreadCount = unread.get(conversation.id) ?? 0;
            const cover = conversation.listings
              ? [...conversation.listings.listing_images].sort(
                  (a, b) => a.position - b.position,
                )[0]
              : undefined;

            return (
              <li key={conversation.id}>
                <Link
                  href={`/messages/${conversation.id}`}
                  className={cn(
                    "elev-1 flex items-center gap-3 rounded-2xl border bg-card p-3 outline-none transition-[transform,box-shadow] duration-base ease-out-soft hover:-translate-y-0.5 hover:elev-2 focus-visible:ring-2 focus-visible:ring-ring",
                    unreadCount > 0 && "border-primary/40",
                  )}
                >
                  <Avatar>
                    {partner?.avatar_url ? (
                      <AvatarImage src={partner.avatar_url} alt="" />
                    ) : null}
                    <AvatarFallback>
                      {initialsOf(partner?.full_name ?? "")}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2">
                      <span className="truncate font-medium">
                        {partner?.full_name ?? "Unimate user"}
                      </span>
                      {unreadCount > 0 && (
                        <span
                          aria-label={`${unreadCount} unread`}
                          className="tabular grid h-5 min-w-5 place-items-center rounded-full bg-[var(--neon)] px-1.5 text-[11px] font-semibold text-[var(--neon-ink)]"
                        >
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {last
                        ? `${last.sender_id === user.id ? "You: " : ""}${last.body}`
                        : "No messages yet"}
                    </p>
                  </div>

                  {cover ? (
                    <div className="relative hidden size-11 shrink-0 overflow-hidden rounded-xl border bg-muted/50 sm:block">
                      <Image
                        src={cover.url}
                        alt=""
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </div>
                  ) : null}

                  <span className="tabular shrink-0 text-xs text-muted-foreground">
                    {timeAgo(conversation.updated_at)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
