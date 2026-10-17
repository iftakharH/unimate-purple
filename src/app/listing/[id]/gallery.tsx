"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { m } from "motion/react";
import Image from "next/image";
import { useState } from "react";

import { listingHues } from "@/lib/colors";
import { initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Image gallery: crossfade between photos, arrows, thumbnails, keyboard. */
export function Gallery({
  listingId,
  title,
  images,
}: {
  listingId: string;
  title: string;
  images: { url: string }[];
}) {
  const [index, setIndex] = useState(0);
  const count = images.length;
  const { a, b } = listingHues(listingId);

  function step(delta: number) {
    if (count === 0) return;
    setIndex((current) => (current + delta + count) % count);
  }

  if (count === 0) {
    return (
      <div
        className="grid aspect-[4/3] w-full place-items-center rounded-3xl border"
        style={{
          backgroundImage: `linear-gradient(135deg, oklch(0.82 0.1 ${a} / 0.5), oklch(0.84 0.1 ${b} / 0.45))`,
        }}
      >
        <span className="text-5xl font-semibold text-foreground/25">
          {initialsOf(title)}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        role="group"
        aria-label="Listing photos"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") step(-1);
          if (event.key === "ArrowRight") step(1);
        }}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border bg-muted/40 elev-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <m.div
          key={index}
          initial={{ opacity: 0, scale: 1.015 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={images[index].url}
            alt={`${title} — photo ${index + 1}`}
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover"
            preload={index === 0}
          />
        </m.div>

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => step(-1)}
              className="absolute left-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border bg-background/80 backdrop-blur-sm transition-transform duration-fast ease-out-soft hover:scale-105"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => step(1)}
              className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border bg-background/80 backdrop-blur-sm transition-transform duration-fast ease-out-soft hover:scale-105"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
            <span className="tabular absolute bottom-3 right-3 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="grid grid-cols-8 gap-2">
          {images.map((image, imageIndex) => (
            <button
              key={image.url}
              type="button"
              onClick={() => setIndex(imageIndex)}
              aria-label={`Show photo ${imageIndex + 1}`}
              aria-current={imageIndex === index}
              className={cn(
                "relative aspect-square overflow-hidden rounded-xl border outline-none transition-[transform,box-shadow] duration-fast ease-out-soft hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring",
                imageIndex === index && "ring-2 ring-primary",
              )}
            >
              <Image src={image.url} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
