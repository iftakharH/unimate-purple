"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/validation/helpers";
import { cn } from "@/lib/utils";
import { createListingAction, updateListingAction } from "./actions";
import { PhotoManager } from "./photo-manager";

const selectClasses =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none transition-[color,box-shadow] duration-base focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 dark:bg-input/30";

const textareaClasses =
  "flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] duration-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-destructive/30";

export function ListingForm({
  mode,
  userId,
  categories,
  listingId,
  defaults,
  initialImages,
  storePickup,
}: {
  mode: "create" | "edit";
  userId: string;
  categories: { id: string; name: string }[];
  listingId?: string;
  defaults: {
    title: string;
    description: string;
    price_bdt: string;
    category_id: string;
    condition: "new" | "used";
    quantity: string;
    pickup_location: string;
  };
  initialImages: string[];
  storePickup: string | null;
}) {
  const [state, action] = useActionState(
    mode === "create" ? createListingAction : updateListingAction,
    initialActionState,
  );
  const [images, setImages] = useState<string[]>(initialImages);
  const [uploading, setUploading] = useState(0);
  const [condition, setCondition] = useState<"new" | "used">(defaults.condition);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-6" noValidate>
      {listingId ? <input type="hidden" name="listing_id" value={listingId} /> : null}
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="condition" value={condition} />

      <PhotoManager
        userId={userId}
        images={images}
        onChange={setImages}
        onUploadingChange={setUploading}
      />

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          placeholder="e.g. Dell Latitude 7420 — i7, 16GB RAM"
          defaultValue={defaults.title}
          maxLength={100}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "title-error" : undefined}
          required
        />
        {errors.title && (
          <p id="title-error" role="alert" className="text-sm text-destructive">
            {errors.title[0]}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={5}
          maxLength={2000}
          placeholder="Condition details, what's included, why you're selling…"
          defaultValue={defaults.description}
          aria-invalid={Boolean(errors.description)}
          className={textareaClasses}
        />
        {errors.description && (
          <p role="alert" className="text-sm text-destructive">
            {errors.description[0]}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="price_bdt">Price (৳ BDT)</Label>
          <Input
            id="price_bdt"
            name="price_bdt"
            inputMode="numeric"
            placeholder="1450"
            defaultValue={defaults.price_bdt}
            aria-invalid={Boolean(errors.price_bdt)}
            className="tabular"
            required
          />
          {errors.price_bdt && (
            <p role="alert" className="text-sm text-destructive">
              {errors.price_bdt[0]}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            name="quantity"
            inputMode="numeric"
            defaultValue={defaults.quantity}
            aria-invalid={Boolean(errors.quantity)}
            className="tabular"
            required
          />
          {errors.quantity && (
            <p role="alert" className="text-sm text-destructive">
              {errors.quantity[0]}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category_id">Category</Label>
          <select
            id="category_id"
            name="category_id"
            defaultValue={defaults.category_id}
            className={selectClasses}
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label id="condition-label">Condition</Label>
          <div
            role="group"
            aria-labelledby="condition-label"
            className="flex h-9 items-center rounded-lg border p-0.5"
          >
            {(
              [
                ["used", "Used"],
                ["new", "New"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={condition === value}
                onClick={() => setCondition(value)}
                className={cn(
                  "flex-1 rounded-md px-3 py-1 text-sm font-medium transition-colors duration-fast",
                  condition === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pickup_location">Pickup spot (optional)</Label>
        <Input
          id="pickup_location"
          name="pickup_location"
          placeholder={storePickup ? `Store default: ${storePickup}` : "e.g. Library gate"}
          defaultValue={defaults.pickup_location}
          maxLength={80}
        />
        {errors.pickup_location && (
          <p role="alert" className="text-sm text-destructive">
            {errors.pickup_location[0]}
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

      <div className="flex items-center gap-3">
        <SubmitButton className="w-auto" pendingText={mode === "create" ? "Publishing…" : "Saving…"}>
          {mode === "create" ? "Publish listing" : "Save changes"}
        </SubmitButton>
        {uploading > 0 && (
          <span className="text-sm text-muted-foreground">
            {uploading} photo{uploading > 1 ? "s" : ""} still uploading…
          </span>
        )}
      </div>
    </form>
  );
}
