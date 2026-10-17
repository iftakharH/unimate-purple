"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/validation/helpers";
import { updateEmailAction } from "../actions";

export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, action] = useActionState(updateEmailAction, initialActionState);
  const errors = state.fieldErrors ?? {};

  return (
    <Card className="elev-1">
      <CardHeader>
        <CardTitle className="text-base">Change email</CardTitle>
        <CardDescription>
          Current: <span className="text-foreground">{currentEmail}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="new-email">New email</Label>
            <Input
              id="new-email"
              name="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "new-email-error" : "new-email-hint"}
              required
            />
            {errors.email ? (
              <p id="new-email-error" role="alert" className="text-sm text-destructive">
                {errors.email[0]}
              </p>
            ) : (
              <p id="new-email-hint" className="text-xs text-muted-foreground">
                We&apos;ll email confirmation links to both addresses — the change
                completes when both are confirmed.
              </p>
            )}
          </div>

          {state.status === "error" && state.message && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}
          {state.status === "success" && state.message && (
            <p role="status" className="text-sm text-muted-foreground">
              {state.message}
            </p>
          )}

          <SubmitButton className="w-auto" variant="outline" pendingText="Sending…">
            Send confirmation links
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
