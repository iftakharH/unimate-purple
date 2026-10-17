"use client";

import { Check, X } from "lucide-react";
import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/validation/helpers";
import { reviewSellerRequestAction } from "./actions";

export function ReviewRequest({
  requestId,
  businessName,
  description,
  contactPhone,
  applicantName,
  applicantEmail,
  submitted,
}: {
  requestId: string;
  businessName: string;
  description: string | null;
  contactPhone: string | null;
  applicantName: string;
  applicantEmail: string;
  submitted: string;
}) {
  const [state, action] = useActionState(reviewSellerRequestAction, initialActionState);
  const [note, setNote] = useState("");

  if (state.status === "success") {
    return (
      <div className="rounded-2xl border border-success/40 bg-success/5 px-4 py-3">
        <p role="status" className="text-sm text-foreground">
          {state.message}
        </p>
      </div>
    );
  }

  return (
    <div className="elev-1 rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{businessName}</p>
          <p className="text-xs text-muted-foreground">
            {applicantName} · {applicantEmail} · applied {submitted}
          </p>
        </div>
        {contactPhone && (
          <a
            href={`tel:${contactPhone}`}
            className="tabular text-sm text-primary hover:underline"
          >
            {contactPhone}
          </a>
        )}
      </div>

      {description && (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      )}

      <form action={action} className="mt-4 space-y-3">
        <input type="hidden" name="request_id" value={requestId} />

        <div className="space-y-2">
          <Label htmlFor={`note-${requestId}`} className="text-xs">
            Note to applicant (optional — included on rejection)
          </Label>
          <Input
            id={`note-${requestId}`}
            name="admin_note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. We need a clearer description of what you'll sell."
            maxLength={300}
          />
        </div>

        {state.status === "error" && state.message && (
          <p role="alert" className="text-sm text-destructive">
            {state.message}
          </p>
        )}

        <div className="flex gap-2">
          <SubmitButton
            name="decision"
            value="approved"
            size="sm"
            className="w-auto"
            pendingText="Approving…"
          >
            <Check aria-hidden /> Approve
          </SubmitButton>
          <SubmitButton
            name="decision"
            value="rejected"
            size="sm"
            variant="destructive"
            className="w-auto"
            pendingText="Rejecting…"
          >
            <X aria-hidden /> Reject
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
