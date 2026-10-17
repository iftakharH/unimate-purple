import { Heart, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AmbientBackdrop } from "@/components/ambient-backdrop";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { requireUser } from "@/lib/auth";
import { BRAND_HUE, PARTNER_HUES } from "@/lib/colors";

/**
 * Shell for every signed-in screen. Guards run here (the real authorization
 * checks) — the proxy only refreshes the session. The ambient veil runs
 * behind every page in this area too (Phase 5: every page carries the
 * backdrop, tuned subtle so working screens stay calm).
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireUser();

  if (profile?.is_banned) {
    redirect("/banned");
  }
  if (profile?.must_change_password) {
    redirect("/change-password?forced=1");
  }

  return (
    <div className="relative flex min-h-svh flex-col">
      <AmbientBackdrop
        hueA={BRAND_HUE}
        hueB={PARTNER_HUES[1]}
        height="380px"
        className="opacity-70"
      />
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Brand />
          <div className="flex items-center gap-2">
            <Button
              render={<Link href="/browse" />}
              nativeButton={false}
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Search aria-hidden /> Browse
            </Button>
            <Button
              render={<Link href="/saved" aria-label="Saved items" />}
              nativeButton={false}
              variant="ghost"
              size="icon-sm"
            >
              <Heart aria-hidden />
            </Button>
            <ThemeToggle />
            <UserMenu
              fullName={profile?.full_name ?? ""}
              email={user.email ?? ""}
              role={profile?.role ?? "buyer"}
              avatarUrl={profile?.avatar_url ?? null}
            />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
