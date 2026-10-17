"use client";

import { ImagePlus, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { updateStoreAssetAction } from "./actions";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Logo / banner upload → straight to Supabase Storage from the browser
 * (`store-assets/{userId}/…`, storage-RLS enforced), then the URL is saved
 * through a server action.
 */
export function StoreImageUpload({
  kind,
  userId,
  currentUrl,
}: {
  kind: "logo" | "banner";
  userId: string;
  currentUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);

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
      const path = `${userId}/${kind}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("store-assets")
        .upload(path, file, { cacheControl: "3600", contentType: file.type });
      if (uploadError) {
        toast.error("Upload failed — please try again.");
        return;
      }

      const { data } = supabase.storage.from("store-assets").getPublicUrl(path);
      const result = await updateStoreAssetAction(kind, data.publicUrl);
      if (result.status !== "success") {
        toast.error(result.message ?? "Could not save the image.");
        return;
      }

      setPreview(data.publicUrl);
      toast.success(kind === "logo" ? "Logo updated." : "Banner updated.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const id = `upload-${kind}`;
  const isBanner = kind === "banner";

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{isBanner ? "Banner" : "Logo"}</Label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onFileChange}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className={cn(
          "group relative block overflow-hidden rounded-2xl border bg-muted text-left outline-none transition-[box-shadow,transform] duration-base ease-out-soft elev-1 hover:elev-2 focus-visible:ring-2 focus-visible:ring-ring",
          isBanner ? "aspect-[16/6] w-full" : "size-24 rounded-2xl",
        )}
        aria-label={isBanner ? "Change banner image" : "Change logo image"}
      >
        {preview ? (
          <Image src={preview} alt="" fill sizes={isBanner ? "640px" : "96px"} className="object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-muted-foreground">
            <ImagePlus className="size-5" aria-hidden />
          </span>
        )}

        <span
          className={cn(
            "absolute inset-0 grid place-items-center bg-foreground/45 text-background opacity-0 transition-opacity duration-base group-hover:opacity-100 group-focus-visible:opacity-100",
            busy && "opacity-100",
          )}
        >
          {busy ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <span className="text-xs font-medium">
              {preview ? "Change" : isBanner ? "Add banner" : "Add logo"}
            </span>
          )}
        </span>
      </button>

      <p className="text-xs text-muted-foreground">
        {isBanner ? "Wide image (16:6). " : "Square image. "}
        JPG, PNG, WebP or GIF · up to 5 MB.
      </p>
    </div>
  );
}
