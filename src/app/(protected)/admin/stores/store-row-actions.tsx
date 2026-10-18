"use client";

import { Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { ConfirmAction } from "@/components/confirm-action";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/validation/helpers";
import { deleteStoreAction, toggleStoreActiveAction, updateStoreAction } from "./actions";

export function StoreRowActions({
  storeId,
  businessName,
  description,
  pickupLocation,
  contactPhone,
  isActive,
}: {
  storeId: string;
  businessName: string;
  description: string | null;
  pickupLocation: string | null;
  contactPhone: string | null;
  isActive: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(updateStoreAction, initialActionState);

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  if (editing) {
    return (
      <form
        action={action}
        className="max-w-xl space-y-3 rounded-xl border bg-muted/40 p-3"
        noValidate
      >
        <input type="hidden" name="store_id" value={storeId} />
        <div className="space-y-1.5">
          <Label htmlFor={`store-name-${storeId}`} className="text-xs">
            Business name
          </Label>
          <Input
            id={`store-name-${storeId}`}
            name="business_name"
            defaultValue={businessName}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`store-desc-${storeId}`} className="text-xs">
            Description
          </Label>
          <textarea
            id={`store-desc-${storeId}`}
            name="description"
            rows={2}
            maxLength={600}
            defaultValue={description ?? ""}
            className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`store-pickup-${storeId}`} className="text-xs">
              Pickup location
            </Label>
            <Input
              id={`store-pickup-${storeId}`}
              name="pickup_location"
              defaultValue={pickupLocation ?? ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`store-phone-${storeId}`} className="text-xs">
              Contact phone
            </Label>
            <Input
              id={`store-phone-${storeId}`}
              name="contact_phone"
              defaultValue={contactPhone ?? ""}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <SubmitButton size="sm" className="w-auto" pendingText="Saving…">
            Save store
          </SubmitButton>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
        <Pencil aria-hidden /> Edit
      </Button>
      {isActive ? (
        <ConfirmAction
          action={toggleStoreActiveAction}
          fields={{ store_id: storeId, next: "inactive" }}
          label="Deactivate"
          confirmLabel="Yes, deactivate"
          pendingText="Deactivating…"
          description="The storefront goes offline; listings stay but are not reachable through the store."
          variant="secondary"
          icon={<PowerOff aria-hidden />}
        />
      ) : (
        <ConfirmAction
          action={toggleStoreActiveAction}
          fields={{ store_id: storeId, next: "active" }}
          label="Activate"
          confirmLabel="Yes, activate"
          pendingText="Activating…"
          description="The storefront becomes visible to signed-in students again."
          variant="outline"
          icon={<Power aria-hidden />}
        />
      )}
      <ConfirmAction
        action={deleteStoreAction}
        fields={{ store_id: storeId }}
        label="Delete"
        confirmLabel="Delete store + listings"
        pendingText="Deleting…"
        description={`Deletes "${businessName}" and every listing in it (photos, chats, saved references included). This cannot be undone.`}
        icon={<Trash2 aria-hidden />}
      />
    </div>
  );
}
