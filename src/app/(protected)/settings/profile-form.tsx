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
import { Badge } from "@/components/ui/badge";
import { initialActionState } from "@/lib/validation/helpers";
import { updateProfileAction } from "./actions";

export function ProfileForm({
  defaultValues,
  email,
  role,
}: {
  defaultValues: { full_name: string; phone: string; bio: string };
  email: string;
  role: string;
}) {
  const [state, action] = useActionState(updateProfileAction, initialActionState);
  const errors = state.fieldErrors ?? {};

  return (
    <Card className="elev-1">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Your details</CardTitle>
          <Badge variant="secondary" className="capitalize">
            {role}
          </Badge>
        </div>
        <CardDescription>
          This is what buyers and sellers see when they deal with you.
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
              defaultValue={defaultValues.full_name}
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
            <Label>Account email</Label>
            <Input value={email} disabled readOnly aria-readonly />
            <p className="text-xs text-muted-foreground">
              Change it from the Security tab.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="01XXXXXXXXX"
              defaultValue={defaultValues.phone}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "phone-error" : "phone-hint"}
            />
            {errors.phone ? (
              <p id="phone-error" role="alert" className="text-sm text-destructive">
                {errors.phone[0]}
              </p>
            ) : (
              <p id="phone-hint" className="text-xs text-muted-foreground">
                Shown only to people who are dealing with you.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">About you (optional)</Label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              maxLength={280}
              defaultValue={defaultValues.bio}
              aria-invalid={Boolean(errors.bio)}
              aria-describedby={errors.bio ? "bio-error" : "bio-hint"}
              className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] duration-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-destructive/30"
            />
            {errors.bio ? (
              <p id="bio-error" role="alert" className="text-sm text-destructive">
                {errors.bio[0]}
              </p>
            ) : (
              <p id="bio-hint" className="text-xs text-muted-foreground">
                Up to 280 characters.
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

          <SubmitButton className="w-auto" pendingText="Saving…">
            Save changes
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
