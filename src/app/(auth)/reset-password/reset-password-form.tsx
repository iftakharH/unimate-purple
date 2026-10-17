"use client";

import Link from "next/link";
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
import { resetPasswordAction } from "../actions";

export function ResetPasswordForm() {
  const [state, action] = useActionState(resetPasswordAction, initialActionState);
  const errors = state.fieldErrors ?? {};

  return (
    <Card className="elev-2">
      <CardHeader>
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <CardDescription>You&apos;re signed in via the reset link.</CardDescription>
      </CardHeader>
      <CardContent>
        {state.status === "success" ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">{state.message}</p>
            <Link href="/" className="text-sm font-medium text-primary hover:underline">
              Continue to Unimate
            </Link>
          </div>
        ) : (
          <form action={action} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "password-error" : "password-hint"}
                required
              />
              {errors.password ? (
                <p id="password-error" role="alert" className="text-sm text-destructive">
                  {errors.password[0]}
                </p>
              ) : (
                <p id="password-hint" className="text-xs text-muted-foreground">
                  8+ characters with at least one letter and one number.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirm)}
                aria-describedby={errors.confirm ? "confirm-error" : undefined}
                required
              />
              {errors.confirm && (
                <p id="confirm-error" role="alert" className="text-sm text-destructive">
                  {errors.confirm[0]}
                </p>
              )}
            </div>

            {state.status === "error" && state.message && (
              <p role="alert" className="text-sm text-destructive">
                {state.message}
              </p>
            )}

            <SubmitButton pendingText="Updating…">Update password</SubmitButton>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
