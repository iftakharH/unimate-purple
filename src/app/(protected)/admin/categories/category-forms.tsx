"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { ConfirmAction } from "@/components/confirm-action";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/validation/helpers";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "./actions";

export function CategoryAddForm({ nextSortOrder }: { nextSortOrder: number }) {
  const [state, action] = useActionState(createCategoryAction, initialActionState);

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-wrap items-end gap-3" noValidate>
      <div className="min-w-40 flex-1 space-y-1.5">
        <Label htmlFor="cat-name" className="text-xs">
          Name
        </Label>
        <Input
          id="cat-name"
          name="name"
          placeholder="e.g. Musical instruments"
          aria-invalid={Boolean(errors.name)}
          required
        />
        {errors.name && (
          <p role="alert" className="text-xs text-destructive">
            {errors.name[0]}
          </p>
        )}
      </div>
      <div className="w-36 space-y-1.5">
        <Label htmlFor="cat-icon" className="text-xs">
          Icon (optional)
        </Label>
        <Input id="cat-icon" name="icon" placeholder="🎸 or a name" />
      </div>
      <div className="w-24 space-y-1.5">
        <Label htmlFor="cat-sort" className="text-xs">
          Sort
        </Label>
        <Input
          id="cat-sort"
          name="sort_order"
          inputMode="numeric"
          defaultValue={String(nextSortOrder)}
          className="tabular"
          required
        />
      </div>
      <SubmitButton className="w-auto" pendingText="Adding…">
        <Plus aria-hidden /> Add
      </SubmitButton>
    </form>
  );
}

export function CategoryRow({
  categoryId,
  name,
  icon,
  sortOrder,
  listingCount,
}: {
  categoryId: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  listingCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(updateCategoryAction, initialActionState);

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  if (editing) {
    return (
      <form
        action={action}
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-muted/40 p-3"
        noValidate
      >
        <input type="hidden" name="category_id" value={categoryId} />
        <div className="min-w-36 flex-1 space-y-1.5">
          <Label htmlFor={`cat-name-${categoryId}`} className="text-xs">
            Name
          </Label>
          <Input id={`cat-name-${categoryId}`} name="name" defaultValue={name} required />
        </div>
        <div className="w-36 space-y-1.5">
          <Label htmlFor={`cat-icon-${categoryId}`} className="text-xs">
            Icon
          </Label>
          <Input
            id={`cat-icon-${categoryId}`}
            name="icon"
            defaultValue={icon ?? ""}
            placeholder="optional"
          />
        </div>
        <div className="w-24 space-y-1.5">
          <Label htmlFor={`cat-sort-${categoryId}`} className="text-xs">
            Sort
          </Label>
          <Input
            id={`cat-sort-${categoryId}`}
            name="sort_order"
            inputMode="numeric"
            defaultValue={String(sortOrder)}
            className="tabular"
            required
          />
        </div>
        <div className="flex gap-2">
          <SubmitButton size="sm" className="w-auto" pendingText="Saving…">
            Save
          </SubmitButton>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="grid size-9 place-items-center rounded-lg border bg-accent text-base">
        {icon || "•"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")} ·{" "}
          <span className="tabular">{listingCount}</span> listings · sort{" "}
          <span className="tabular">{sortOrder}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil aria-hidden /> Edit
        </Button>
        <ConfirmAction
          action={deleteCategoryAction}
          fields={{ category_id: categoryId }}
          label="Delete"
          confirmLabel="Delete category"
          pendingText="Deleting…"
          description={`Listings in "${name}" stay live but become uncategorised.`}
          icon={<Trash2 aria-hidden />}
        />
      </div>
    </div>
  );
}
