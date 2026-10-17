"use client";

import { CheckCircle2 } from "lucide-react";
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
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/constants";
import { initialActionState } from "@/lib/validation/helpers";
import { signUpAction } from "../actions";

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, initialActionState);
  const errors = state.fieldErrors ?? {};

  if (state.status === "success") {
    return (
      <Card className="elev-2">
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="size-10 text-primary" aria-hidden />
          <CardTitle className="text-xl">Check your inbox</CardTitle>
          <CardDescription className="text-balance">{state.message}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Wrong address?{" "}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => window.location.reload()}
            >
              Start over
            </button>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="elev-2">
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>
          Free for East Delta University students. Everyone starts as a buyer —
          seller access is approved by an admin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              name="full_name"
              autoComplete="name"
              aria-invalid={Boolean(errors.full_name)}
              aria-describedby={errors.full_name ? "full_name-error" : undefined}
              required
            />
            {errors.full_name && (
              <p id="full_name-error" role="alert" className="text-sm text-destructive">
                {errors.full_name[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Campus email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={`you@${ALLOWED_EMAIL_DOMAIN}`}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : "email-hint"}
              required
            />
            {errors.email ? (
              <p id="email-error" role="alert" className="text-sm text-destructive">
                {errors.email[0]}
              </p>
            ) : (
              <p id="email-hint" className="text-xs text-muted-foreground">
                Sign-up is limited to @{ALLOWED_EMAIL_DOMAIN} addresses. No campus
                email? Ask an admin to invite you.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
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

          {state.status === "error" && state.message && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}

          <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
