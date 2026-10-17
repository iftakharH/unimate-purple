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
import { initialActionState } from "@/lib/validation/helpers";
import { requestSellerAccessAction } from "./actions";

export function SellerRequestForm({
  defaultValues,
}: {
  defaultValues?: { business_name: string; description: string; contact_phone: string };
}) {
  const [state, action] = useActionState(requestSellerAccessAction, initialActionState);
  const errors = state.fieldErrors ?? {};

  if (state.status === "success") {
    return (
      <Card className="elev-2">
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="size-10 text-success" aria-hidden />
          <CardTitle className="text-xl">Request sent</CardTitle>
          <CardDescription className="text-balance">{state.message}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link
            href="/settings"
            className="text-sm font-medium text-primary hover:underline"
          >
            Back to your account
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="elev-2">
      <CardHeader>
        <CardTitle className="text-base">Tell us about your store</CardTitle>
        <CardDescription>
          The business name appears on your public store page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="business_name">Business name</Label>
            <Input
              id="business_name"
              name="business_name"
              placeholder="e.g. Rafi's Tech Corner"
              defaultValue={defaultValues?.business_name}
              aria-invalid={Boolean(errors.business_name)}
              aria-describedby={errors.business_name ? "business_name-error" : undefined}
              required
            />
            {errors.business_name && (
              <p id="business_name-error" role="alert" className="text-sm text-destructive">
                {errors.business_name[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Short description</Label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={300}
              placeholder="What will you sell? Where do buyers meet you?"
              defaultValue={defaultValues?.description}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "description-error" : "description-hint"}
              className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] duration-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-destructive/30"
            />
            {errors.description ? (
              <p id="description-error" role="alert" className="text-sm text-destructive">
                {errors.description[0]}
              </p>
            ) : (
              <p id="description-hint" className="text-xs text-muted-foreground">
                Up to 300 characters — this becomes your store&apos;s intro.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_phone">Contact phone</Label>
            <Input
              id="contact_phone"
              name="contact_phone"
              type="tel"
              placeholder="01XXXXXXXXX"
              defaultValue={defaultValues?.contact_phone}
              aria-invalid={Boolean(errors.contact_phone)}
              aria-describedby={errors.contact_phone ? "contact_phone-error" : undefined}
              required
            />
            {errors.contact_phone && (
              <p id="contact_phone-error" role="alert" className="text-sm text-destructive">
                {errors.contact_phone[0]}
              </p>
            )}
          </div>

          {state.status === "error" && state.message && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}

          <SubmitButton pendingText="Sending request…">Request seller access</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
