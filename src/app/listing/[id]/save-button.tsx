"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleSavedItemAction } from "./actions";

export function SaveButton({
  listingId,
  isAuthed,
  initiallySaved,
}: {
  listingId: string;
  isAuthed: boolean;
  initiallySaved: boolean;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);

  if (!isAuthed) {
    return (
      <Button
        render={<Link href={`/login?next=/listing/${listingId}`} />}
        nativeButton={false}
        variant="outline"
        className="flex-1"
      >
        <Heart aria-hidden /> Save
      </Button>
    );
  }

  async function toggle() {
    setBusy(true);
    const optimistic = !saved;
    setSaved(optimistic); // optimistic — interruptible, reverted on failure
    try {
      const result = await toggleSavedItemAction(listingId);
      if (result.error) {
        setSaved(!optimistic);
        toast.error(result.error);
        return;
      }
      setSaved(result.saved);
      toast.success(result.saved ? "Saved to your list." : "Removed from saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant={saved ? "default" : "outline"}
      className="flex-1"
      disabled={busy}
      aria-pressed={saved}
      onClick={toggle}
    >
      <Heart className={cn(saved && "fill-current")} aria-hidden />
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
