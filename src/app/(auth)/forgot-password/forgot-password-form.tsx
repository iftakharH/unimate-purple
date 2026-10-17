"use client";

import { MailCheck } from "lucide-react";
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
import { forgotPasswordAction } from "../actions";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, initialActionState);
  const errors = state.fieldErrors ?? {};

  return (
    <Card className="elev-2">
      <CardHeader>
        <CardTitle className="text-xl">Reset your password</CardTitle>
        <CardDescription>
          Enter your account email and we&apos;ll send you a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state.status === "success" ? (
          <div className="space-y-4 text-center">
            <MailCheck className="mx-auto size-10 text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">{state.message}</p>
            <Link href="/login" className="text-sm font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form action={action} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@eastdelta.edu.bd"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
                required
              />
              {errors.email && (
                <p id="email-error" role="alert" className="text-sm text-destructive">
                  {errors.email[0]}
                </p>
              )}
            </div>

            {state.status === "error" && state.message && (
              <p role="alert" className="text-sm text-destructive">
                {state.message}
              </p>
            )}

            <SubmitButton pendingText="Sending…">Send reset link</SubmitButton>

            <p className="text-center text-sm text-muted-foreground">
              Remembered it?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
