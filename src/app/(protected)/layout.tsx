import { redirect } from "next/navigation";

import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { requireUser } from "@/lib/auth";

/**
 * Shell for every signed-in screen. Guards run here (the real authorization
 * checks) — the proxy only refreshes the session.
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
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Brand />
          <div className="flex items-center gap-2">
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
