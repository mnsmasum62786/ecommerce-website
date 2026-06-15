"use client";

import { useState } from "react";
import Image from "next/image";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

type GalleryImage = { url: string; alt: string | null };

export function ProductGallery({
  images,
  name,
}: {
  images: GalleryImage[];
  name: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border bg-muted text-muted-foreground">
        <Leaf className="h-16 w-16" />
      </div>
    );
  }

  const active = images[Math.min(activeIndex, images.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
        <Image
          src={active.url}
          alt={active.alt || name}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`View image ${i + 1}`}
              className={cn(
                "relative aspect-square overflow-hidden rounded-md border bg-muted transition-all",
                i === activeIndex
                  ? "ring-2 ring-brand-600 ring-offset-1"
                  : "opacity-70 hover:opacity-100",
              )}
            >
              <Image
                src={img.url}
                alt={img.alt || `${name} thumbnail ${i + 1}`}
                fill
                sizes="20vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
