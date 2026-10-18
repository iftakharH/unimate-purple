"use client";

import { CreditCard, Landmark, Smartphone } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { SubmitButton } from "@/components/submit-button";
import { formatBdt } from "@/lib/format";
import { initialActionState } from "@/lib/validation/helpers";
import { cn } from "@/lib/utils";
import { payDealAction } from "../actions";

const METHODS = [
  { value: "card", label: "Card", icon: CreditCard },
  { value: "mobile_wallet", label: "Mobile wallet", icon: Smartphone },
  { value: "bank", label: "Bank", icon: Landmark },
] as const;

/** Sandbox checkout for pay-in-app deals — nothing real moves. */
export function SandboxCheckout({
  dealId,
  amount,
}: {
  dealId: string;
  amount: number;
}) {
  const [method, setMethod] = useState<"card" | "mobile_wallet" | "bank">("card");
  const [state, action] = useActionState(payDealAction, initialActionState);

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="deal_id" value={dealId} />
      <input type="hidden" name="method" value={method} />

      <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--neon)]/50 bg-[var(--neon)]/10 px-2.5 py-1 text-[11px] font-medium text-foreground">
        <span className="size-1.5 rounded-full bg-[var(--neon)]" aria-hidden />
        Sandbox payment — no real money moves
      </p>

      <div role="group" aria-label="Payment method" className="grid grid-cols-3 gap-2">
        {METHODS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={method === value}
            onClick={() => setMethod(value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors duration-fast",
              method === value
                ? "border-primary bg-primary/10 text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Card numbers, CVV or expiry are never collected or stored.
      </p>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      <SubmitButton className="w-full" pendingText="Processing (sandbox)…">
        Pay {formatBdt(amount)} — sandbox
      </SubmitButton>
    </form>
  );
}
