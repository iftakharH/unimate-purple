"use client";

import { HeartOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { toggleSavedItemAction } from "@/app/listing/[id]/actions";
import { Button } from "@/components/ui/button";

/** Unsaves a listing from the saved-items page, then refreshes the grid. */
export function RemoveSavedButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      const result = await toggleSavedItemAction(listingId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Removed from saved.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full"
      disabled={busy}
      onClick={remove}
    >
      <HeartOff aria-hidden /> Remove
    </Button>
  );
}
