"use client";

import { Camera, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { updateAvatarAction } from "./actions";

const MAX_BYTES = 5 * 1024 * 1024;

function initialsOf(name: string, email: string): string {
  const source = name.trim() || email;
  const words = source.split(/[\s@._-]+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Avatar upload goes straight from the browser to Supabase Storage
 * (`avatars/{userId}/…`, enforced by storage RLS) — then a server action
 * persists the public URL on the profile. Avoids shipping 5 MB through a
 * Server Action body.
 */
export function AvatarUploader({
  userId,
  fullName,
  email,
  avatarUrl,
}: {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Images must be 5 MB or smaller.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().slice(0, 5);
      const path = `${userId}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { cacheControl: "3600", contentType: file.type });
      if (uploadError) {
        toast.error("Upload failed — please try again.");
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const result = await updateAvatarAction(data.publicUrl);
      if (result.status !== "success") {
        toast.error(result.message ?? "Could not save your photo.");
        return;
      }

      toast.success("Photo updated.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar size="lg" className="elev-1 size-16">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback className="text-base">
          {initialsOf(fullName, email)}
        </AvatarFallback>
      </Avatar>

      <div className="space-y-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onFileChange}
          aria-label="Upload profile photo"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <>
              <Loader2 className="animate-spin" aria-hidden /> Uploading…
            </>
          ) : (
            <>
              <Camera aria-hidden /> Change photo
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, WebP or GIF · up to 5 MB.
        </p>
      </div>
    </div>
  );
}
