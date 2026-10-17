"use client";

import { RotateCcw } from "lucide-react";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { SubmitButton } from "@/components/submit-button";
import { initialActionState } from "@/lib/validation/helpers";
import { setListingStatusAction } from "./actions";

/**
 * Status controls per listing row. Active listings can be marked sold or sold
 * out; anything else can be relisted. Two submit buttons share the form —
 * their `value` is the target status the server action reads.
 */
export function ListingStatusForm({
  listingId,
  status,
}: {
  listingId: string;
  status: string;
}) {
  const [state, action] = useActionState(setListingStatusAction, initialActionState);

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="flex shrink-0 items-center gap-1.5">
      <input type="hidden" name="listing_id" value={listingId} />
      {status === "active" ? (
        <>
          <SubmitButton
            name="status"
            value="sold"
            variant="outline"
            size="sm"
            className="h-7 w-auto px-2.5 text-xs"
            pendingText="Updating…"
          >
            Mark sold
          </SubmitButton>
          <SubmitButton
            name="status"
            value="sold_out"
            variant="outline"
            size="sm"
            className="h-7 w-auto px-2.5 text-xs"
            pendingText="Updating…"
          >
            Sold out
          </SubmitButton>
        </>
      ) : (
        <SubmitButton
          name="status"
          value="active"
          variant="outline"
          size="sm"
          className="h-7 w-auto px-2.5 text-xs"
          pendingText="Updating…"
        >
          <RotateCcw className="size-3.5" aria-hidden /> Relist
        </SubmitButton>
      )}
    </form>
  );
}
