"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";

type GalleryPhoto = {
  id: string;
  url: string;
  caption: string;
};

type GalleryGridProps = {
  photos: GalleryPhoto[];
};

export function GalleryGrid({ photos }: GalleryGridProps) {
  const [active, setActive] = useState<GalleryPhoto | null>(null);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setActive(photo)}
            className="group rounded-3xl border border-border bg-white p-3 text-left shadow-card transition hover:-translate-y-1"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <img
                src={`${photo.url}?auto=format&fit=crop&w=800&q=80`}
                alt={photo.caption}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                loading="lazy"
              />
            </div>
            <p className="mt-3 text-sm font-medium text-brand-charcoal">
              {photo.caption}
            </p>
          </button>
        ))}
      </div>

      {active ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <Card className="relative w-full max-w-3xl rounded-3xl border border-border bg-white p-4 shadow-card">
            <button
              type="button"
              onClick={() => setActive(null)}
              className="absolute right-4 top-4 rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-brand-charcoal"
            >
              Fermer
            </button>
            <div className="space-y-4">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl">
                <img
                  src={`${active.url}?auto=format&fit=crop&w=1200&q=80`}
                  alt={active.caption}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="text-sm text-muted-foreground">{active.caption}</p>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
