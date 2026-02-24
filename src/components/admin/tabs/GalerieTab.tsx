"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import { GradientButton } from "@/components/ui/gradient-button";
import {
  addGalleryPhoto,
  deleteGalleryPhoto,
  updateHomeCoverPhoto,
} from "@/app/actions/photo-actions";
import type { GalleryPhotoWithTournament } from "@/lib/queries";
import type { Tournament } from "@/lib/types";
import { Trash2 } from "lucide-react";

type GalerieTabProps = {
  adminToken: string;
  photos: GalleryPhotoWithTournament[];
  tournaments: Tournament[];
  config: { cover_photo_url: string | null } | null;
};

export function GalerieTab({ adminToken, photos, tournaments, config }: GalerieTabProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [tournamentId, setTournamentId] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filtered = useMemo(
    () =>
      photos.filter((photo) => {
        if (!search) return true;
        const term = search.toLowerCase();
        return (
          (photo.caption ?? "").toLowerCase().includes(term) ||
          (photo.tournament_name ?? "").toLowerCase().includes(term)
        );
      }),
    [photos, search]
  );

  const handleAddPhoto = (event: React.FormEvent) => {
    event.preventDefault();
    if (!galleryFile) return;

    const formData = new FormData();
    formData.append("adminToken", adminToken);
    formData.append("gallery_photo", galleryFile);
    formData.append("caption", caption);
    if (tournamentId) formData.append("tournament_id", tournamentId);

    startTransition(async () => {
      const result = await addGalleryPhoto(formData);
      if (result.success) {
        setMessage({ type: "success", text: "Photo ajoutée !" });
        setGalleryFile(null);
        setCaption("");
        setTournamentId("");
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.error ?? "Erreur" });
      }
    });
  };

  const handleDelete = (photoId: string) => {
    if (!window.confirm("Supprimer cette photo ?")) return;
    const formData = new FormData();
    formData.append("adminToken", adminToken);
    formData.append("photoId", photoId);
    startTransition(async () => {
      const result = await deleteGalleryPhoto(formData);
      if (result.success) {
        setMessage({ type: "success", text: "Photo supprimée !" });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.error ?? "Erreur" });
      }
    });
  };

  const handleCoverSubmit = (event: React.FormEvent) => {
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
        router.refresh();
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

      <Card className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white shadow-card">
        <p className="text-sm font-semibold text-white">Photo de couverture</p>
        <p className="mb-4 text-xs text-white/50">Image panoramique affichée en haut de la home.</p>
        <form onSubmit={handleCoverSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <ImageDropzone
              onImageSelected={setCoverFile}
              currentImageUrl={config?.cover_photo_url}
              label=""
              description="Glissez-déposez ou cliquez"
              aspectRatio="21/4"
            />
          </div>
          <Button
            type="submit"
            disabled={!coverFile || isPending}
            className="shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white"
          >
            Mettre à jour
          </Button>
        </form>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Galerie</p>
              <p className="text-xs text-white/50">{photos.length} photo{photos.length !== 1 ? "s" : ""}</p>
            </div>
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field sm:max-w-xs"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {filtered.length ? (
              filtered.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5"
                >
                  <div className="relative aspect-[4/3] w-full">
                    <Image
                      src={photo.photo_url}
                      alt={photo.caption ?? "Photo"}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-2">
                    <p className="truncate text-xs font-medium text-white">
                      {photo.caption ?? <span className="text-white/40">Sans légende</span>}
                    </p>
                    {photo.tournament_name ? (
                      <p className="truncate text-[10px] text-white/40">{photo.tournament_name}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(photo.id)}
                    className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-red-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="col-span-2 rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-white/40">
                Aucune photo.
              </div>
            )}
          </div>
        </Card>

        <Card className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white shadow-card">
          <p className="mb-4 text-sm font-semibold text-white">Ajouter une photo</p>
          <form onSubmit={handleAddPhoto} className="space-y-4">
            <ImageDropzone
              onImageSelected={setGalleryFile}
              label=""
              description="Glissez-déposez ou cliquez pour sélectionner"
              aspectRatio="4/3"
            />
            <label className="flex flex-col gap-1.5 text-sm font-medium text-white/80">
              Légende
              <Input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Ex : Finale Printemps 2025"
                className="input-field"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-white/80">
              Tournoi associé
              <select
                value={tournamentId}
                onChange={(e) => setTournamentId(e.target.value)}
                className="input-field w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-400/50"
              >
                <option value="">— Aucun tournoi —</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#1E1E2E]">
                    {t.name} · {t.date}
                  </option>
                ))}
              </select>
              <span className="text-xs text-white/40">Optionnel — affiché discrètement sous la photo</span>
            </label>
            <GradientButton type="submit" disabled={!galleryFile || isPending}>
              {isPending ? "Upload en cours..." : "Ajouter à la galerie"}
            </GradientButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
