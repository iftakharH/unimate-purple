"use client";

import { AlertTriangle, LogOut, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { signOutEverywhereAction } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
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
import { deleteAccountAction } from "../actions";

export function DangerZone({ email }: { email: string }) {
  const [state, action] = useActionState(deleteAccountAction, initialActionState);
  const [confirming, setConfirming] = useState(false);
  const errors = state.fieldErrors ?? {};

  return (
    <Card className="elev-1 border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-4 text-destructive" aria-hidden />
          Sessions and account
        </CardTitle>
        <CardDescription>
          These actions affect every device you&apos;re signed in on.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={signOutEverywhereAction}>
          <Button type="submit" variant="outline" size="sm">
            <LogOut aria-hidden /> Sign out of all devices
          </Button>
        </form>

        <div className="space-y-3 border-t pt-6">
          {!confirming ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setConfirming(true)}
            >
              <Trash2 aria-hidden /> Delete my account
            </Button>
          ) : (
            <form action={action} className="max-w-sm space-y-3" noValidate>
              <p className="text-sm text-muted-foreground">
                This permanently deletes <span className="text-foreground">{email}</span>{" "}
                and all of its data — listings, messages and deals included. This
                cannot be undone.
              </p>
              <div className="space-y-2">
                <Label htmlFor="current_password">Confirm your password</Label>
                <Input
                  id="current_password"
                  name="current_password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.current_password)}
                  aria-describedby={
                    errors.current_password ? "current_password-error" : undefined
                  }
                  required
                />
                {errors.current_password && (
                  <p
                    id="current_password-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {errors.current_password[0]}
                  </p>
                )}
              </div>

              {state.status === "error" && state.message && (
                <p role="alert" className="text-sm text-destructive">
                  {state.message}
                </p>
              )}

              <div className="flex gap-2">
                <SubmitButton
                  variant="destructive"
                  size="sm"
                  className="w-auto"
                  pendingText="Deleting…"
                >
                  Permanently delete
                </SubmitButton>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirming(false)}
                >
                  Keep my account
                </Button>
              </div>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
