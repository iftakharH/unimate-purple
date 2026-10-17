"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export const MAX_PHOTOS = 8;
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Photo manager: pick files (uploaded straight to Storage from the browser),
 * drag to reorder, keyboard-accessible move buttons, first photo = cover.
 */
export function PhotoManager({
  userId,
  images,
  onChange,
  onUploadingChange,
}: {
  userId: string;
  images: string[];
  onChange: (next: string[]) => void;
  onUploadingChange: (uploading: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragIndex = useRef<number | null>(null);
  const [uploading, setUploading] = useState(0);

  function setUploadingCount(next: number) {
    setUploading(next);
    onUploadingChange(next);
  }

  async function onFilesChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const room = MAX_PHOTOS - images.length;
    if (files.length > room) {
      toast.error(`Up to ${MAX_PHOTOS} photos per listing — ${room} slot(s) left.`);
    }

    const accepted = files.slice(0, room).filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image.`);
        return false;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is over 5 MB.`);
        return false;
      }
      return true;
    });

    setUploadingCount(uploading + accepted.length);
    const supabase = createClient();
    const next = [...images];
    let remaining = accepted.length;

    for (const file of accepted) {
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().slice(0, 5);
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("listing-images")
        .upload(path, file, { cacheControl: "3600", contentType: file.type });
      remaining -= 1;
      if (error) {
        toast.error(`Upload failed for ${file.name}.`);
        setUploadingCount(uploading + remaining);
        continue;
      }
      const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
      next.push(data.publicUrl);
      onChange([...next]);
      setUploadingCount(uploading + remaining);
    }
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    reorder(index, target);
  }

  function remove(url: string) {
    onChange(images.filter((image) => image !== url));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Photos</Label>
        <span className="tabular text-xs text-muted-foreground">
          {images.length} / {MAX_PHOTOS}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={onFilesChosen}
      />

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((url, index) => (
          <div
            key={url}
            draggable
            onDragStart={(event) => {
              dragIndex.current = index;
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (dragIndex.current === null) return;
              if (index !== dragIndex.current) {
                reorder(dragIndex.current, index);
                dragIndex.current = index;
              }
            }}
            onDragEnd={() => {
              dragIndex.current = null;
            }}
            className="group elev-1 relative aspect-square cursor-grab overflow-hidden rounded-xl border active:cursor-grabbing"
          >
            <Image src={url} alt="" fill sizes="160px" className="object-cover" />

            {index === 0 && (
              <Badge className="absolute left-1.5 top-1.5 gap-1 px-1.5 py-0.5 text-[10px]">
                <Star className="size-2.5 fill-current" aria-hidden /> Cover
              </Badge>
            )}

            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-foreground/55 px-1.5 py-1 opacity-0 backdrop-blur-sm transition-opacity duration-fast group-hover:opacity-100 group-focus-within:opacity-100">
              <button
                type="button"
                aria-label={`Move photo ${index + 1} earlier`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
                className="grid size-6 place-items-center rounded-md text-background disabled:opacity-30"
              >
                <ArrowLeft className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={`Remove photo ${index + 1}`}
                onClick={() => remove(url)}
                className="grid size-6 place-items-center rounded-md text-background"
              >
                <X className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={`Move photo ${index + 1} later`}
                disabled={index === images.length - 1}
                onClick={() => move(index, 1)}
                className="grid size-6 place-items-center rounded-md text-background disabled:opacity-30"
              >
                <ArrowRight className="size-3.5" aria-hidden />
              </button>
            </div>
          </div>
        ))}

        {images.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading > 0}
            className={cn(
              "grid aspect-square place-items-center rounded-xl border border-dashed text-muted-foreground outline-none transition-colors duration-fast hover:border-ring hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              uploading > 0 && "opacity-60",
            )}
            aria-label="Add photos"
          >
            {uploading > 0 ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <span className="flex flex-col items-center gap-1 text-xs">
                <ImagePlus className="size-5" aria-hidden />
                Add photos
              </span>
            )}
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Drag to reorder — the first photo is the cover. JPG, PNG, WebP or GIF · up to
        5 MB each.
      </p>
    </div>
  );
}
