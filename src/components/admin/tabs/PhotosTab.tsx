"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import {
  addGalleryPhoto,
  deleteGalleryPhoto,
  reorderGalleryPhotos,
  updateHomeCoverPhoto,
} from "@/app/actions/photo-actions";
import { GripVertical, Trash2 } from "lucide-react";

type HomeConfig = {
  id: string;
  cover_photo_url: string | null;
};

type GalleryPhoto = {
  id: string;
  photo_url: string;
  caption: string | null;
  display_order: number;
};

type PhotosTabProps = {
  adminToken: string;
  config: HomeConfig | null;
  photos: GalleryPhoto[];
};

export function PhotosTab({ adminToken, config, photos }: PhotosTabProps) {
  const [isPending, startTransition] = useTransition();
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  const [galleryCaption, setGalleryCaption] = useState("");
  const [items, setItems] = useState(photos);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  useEffect(() => {
    setItems(photos);
  }, [photos]);

  const orderedItems = useMemo(
    () => [...items].sort((a, b) => a.display_order - b.display_order),
    [items]
  );

  const handleCoverSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!coverFile) return;

    const formData = new FormData();
    formData.append("adminToken", adminToken);
    formData.append("cover_photo", coverFile);

    startTransition(async () => {
      const result = await updateHomeCoverPhoto(formData);
      if (result.success) {
        setMessage({ type: "success", text: "Photo de couverture mise à jour !" });
        setCoverFile(null);
      } else {
        setMessage({ type: "error", text: result.error ?? "Erreur" });
      }
    });
  };

  const handleGallerySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!galleryFile) return;

    const formData = new FormData();
    formData.append("adminToken", adminToken);
    formData.append("gallery_photo", galleryFile);
    formData.append("caption", galleryCaption);

    startTransition(async () => {
      const result = await addGalleryPhoto(formData);
      if (result.success) {
        setMessage({ type: "success", text: "Photo ajoutée à la galerie !" });
        setGalleryFile(null);
        setGalleryCaption("");
      } else {
        setMessage({ type: "error", text: result.error ?? "Erreur" });
      }
    });
  };

  const handleDeletePhoto = async (photoId: string) => {
    const confirmed = window.confirm("Supprimer cette photo ?");
    if (!confirmed) return;

    const formData = new FormData();
    formData.append("adminToken", adminToken);
    formData.append("photoId", photoId);

    startTransition(async () => {
      const result = await deleteGalleryPhoto(formData);
      if (result.success) {
        setItems((current) => current.filter((photo) => photo.id !== photoId));
        setMessage({ type: "success", text: "Photo supprimée !" });
      } else {
        setMessage({ type: "error", text: result.error ?? "Erreur" });
      }
    });
  };

  const movePhoto = (index: number, direction: "up" | "down") => {
    setItems((current) => {
      const next = [...current].sort((a, b) => a.display_order - b.display_order);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return current;

      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;

      return next.map((item, idx) => ({ ...item, display_order: idx }));
    });
  };

  const persistOrder = () => {
    const ordered = [...items].sort((a, b) => a.display_order - b.display_order);
    const formData = new FormData();
    formData.append("adminToken", adminToken);
    formData.append("photoIds", ordered.map((photo) => photo.id).join(","));

    startTransition(async () => {
      const result = await reorderGalleryPhotos(formData);
      if (result.success) {
        setMessage({ type: "success", text: "Ordre mis à jour !" });
      } else {
        setMessage({ type: "error", text: result.error ?? "Erreur" });
      }
    });
  };

  return (
    <div className="space-y-6">
      {message ? (
        <div
          className={`rounded-xl border p-4 text-sm ${
            message.type === "success"
              ? "border-green-500/30 bg-green-500/10 text-green-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <Card className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-card">
        <h2 className="text-xl font-semibold">Photo de couverture</h2>
        <p className="mt-2 text-sm text-white/60">
          Photo panoramique affichée en haut de la home.
        </p>
        <form onSubmit={handleCoverSubmit} className="mt-4 space-y-4">
          <ImageDropzone
            onImageSelected={setCoverFile}
            currentImageUrl={config?.cover_photo_url}
            label="Image de couverture"
            description="Glissez-déposez ou cliquez pour sélectionner"
            aspectRatio="16/4"
          />
          <Button
            type="submit"
            disabled={!coverFile || isPending}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md"
          >
            {isPending ? "Upload en cours..." : "Mettre à jour la couverture"}
          </Button>
        </form>
      </Card>

      <Card className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-card">
        <h2 className="text-xl font-semibold">Galerie de photos</h2>
        <p className="mt-2 text-sm text-white/60">
          Ajoute, supprime et réordonne les photos affichées sur la home.
        </p>

        <form onSubmit={handleGallerySubmit} className="mt-4 space-y-4">
          <ImageDropzone
            onImageSelected={setGalleryFile}
            label="Ajouter une photo"
            description="Glissez-déposez ou cliquez pour sélectionner"
            aspectRatio="4/3"
          />
          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">
              Légende (optionnelle)
            </label>
            <input
              type="text"
              value={galleryCaption}
              onChange={(event) => setGalleryCaption(event.target.value)}
              placeholder="Ex: Tournoi d'été 2025"
              className="input-field"
            />
          </div>
          <Button
            type="submit"
            disabled={!galleryFile || isPending}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md"
          >
            {isPending ? "Ajout en cours..." : "Ajouter à la galerie"}
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          {orderedItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
              Aucune photo dans la galerie. Ajoutez-en une !
            </div>
          ) : (
            orderedItems.map((photo, index) => (
              <div
                key={photo.id}
                className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-orange-400/30"
              >
                <div className="flex flex-col items-center gap-1 text-white/40">
                  <button
                    type="button"
                    onClick={() => movePhoto(index, "up")}
                    className="text-xs hover:text-white"
                    disabled={index === 0}
                  >
                    ▲
                  </button>
                  <GripVertical className="h-4 w-4" />
                  <button
                    type="button"
                    onClick={() => movePhoto(index, "down")}
                    className="text-xs hover:text-white"
                    disabled={index === orderedItems.length - 1}
                  >
                    ▼
                  </button>
                </div>
                <div className="relative h-16 w-24 overflow-hidden rounded-lg border border-white/10">
                  <Image src={photo.photo_url} alt={photo.caption ?? "Photo"} fill className="object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {photo.caption ?? "Sans légende"}
                  </p>
                  <p className="text-xs text-white/50">Position: {index + 1}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(photo.id)}
                  className="rounded-lg p-2 text-red-300 transition hover:bg-red-500/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {orderedItems.length > 1 ? (
          <Button
            type="button"
            onClick={persistOrder}
            className="mt-4 w-full border border-white/10 bg-white/5 text-white hover:border-orange-400/40 hover:bg-white/10"
            variant="outline"
          >
            Enregistrer l&apos;ordre
          </Button>
        ) : null}
      </Card>
    </div>
  );
}
