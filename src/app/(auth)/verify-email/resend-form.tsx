"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/validation/helpers";
import { resendVerificationAction } from "../actions";

export function ResendForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, action] = useActionState(resendVerificationAction, initialActionState);

  return (
    <form action={action} className="space-y-3" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={defaultEmail}
          placeholder="you@eastdelta.edu.bd"
          required
        />
      </div>

      {state.message && (
        <p
          role="status"
          className={
            state.status === "error"
              ? "text-sm text-destructive"
              : "text-sm text-muted-foreground"
          }
        >
          {state.message}
        </p>
      )}

      <SubmitButton variant="outline" pendingText="Sending…">
        Resend confirmation link
      </SubmitButton>
    </form>
  );
}
