"use client";

import { Banknote, CheckCheck, PackageCheck, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import {
  initialActionState,
  type ActionState,
} from "@/lib/validation/helpers";
import {
  acceptDealAction,
  cancelDealAction,
  confirmCampusHandoverAction,
  confirmReceiptAction,
  markHandedOverAction,
  rejectDealAction,
} from "../actions";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

function ActionButton({
  action,
  dealId,
  children,
  variant = "default",
  pendingText,
}: {
  action: Action;
  dealId: string;
  children: React.ReactNode;
  variant?: "default" | "outline" | "destructive";
  pendingText: string;
}) {
  const [state, formAction] = useActionState(action, initialActionState);

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="deal_id" value={dealId} />
      <SubmitButton variant={variant} className="w-full" pendingText={pendingText}>
        {children}
      </SubmitButton>
    </form>
  );
}

function CancelDeal({ dealId }: { dealId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(cancelDealAction, initialActionState);

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <X aria-hidden /> Cancel deal
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-2.5 rounded-xl border p-3">
      <input type="hidden" name="deal_id" value={dealId} />
      <label htmlFor={`cancel-reason-${dealId}`} className="text-xs text-muted-foreground">
        Reason (optional)
      </label>
      <textarea
        id={`cancel-reason-${dealId}`}
        name="reason"
        rows={2}
        maxLength={200}
        placeholder="e.g. Found another option."
        className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      <div className="flex gap-2">
        <SubmitButton variant="destructive" size="sm" className="w-auto" pendingText="Cancelling…">
          Cancel the deal
        </SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Keep it
        </Button>
      </div>
    </form>
  );
}

export type DealActionVariant =
  | "seller-requested"
  | "buyer-requested"
  | "seller-campus-handover"
  | "buyer-accepted-campus"
  | "waiting-buyer-pay"
  | "mark-handover"
  | "waiting-handover"
  | "confirm-receipt"
  | "waiting-receipt";

/** Contextual deal controls — the exact buttons for this status and role. */
export function DealActions({
  dealId,
  variant,
}: {
  dealId: string;
  variant: DealActionVariant;
}) {
  switch (variant) {
    case "seller-requested":
      return (
        <div className="space-y-3">
          <ActionButton action={acceptDealAction} dealId={dealId} pendingText="Accepting…">
            <CheckCheck aria-hidden /> Accept deal
          </ActionButton>
          <ActionButton
            action={rejectDealAction}
            dealId={dealId}
            variant="destructive"
            pendingText="Rejecting…"
          >
            <X aria-hidden /> Reject
          </ActionButton>
          <CancelDeal dealId={dealId} />
        </div>
      );

    case "buyer-requested":
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Waiting for the seller to accept your offer.
          </p>
          <CancelDeal dealId={dealId} />
        </div>
      );

    case "seller-campus-handover":
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Meet on campus, hand the item over, then confirm — the deal completes
            in one step.
          </p>
          <ActionButton
            action={confirmCampusHandoverAction}
            dealId={dealId}
            pendingText="Confirming…"
          >
            <PackageCheck aria-hidden /> Confirm handover & complete
          </ActionButton>
          <CancelDeal dealId={dealId} />
        </div>
      );

    case "buyer-accepted-campus":
      return (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Banknote className="size-4 shrink-0" aria-hidden />
            Pay the seller when you meet — the seller confirms the handover
            afterwards.
          </p>
          <CancelDeal dealId={dealId} />
        </div>
      );

    case "waiting-buyer-pay":
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Waiting for the buyer to pay (sandbox) — then you hand over.
          </p>
          <CancelDeal dealId={dealId} />
        </div>
      );

    case "mark-handover":
      return (
        <ActionButton
          action={markHandedOverAction}
          dealId={dealId}
          pendingText="Saving…"
        >
          <PackageCheck aria-hidden /> Mark as handed over
        </ActionButton>
      );

    case "waiting-handover":
      return (
        <p className="text-sm text-muted-foreground">
          Payment received — waiting for the seller to hand the item over.
        </p>
      );

    case "confirm-receipt":
      return (
        <ActionButton
          action={confirmReceiptAction}
          dealId={dealId}
          pendingText="Confirming…"
        >
          <CheckCheck aria-hidden /> Confirm receipt & complete
        </ActionButton>
      );

    case "waiting-receipt":
      return (
        <p className="text-sm text-muted-foreground">
          Handover done — waiting for the buyer to confirm receipt.
        </p>
      );

    default:
      return null;
  }
}
