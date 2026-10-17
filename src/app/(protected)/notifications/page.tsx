import type { Metadata } from "next";
import Link from "next/link";
import { Bell, CheckCheck, MessageSquare, Store, type LucideIcon } from "lucide-react";

import { LiveRefresh } from "@/components/live-refresh";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { markAllNotificationsReadAction, openNotificationAction } from "./actions";

export const metadata: Metadata = { title: "Notifications" };

const ICONS: Record<string, LucideIcon> = {
  message: MessageSquare,
  seller_request: Store,
};

export default async function NotificationsPage() {
  const { supabase, user } = await requireUser();

  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const notifications = data ?? [];
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <LiveRefresh
        table="notifications"
        filter={`user_id=eq.${user.id}`}
        channelName="notifications-page"
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread`
              : notifications.length > 0
                ? "All caught up"
                : "Nothing yet — activity lands here."}
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsReadAction}>
            <SubmitButton
              variant="outline"
              size="sm"
              className="w-auto"
              pendingText="Marking…"
            >
              <CheckCheck aria-hidden /> Mark all read
            </SubmitButton>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="elev-1">
          <CardHeader className="items-center text-center">
            <Bell className="size-8 text-muted-foreground" aria-hidden />
            <CardTitle className="text-xl">No notifications yet</CardTitle>
            <p className="text-sm text-muted-foreground">
              Messages, seller approvals and deal updates will appear here.
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
          {notifications.map((notification) => {
            const Icon = ICONS[notification.type] ?? Bell;
            const unread = !notification.read_at;
            return (
              <li key={notification.id}>
                <form action={openNotificationAction}>
                  <input type="hidden" name="id" value={notification.id} />
                  <button
                    type="submit"
                    className={cn(
                      "elev-1 flex w-full items-start gap-3 rounded-2xl border bg-card p-3.5 text-left outline-none transition-[transform,box-shadow] duration-base ease-out-soft hover:-translate-y-0.5 hover:elev-2 focus-visible:ring-2 focus-visible:ring-ring",
                      unread && "border-primary/40 bg-primary/5",
                    )}
                  >
                    <span className="elev-1 grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {notification.title}
                        </span>
                        {unread && (
                          <span
                            aria-label="Unread"
                            className="size-1.5 shrink-0 rounded-full bg-[var(--neon)]"
                          />
                        )}
                      </span>
                      {notification.body && (
                        <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">
                          {notification.body}
                        </span>
                      )}
                    </span>
                    <span className="tabular shrink-0 text-xs text-muted-foreground">
                      {timeAgo(notification.created_at)}
                    </span>
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
