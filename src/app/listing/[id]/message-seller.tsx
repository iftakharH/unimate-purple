"use client";

import { MessageCircle } from "lucide-react";
import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { initialActionState } from "@/lib/validation/helpers";
import { startConversationAction } from "./actions";

/** Opens (or reuses) the buyer's chat for this listing. */
export function MessageSellerButton({ listingId }: { listingId: string }) {
  const [state, action] = useActionState(startConversationAction, initialActionState);

  return (
    <form action={action} className="flex-1">
      <input type="hidden" name="listing_id" value={listingId} />
      <SubmitButton className="w-full" pendingText="Opening chat…">
        <MessageCircle aria-hidden /> Message seller
      </SubmitButton>
      {state.status === "error" && state.message && (
        <p role="alert" className="mt-1.5 text-center text-xs text-destructive">
          {state.message}
        </p>
      )}
    </form>
  );
}
