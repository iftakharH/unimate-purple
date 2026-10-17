import { ArrowRight, MessageCircle, ShieldCheck, Store } from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getAuthContext } from "@/lib/auth";

/**
 * Landing placeholder — the real marketplace home (hero + categories +
 * latest listings) arrives with the catalog phase. The opt-in WebGL hero
 * from docs/DESIGN.md lands here later, never inside the product UI.
 */
export default async function Home() {
  const { user } = await getAuthContext();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <Brand />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <Button render={<Link href="/settings" />} nativeButton={false} size="sm">
              Open app <ArrowRight aria-hidden />
            </Button>
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

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className="elev-1 mb-6 rounded-full border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
          For East Delta University students
        </p>
        <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          The campus marketplace, done properly.
        </h1>
        <p className="mt-4 max-w-xl text-pretty text-lg text-muted-foreground">
          Buy and sell with verified students — books, electronics, dorm gear and
          more. Deal in ৳ BDT, chat in real time, meet on campus.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {user ? (
            <Button render={<Link href="/settings" />} nativeButton={false} size="lg">
              Go to your account <ArrowRight aria-hidden />
            </Button>
          ) : (
            <>
              <Button render={<Link href="/signup" />} nativeButton={false} size="lg">
                Start selling <ArrowRight aria-hidden />
              </Button>
              <Button
                render={<Link href="/login" />}
                nativeButton={false}
                size="lg"
                variant="outline"
              >
                Sign in
              </Button>
            </>
          )}
        </div>

        <div className="mt-16 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="elev-1 rounded-2xl border bg-card p-5 text-left">
            <Store className="size-5 text-primary" aria-hidden />
            <h2 className="mt-3 font-medium">Campus stores</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Approved sellers get a store page with their own business name.
            </p>
          </div>
          <div className="elev-1 rounded-2xl border bg-card p-5 text-left">
            <MessageCircle className="size-5 text-primary" aria-hidden />
            <h2 className="mt-3 font-medium">Real-time chat</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask questions and agree on a meetup spot, right in the app.
            </p>
          </div>
          <div className="elev-1 rounded-2xl border bg-card p-5 text-left">
            <ShieldCheck className="size-5 text-primary" aria-hidden />
            <h2 className="mt-3 font-medium">Students only</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign-up is limited to campus email addresses.
            </p>
          </div>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 py-6 text-center text-xs text-muted-foreground">
        Unimate · East Delta University student marketplace
      </footer>
    </div>
  );
}
