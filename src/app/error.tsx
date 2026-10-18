"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Home, RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Root error boundary — catches unexpected render/data errors below the root
 * layout. Client component by contract; `reset()` re-renders the segment.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced in the terminal during dev; wire to monitoring later.
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-svh place-items-center px-4">
      <div className="elev-2 w-full max-w-md rounded-3xl border bg-card p-8 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10">
          <TriangleAlert className="size-7 text-destructive" aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          Something broke on our side
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page hit an unexpected error. Try again — if it keeps happening,
          check back in a little while.
        </p>
        {error.digest ? (
          <p className="tabular mt-3 text-xs text-muted-foreground/70">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>
            <RotateCcw aria-hidden /> Try again
          </Button>
          <Button
            render={<Link href="/" />}
            nativeButton={false}
            variant="outline"
          >
            <Home aria-hidden /> Back to Unimate
          </Button>
        </div>
      </div>
    </div>
  );
}
