"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/validation/helpers";
import { updateStoreAction } from "./actions";

export function StoreForm({
  defaultValues,
}: {
  defaultValues: {
    business_name: string;
    description: string;
    contact_phone: string;
    pickup_location: string;
  };
}) {
  const [state, action] = useActionState(updateStoreAction, initialActionState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="business_name">Business name</Label>
        <Input
          id="business_name"
          name="business_name"
          defaultValue={defaultValues.business_name}
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
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={400}
          defaultValue={defaultValues.description}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "description-error" : undefined}
          className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] duration-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-destructive/30"
        />
        {errors.description && (
          <p id="description-error" role="alert" className="text-sm text-destructive">
            {errors.description[0]}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact_phone">Contact phone</Label>
          <Input
            id="contact_phone"
            name="contact_phone"
            type="tel"
            placeholder="01XXXXXXXXX"
            defaultValue={defaultValues.contact_phone}
            aria-invalid={Boolean(errors.contact_phone)}
            aria-describedby={errors.contact_phone ? "contact_phone-error" : undefined}
          />
          {errors.contact_phone && (
            <p id="contact_phone-error" role="alert" className="text-sm text-destructive">
              {errors.contact_phone[0]}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pickup_location">Pickup spot</Label>
          <Input
            id="pickup_location"
            name="pickup_location"
            placeholder="e.g. Library gate"
            maxLength={80}
            defaultValue={defaultValues.pickup_location}
            aria-invalid={Boolean(errors.pickup_location)}
            aria-describedby={errors.pickup_location ? "pickup_location-error" : undefined}
          />
          {errors.pickup_location && (
            <p
              id="pickup_location-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errors.pickup_location[0]}
            </p>
          )}
        </div>
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
        Save store
      </SubmitButton>
    </form>
  );
}
