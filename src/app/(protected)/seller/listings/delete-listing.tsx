"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { initialActionState } from "@/lib/validation/helpers";
import { deleteListingAction } from "./actions";

export function DeleteListing({ listingId }: { listingId: string }) {
  const [state, action] = useActionState(deleteListingAction, initialActionState);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="rounded-2xl border border-destructive/30 p-4">
      {!confirming ? (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setConfirming(true)}
        >
          <Trash2 aria-hidden /> Delete listing
        </Button>
      ) : (
        <form action={action} className="space-y-3">
          <input type="hidden" name="listing_id" value={listingId} />
          <p className="text-sm text-muted-foreground">
            This permanently removes the listing and its photos. Completed deals keep
            their records.
          </p>
          {state.status === "error" && state.message && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}
          <div className="flex gap-2">
            <SubmitButton
              variant="destructive"
              size="sm"
              className="w-auto"
              pendingText="Deleting…"
            >
              Yes, delete it
            </SubmitButton>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(false)}
            >
              Keep listing
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
