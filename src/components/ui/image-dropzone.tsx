"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ImageDropzoneProps = {
  onImageSelected: (file: File) => void;
  currentImageUrl?: string | null;
  accept?: Record<string, string[]>;
  maxSize?: number;
  label?: string;
  description?: string;
  aspectRatio?: string;
  className?: string;
};

export function ImageDropzone({
  onImageSelected,
  currentImageUrl,
  accept = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
  },
  maxSize = 5 * 1024 * 1024,
  label = "Photo",
  description = "Glissez-déposez ou cliquez pour sélectionner",
  aspectRatio = "16/9",
  className,
}: ImageDropzoneProps) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl ?? null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const file = event.target.files?.[0] ?? null;

      if (!file) {
        return;
      }

      if (file.size > maxSize) {
        setError(`Fichier trop volumineux. Maximum ${maxSize / 1024 / 1024}MB`);
        return;
      }

      if (accept && !Object.keys(accept).includes(file.type)) {
        setError("Format non supporté. Utilisez JPG, PNG ou WebP");
        return;
      }

      onImageSelected(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [accept, maxSize, onImageSelected]
  );

  const clearPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setError(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <label className="block text-sm font-medium text-white/80">{label}</label>
      ) : null}
      <label
        className={cn(
          "relative block cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all",
          "hover:border-orange-500/50 hover:bg-white/5",
          error ? "border-red-500/50" : "border-white/20 bg-white/5"
        )}
        style={{ aspectRatio }}
      >
        <input
          type="file"
          accept={Object.values(accept).flat().join(",")}
          onChange={onDrop}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />

        {preview ? (
          <>
            <Image src={preview} alt="Preview" fill className="object-cover" />
            <button
              type="button"
              onClick={clearPreview}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white transition hover:bg-black/80"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600">
              <ImageIcon className="h-6 w-6 text-white" />
            </div>
            <p className="mb-1 text-sm font-medium text-white/80">{description}</p>
            <p className="text-xs text-white/50">
              JPG, PNG ou WebP • Max {maxSize / 1024 / 1024}MB
            </p>
          </div>
        )}
      </label>

      {error ? (
        <p className="flex items-center gap-1 text-xs text-red-400">
          <X className="h-3 w-3" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
