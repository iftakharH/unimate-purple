"use client";

import { Bell, Handshake, Heart, MessageSquare, Plus, Search } from "lucide-react";
import { m, useScroll, useSpring, useTransform } from "motion/react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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
 * Not a menu that appears and disappears — nothing is ever hidden. The pill's
 * width is driven by the page's scroll progress: ~90% of the viewport at the
 * top, easing down to the width of its own contents (plus a hair of padding)
 * by the bottom of the page, so the items end up shoulder to shoulder. The
 * minimum width is measured from the real content, never guessed.
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
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, spring.heavy);
  const contentRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ max: 0, min: 0 });

  // Measure the content once (and on resize / responsive changes) — the pill
  // can never shrink below its own contents, exactly as the user asked.
  // Note: scrollWidth equals clientWidth on a non-overflowing row, so we sum
  // the real children instead.
  useLayoutEffect(() => {
    const measure = () => {
      const viewport = document.documentElement.clientWidth;
      const max = Math.max(300, Math.round(viewport * 0.9));
      const row = contentRef.current;
      let natural = max;
      if (row && row.children.length >= 2) {
        let sum = 0;
        for (const child of Array.from(row.children)) {
          sum += (child as HTMLElement).offsetWidth;
        }
        natural = sum + 14; // keep a touch of breath between brand and actions
      }
      const min = Math.min(max, natural + 16);
      setSize({ max, min });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (contentRef.current) observer.observe(contentRef.current);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [user, seller]);

  const width = useTransform(progress, [0, 1], [size.max, size.min]);
  const padX = useTransform(progress, [0, 1], [18, 7]);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-2.5 z-50 flex justify-center px-2 sm:top-4 sm:px-4">
      <m.div
        style={
          size.max > 0
            ? { width, paddingLeft: padX, paddingRight: padX }
            : undefined
        }
        className={cn(
          "glass pointer-events-auto flex items-center justify-center rounded-full py-1.5 sm:py-2",
          size.max === 0 && "w-[90%]",
        )}
      >
        <div
          ref={contentRef}
          className="flex w-full items-center justify-between gap-1 sm:gap-1.5"
        >
          <Brand />

          <div className="flex items-center gap-1">
            <Button
              render={<Link href="/browse" />}
              nativeButton={false}
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Search aria-hidden /> Browse
            </Button>

            {seller && (
              <Button
                render={<Link href="/seller/listings/new" />}
                nativeButton={false}
                size="sm"
                className="hidden sm:inline-flex"
              >
                <Plus aria-hidden /> Sell
              </Button>
            )}

            {user ? (
              <>
                <Button
                  render={<Link href="/deals" aria-label="Deals" />}
                  nativeButton={false}
                  variant="ghost"
                  size="icon-sm"
                >
                  <Handshake aria-hidden />
                </Button>
                <Button
                  render={<Link href="/messages" aria-label="Messages" />}
                  nativeButton={false}
                  variant="ghost"
                  size="icon-sm"
                  className="relative"
                >
                  <MessageSquare aria-hidden />
                  <CountBadge count={unreadMessages} />
                </Button>
                <Button
                  render={<Link href="/saved" aria-label="Saved items" />}
                  nativeButton={false}
                  variant="ghost"
                  size="icon-sm"
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
                  className="hidden sm:inline-flex"
                >
                  Sign in
                </Button>
                <Button render={<Link href="/signup" />} nativeButton={false} size="sm">
                  Create account
                </Button>
              </>
            )}

            <ThemeToggle />

            {user && (
              <UserMenu
                fullName={user.fullName}
                email={user.email}
                role={user.role}
                avatarUrl={user.avatarUrl}
              />
            )}
          </div>
        </div>
      </m.div>
    </header>
  );
}
