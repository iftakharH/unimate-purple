import { Heart, Plus, Search } from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { getAuthContext } from "@/lib/auth";

/** Consistent public-page header (home, browse, listing, store). */
export async function PublicHeader() {
  const { user, profile } = await getAuthContext();
  const canSell = profile?.role === "seller";

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4">
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
        {user && canSell ? (
          <Button
            render={<Link href="/seller/listings/new" />}
            nativeButton={false}
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Plus aria-hidden /> Sell
          </Button>
        ) : null}
        {user ? (
          <Button
            render={<Link href="/saved" aria-label="Saved items" />}
            nativeButton={false}
            variant="ghost"
            size="icon-sm"
          >
            <Heart aria-hidden />
          </Button>
        ) : null}
        <ThemeToggle />
        {user ? (
          <UserMenu
            fullName={profile?.full_name ?? ""}
            email={user.email ?? ""}
            role={profile?.role ?? "buyer"}
            avatarUrl={profile?.avatar_url ?? null}
          />
        ) : (
          <>
            <Button
              render={<Link href="/login" />}
              nativeButton={false}
              variant="ghost"
              size="sm"
            >
              Sign in
            </Button>
            <Button render={<Link href="/signup" />} nativeButton={false} size="sm">
              Create account
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
