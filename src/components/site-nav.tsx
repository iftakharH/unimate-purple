import { GlassNav } from "@/components/glass-nav";
import { getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Server wrapper for the floating glass nav — resolves the viewer and the
 * live unread counts once per request, then hands plain data to the client
 * pill. Used by every page family (public and protected).
 */
export async function SiteNav() {
  const { user, profile } = await getAuthContext();
  let unreadNotifications = 0;
  let unreadMessages = 0;

  if (user) {
    const supabase = await createClient();
    const [notifications, messages] = await Promise.all([
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null),
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .is("read_at", null)
        .neq("sender_id", user.id),
    ]);
    unreadNotifications = notifications.count ?? 0;
    unreadMessages = messages.count ?? 0;
  }

  return (
    <GlassNav
      user={
        user
          ? {
              id: user.id,
              fullName: profile?.full_name ?? "",
              email: user.email ?? "",
              role: profile?.role ?? "buyer",
              avatarUrl: profile?.avatar_url ?? null,
            }
          : null
      }
      seller={profile?.role === "seller"}
      unreadNotifications={unreadNotifications}
      unreadMessages={unreadMessages}
    />
  );
}
