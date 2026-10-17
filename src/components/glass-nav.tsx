"use client";

import { Bell, Heart, MessageSquare, Plus, Search } from "lucide-react";
import { m } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { spring } from "@/lib/motion";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export type NavUser = {
  fullName: string;
  email: string;
  role: string;
  avatarUrl: string | null;
} | null;

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden
      className="tabular absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--neon)] px-1 text-[10px] font-semibold text-[var(--neon-ink)]"
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

/** Bell with a live unread count — the DB stays the source of truth. */
function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [unread, setUnread] = useState(initialUnread);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel("bell-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          void supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .is("read_at", null)
            .then(({ count }) => setUnread(count ?? 0));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <Button
      render={
        <Link
          href="/notifications"
          aria-label={
            unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
          }
        />
      }
      nativeButton={false}
      variant="ghost"
      size="icon-sm"
      className="relative"
    >
      <Bell aria-hidden />
      <CountBadge count={unread} />
    </Button>
  );
}

/**
 * The floating glass navbar (both shells).
 *
 * Expanded near the top of the page it runs at ~90% width; once you scroll it
 * morphs (motion layout, spring) down to a compact pill that hugs its content
 * and sheds secondary links. Backdrop-blur + hairline border = glass.
 */
export function GlassNav({
  user,
  seller,
  unreadNotifications,
  unreadMessages,
}: {
  user: NavUser;
  seller: boolean;
  unreadNotifications: number;
  unreadMessages: number;
}) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setCompact(window.scrollY > 24));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-2.5 z-50 flex justify-center px-2 sm:top-4 sm:px-4">
      <m.div
        layout
        transition={spring.gentle}
        className={cn(
          "glass pointer-events-auto flex items-center rounded-full",
          compact
            ? "w-fit gap-0.5 py-1.5 pl-2.5 pr-2"
            : "w-[90%] justify-between gap-2 py-2 pl-4 pr-2 sm:py-2.5 sm:pr-2.5",
        )}
      >
        <Brand showText={!compact} />

        <div className="flex items-center gap-1">
          <Button
            render={<Link href="/browse" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
            className={cn("hidden sm:inline-flex", compact && "sm:hidden")}
          >
            <Search aria-hidden /> Browse
          </Button>

          {seller && (
            <Button
              render={<Link href="/seller/listings/new" />}
              nativeButton={false}
              size="sm"
              className={cn("hidden sm:inline-flex", compact && "sm:hidden")}
            >
              <Plus aria-hidden /> Sell
            </Button>
          )}

          {user ? (
            <>
              <Button
                render={<Link href="/messages" aria-label="Messages" />}
                nativeButton={false}
                variant="ghost"
                size="icon-sm"
                className="relative"
              >
                <MessageSquare aria-hidden />
                {!compact && <CountBadge count={unreadMessages} />}
              </Button>
              <Button
                render={<Link href="/saved" aria-label="Saved items" />}
                nativeButton={false}
                variant="ghost"
                size="icon-sm"
                className={cn(compact && "hidden")}
              >
                <Heart aria-hidden />
              </Button>
              <NotificationBell initialUnread={unreadNotifications} />
            </>
          ) : (
            <>
              <Button
                render={<Link href="/login" />}
                nativeButton={false}
                variant="ghost"
                size="sm"
                className={cn("hidden sm:inline-flex", compact && "sm:hidden")}
              >
                Sign in
              </Button>
              <Button render={<Link href="/signup" />} nativeButton={false} size="sm">
                Create account
              </Button>
            </>
          )}

          <span className={cn("inline-flex", compact && "hidden")}>
            <ThemeToggle />
          </span>

          {user && (
            <UserMenu
              fullName={user.fullName}
              email={user.email}
              role={user.role}
              avatarUrl={user.avatarUrl}
            />
          )}
        </div>
      </m.div>
    </header>
  );
}
