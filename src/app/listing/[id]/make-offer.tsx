"use client";

import { Handshake } from "lucide-react";
import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/validation/helpers";
import { cn } from "@/lib/utils";
import { createDealAction } from "./actions";

const textareaClasses =
  "flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] duration-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

/**
 * "Make an offer" — folds open into an inline form (price, quantity,
 * pay-on-campus vs sandbox in-app payment, optional note).
 */
export function MakeOfferButton({
  listingId,
  price,
  maxQuantity,
}: {
  listingId: string;
  price: number;
  maxQuantity: number;
}) {
  const [open, setOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"pay_on_campus" | "pay_in_app">(
    "pay_on_campus",
  );
  const [quantity, setQuantity] = useState("1");
  const [state, action] = useActionState(createDealAction, initialActionState);

  if (!open) {
    return (
      <Button type="button" className="w-full" onClick={() => setOpen(true)}>
        <Handshake aria-hidden /> Make an offer
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-3 rounded-2xl border p-3.5">
      <input type="hidden" name="listing_id" value={listingId} />
      <input type="hidden" name="payment_mode" value={paymentMode} />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="offer-quantity" className="text-xs">
            Quantity (max {maxQuantity})
          </Label>
          <Input
            id="offer-quantity"
            name="quantity"
            inputMode="numeric"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="tabular"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="offer-amount" className="text-xs">
            Offer total (৳)
          </Label>
          <Input
            id="offer-amount"
            name="amount_bdt"
            inputMode="numeric"
            defaultValue={String(price * Math.max(1, Number(quantity) || 1))}
            key={quantity}
            className="tabular"
          />
          <p className="text-[11px] text-muted-foreground">
            Asking ৳{price.toLocaleString()} each — negotiate freely.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Payment</Label>
        <div role="group" aria-label="Payment mode" className="flex rounded-lg border p-0.5">
          {(
            [
              ["pay_on_campus", "Pay on campus"],
              ["pay_in_app", "Pay in app (sandbox)"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={paymentMode === value}
              onClick={() => setPaymentMode(value)}
              className={cn(
                "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors duration-fast",
                paymentMode === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {paymentMode === "pay_in_app" && (
          <p className="text-[11px] text-muted-foreground">
            Sandbox payment — no real money moves, and card details are never
            collected.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="offer-note" className="text-xs">
          Note for the seller (optional)
        </Label>
        <textarea
          id="offer-note"
          name="buyer_note"
          rows={2}
          maxLength={400}
          placeholder="e.g. Can pick up tomorrow after class."
          className={textareaClasses}
        />
      </div>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      <div className="flex gap-2">
        <SubmitButton className="w-auto" pendingText="Sending offer…">
          Send offer
        </SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
