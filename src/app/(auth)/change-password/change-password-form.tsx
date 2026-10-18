"use client";

import { KeyRound } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { initialActionState } from "@/lib/validation/helpers";
import { changePasswordAction } from "../actions";

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const [state, action] = useActionState(changePasswordAction, initialActionState);
  const errors = state.fieldErrors ?? {};

  return (
    <Card className="elev-2">
      <CardHeader className="items-center text-center">
        <KeyRound className="size-10 text-primary" aria-hidden />
        <CardTitle className="text-xl">
          {forced ? "Set a new password" : "Change password"}
        </CardTitle>
        <CardDescription className="text-balance">
          {forced
            ? "For security, temporary passwords must be replaced before you continue."
            : "Pick something you don't use anywhere else."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state.status === "success" && !forced ? (
          <p className="text-center text-sm text-muted-foreground">{state.message}</p>
        ) : (
          <form action={action} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="current">
                {forced ? "Temporary password" : "Current password"}
              </Label>
              <PasswordInput
                id="current"
                name="current"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.current)}
                aria-describedby={errors.current ? "current-error" : undefined}
                required
              />
              {errors.current && (
                <p id="current-error" role="alert" className="text-sm text-destructive">
                  {errors.current[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <PasswordInput
                id="password"
                name="password"
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
              <Label htmlFor="confirm">Confirm new password</Label>
              <PasswordInput
                id="confirm"
                name="confirm"
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
            {state.status === "success" && state.message && (
              <p role="status" className="text-sm text-muted-foreground">
                {state.message}
              </p>
            )}

            <SubmitButton pendingText="Updating…">
              {forced ? "Save and continue" : "Change password"}
            </SubmitButton>
          </form>
        )}

        {state.status === "success" && forced && (
          <p className="mt-4 text-center">
            <Link href="/" className="text-sm font-medium text-primary hover:underline">
              Continue to Unimate
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
