import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="grid min-h-svh place-items-center px-4">
      <div className="elev-2 w-full max-w-md rounded-3xl border bg-card p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent">
          <Compass className="size-7 text-accent-foreground" aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          This page doesn&apos;t exist
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The link may be broken or the item was removed. The marketplace is a
          click away either way.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button render={<Link href="/browse" />} nativeButton={false}>
            <Search aria-hidden /> Browse listings
          </Button>
          <Button
            render={<Link href="/" />}
            nativeButton={false}
            variant="outline"
          >
            Back home
          </Button>
        </div>
      </div>
    </div>
  );
}
