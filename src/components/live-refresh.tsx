"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Re-renders the current server page whenever rows in `table` change.
 * RLS scopes the events (the client only receives what it may read), and a
 * short debounce keeps bursts (e.g. several messages) to one refresh.
 */
export function LiveRefresh({
  table,
  filter,
  channelName,
}: {
  table: string;
  filter?: string;
  channelName: string;
}) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        () => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => router.refresh(), 400);
        },
      )
      .subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
  }, [supabase, table, filter, channelName, router]);

  return null;
}
