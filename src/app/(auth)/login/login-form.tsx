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
import { signInAction } from "../actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signInAction, initialActionState);
  const errors = state.fieldErrors ?? {};

  return (
    <Card className="elev-2">
      <CardHeader>
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in with your campus account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4" noValidate>
          {next ? <input type="hidden" name="next" value={next} /> : null}

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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Forgot?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              required
            />
            {errors.password && (
              <p id="password-error" role="alert" className="text-sm text-destructive">
                {errors.password[0]}
              </p>
            )}
          </div>

          {state.status === "error" && state.message && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}

          <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          New to Unimate?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
