"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Tournament, TournamentPhoto } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GradientButton } from "@/components/ui/gradient-button";
import {
  deleteTournamentPhotoAction,
  upsertTournamentPhotoAction,
} from "@/app/actions/photos";

type HomePhotosTabProps = {
  adminToken: string;
  photos: TournamentPhoto[];
  featuredPhotos: TournamentPhoto[];
  tournaments: Tournament[];
};

export function HomePhotosTab({
  adminToken,
  photos,
  featuredPhotos,
  tournaments,
}: HomePhotosTabProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();

  const selected = useMemo(
    () => photos.find((photo) => photo.id === selectedId) ?? null,
    [photos, selectedId]
  );

  const filtered = useMemo(
    () =>
      photos.filter((photo) => {
        if (!search) return true;
        const term = search.toLowerCase();
        return (
          photo.url.toLowerCase().includes(term) ||
          (photo.caption ?? "").toLowerCase().includes(term)
        );
      }),
    [photos, search]
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">
              Photos Home Page
            </p>
            <p className="text-xs text-white/60">
              {featuredPhotos.length} photos en vedette
            </p>
          </div>
          <Input
            placeholder="Rechercher une photo"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input-field sm:max-w-xs"
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {filtered.length ? (
            filtered.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setSelectedId(photo.id)}
                className={`rounded-2xl border p-3 text-left transition ${
                  selectedId === photo.id
                    ? "border-orange-400/40 bg-orange-500/10"
                    : "border-white/10 bg-white/5 hover:border-orange-400/30 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-white/50">{photo.url}</p>
                    <p className="text-sm font-semibold text-white">
                      {photo.caption ?? "Sans légende"}
                    </p>
                  </div>
                  {photo.featured ? (
                    <Badge className="border border-orange-400/40 bg-orange-500/10 text-xs font-semibold text-orange-200">
                      Home
                    </Badge>
                  ) : null}
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-sm text-white/60">
              Aucune photo trouvée.
            </div>
          )}
        </div>
      </Card>

      <Card className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">
              {selected ? "Modifier la photo" : "Ajouter une photo"}
            </p>
            <p className="text-xs text-white/60">
              Associez-la à un tournoi et choisissez Home
            </p>
          </div>
          {selected ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedId(null)}
              className="border-white/20 bg-transparent text-white/80 hover:border-orange-400/50 hover:text-white"
            >
              Nouveau
            </Button>
          ) : null}
        </div>

        <form
          className="mt-4 space-y-4"
          action={async (formData) => {
            await upsertTournamentPhotoAction(formData);
            router.refresh();
          }}
        >
          <input type="hidden" name="adminToken" value={adminToken} />
          <input type="hidden" name="photoId" value={selected?.id ?? ""} />

          <Input
            name="url"
            placeholder="URL photo"
            defaultValue={selected?.url ?? ""}
            className="input-field"
          />
          <Input
            name="caption"
            placeholder="Légende"
            defaultValue={selected?.caption ?? ""}
            className="input-field"
          />
          <Input
            name="tournamentId"
            placeholder="ID tournoi (optionnel)"
            defaultValue={selected?.tournament_id ?? ""}
            className="input-field"
          />
          <Input
            name="featured"
            placeholder="Afficher en Home (true/false)"
            defaultValue={selected?.featured ? "true" : "false"}
            className="input-field"
          />

          {tournaments.length ? (
            <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-3 text-xs text-white/60">
              IDs tournois disponibles :
              <div className="mt-2 flex flex-wrap gap-2">
                {tournaments.map((tournament) => (
                  <span
                    key={tournament.id}
                    className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70"
                  >
                    {tournament.name} · {tournament.id}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <GradientButton type="submit">
              {selected ? "Mettre à jour" : "Ajouter"}
            </GradientButton>
            {selected ? (
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const confirmed = window.confirm("Supprimer cette photo ?");
                  if (!confirmed) return;
                  const formData = new FormData();
                  formData.set("adminToken", adminToken);
                  formData.set("photoId", selected.id);
                  await deleteTournamentPhotoAction(formData);
                  setSelectedId(null);
                  router.refresh();
                }}
                className="border-white/20 bg-transparent text-white/80 hover:border-orange-400/50 hover:text-white"
              >
                Supprimer
              </Button>
            ) : null}
          </div>
        </form>
      </Card>
    </div>
  );
}
