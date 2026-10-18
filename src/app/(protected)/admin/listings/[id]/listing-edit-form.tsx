"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/validation/helpers";
import { updateListingAction } from "../actions";

const selectClasses =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none transition-[color,box-shadow] duration-base focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 dark:bg-input/30";

export function ListingEditForm({
  listing,
  categories,
}: {
  listing: {
    id: string;
    title: string;
    price_bdt: number;
    quantity: number;
    condition: string;
    status: string;
    category_id: string | null;
    pickup_location: string | null;
  };
  categories: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(updateListingAction, initialActionState);

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="max-w-xl space-y-4" noValidate>
      <input type="hidden" name="listing_id" value={listing.id} />

      <div className="space-y-2">
        <Label htmlFor="edit-title">Title</Label>
        <Input
          id="edit-title"
          name="title"
          defaultValue={listing.title}
          aria-invalid={Boolean(errors.title)}
          required
        />
        {errors.title && (
          <p role="alert" className="text-sm text-destructive">
            {errors.title[0]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-price">Price (৳)</Label>
          <Input
            id="edit-price"
            name="price_bdt"
            inputMode="numeric"
            defaultValue={String(listing.price_bdt)}
            className="tabular"
            aria-invalid={Boolean(errors.price_bdt)}
            required
          />
          {errors.price_bdt && (
            <p role="alert" className="text-sm text-destructive">
              {errors.price_bdt[0]}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-quantity">Quantity</Label>
          <Input
            id="edit-quantity"
            name="quantity"
            inputMode="numeric"
            defaultValue={String(listing.quantity)}
            className="tabular"
            aria-invalid={Boolean(errors.quantity)}
            required
          />
          {errors.quantity && (
            <p role="alert" className="text-sm text-destructive">
              {errors.quantity[0]}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-condition">Condition</Label>
          <select
            id="edit-condition"
            name="condition"
            defaultValue={listing.condition}
            className={selectClasses}
          >
            <option value="new">New</option>
            <option value="used">Used</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-status">Status</Label>
          <select
            id="edit-status"
            name="status"
            defaultValue={listing.status}
            className={selectClasses}
          >
            <option value="active">Active</option>
            <option value="hidden">Hidden</option>
            <option value="sold">Sold</option>
            <option value="sold_out">Sold out</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-category">Category</Label>
          <select
            id="edit-category"
            name="category_id"
            defaultValue={listing.category_id ?? ""}
            className={selectClasses}
          >
            <option value="">Uncategorised</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-pickup">Pickup location</Label>
          <Input
            id="edit-pickup"
            name="pickup_location"
            defaultValue={listing.pickup_location ?? ""}
            placeholder="e.g. Library gate"
          />
        </div>
      </div>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      <SubmitButton className="w-auto" pendingText="Saving…">
        Save changes
      </SubmitButton>
    </form>
  );
}
