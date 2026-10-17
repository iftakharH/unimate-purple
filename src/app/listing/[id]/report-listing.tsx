"use client";

import { Flag, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/validation/helpers";
import { reportListingAction } from "./actions";

const selectClasses =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none transition-[color,box-shadow] duration-base focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 dark:bg-input/30";

/** Inline disclosure (no modal) — report a listing. */
export function ReportListing({
  listingId,
  isAuthed,
}: {
  listingId: string;
  isAuthed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(reportListingAction, initialActionState);

  if (!isAuthed) {
    return (
      <Button
        render={<Link href={`/login?next=/listing/${listingId}`} />}
        nativeButton={false}
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
      >
        <Flag aria-hidden /> Report listing
      </Button>
    );
  }

  if (state.status === "success") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldAlert className="size-4 text-success" aria-hidden />
        {state.message}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {!open ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setOpen(true)}
        >
          <Flag aria-hidden /> Report listing
        </Button>
      ) : (
        <form action={action} className="space-y-3 rounded-xl border p-3.5">
          <input type="hidden" name="listing_id" value={listingId} />

          <div className="space-y-1.5">
            <Label htmlFor={`reason-${listingId}`} className="text-xs">
              What&apos;s wrong with it?
            </Label>
            <select
              id={`reason-${listingId}`}
              name="reason"
              defaultValue="spam"
              className={selectClasses}
            >
              <option value="spam">Spam or duplicated</option>
              <option value="scam">Scam or misleading</option>
              <option value="inappropriate">Inappropriate content</option>
              <option value="wrong-category">Wrong category</option>
              <option value="other">Something else</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`details-${listingId}`} className="text-xs">
              Anything else? (optional)
            </Label>
            <textarea
              id={`details-${listingId}`}
              name="details"
              rows={2}
              maxLength={500}
              className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] duration-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>

          {state.status === "error" && state.message && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}

          <div className="flex gap-2">
            <SubmitButton variant="destructive" size="sm" className="w-auto" pendingText="Sending…">
              Send report
            </SubmitButton>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
