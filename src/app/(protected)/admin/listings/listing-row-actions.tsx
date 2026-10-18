"use client";

import { Eye, EyeOff, Trash2 } from "lucide-react";

import { ConfirmAction } from "@/components/confirm-action";
import { deleteListingAction, setListingStatusAction } from "./actions";

/** Hide / restore / delete a listing — every one two-step confirmed. */
export function ListingRowActions({
  listingId,
  title,
  status,
}: {
  listingId: string;
  title: string;
  status: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "hidden" ? (
        <ConfirmAction
          action={setListingStatusAction}
          fields={{ listing_id: listingId, status: "active" }}
          label="Restore"
          confirmLabel="Yes, publish it"
          pendingText="Restoring…"
          description="It becomes visible in the marketplace again."
          variant="outline"
          icon={<Eye aria-hidden />}
        />
      ) : (
        <ConfirmAction
          action={setListingStatusAction}
          fields={{ listing_id: listingId, status: "hidden" }}
          label="Hide"
          confirmLabel="Yes, hide it"
          pendingText="Hiding…"
          description="It disappears from the marketplace for everyone but its owner."
          variant="secondary"
          icon={<EyeOff aria-hidden />}
        />
      )}
      <ConfirmAction
        action={deleteListingAction}
        fields={{ listing_id: listingId }}
        label="Delete"
        confirmLabel="Delete permanently"
        pendingText="Deleting…"
        description={`Deletes "${title}" with its photos, chats and saved references. This cannot be undone.`}
        icon={<Trash2 aria-hidden />}
      />
    </div>
  );
}
