"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Tournament, TournamentStatus } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GradientButton } from "@/components/ui/gradient-button";
import { Badge } from "@/components/ui/badge";
import { upsertTournamentAction, deleteTournamentAction } from "@/app/actions/tournaments";

type TournamentsTabProps = {
  tournaments: Tournament[];
  adminToken: string;
};

const statusLabel: Record<TournamentStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

export function TournamentsTab({ tournaments, adminToken }: TournamentsTabProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();

  const selected = useMemo(
    () => tournaments.find((tournament) => tournament.id === selectedId) ?? null,
    [tournaments, selectedId]
  );

  const filtered = useMemo(
    () =>
      tournaments.filter((tournament) => {
        if (!search) return true;
        const term = search.toLowerCase();
        return (
          tournament.name.toLowerCase().includes(term) ||
          (tournament.location ?? "").toLowerCase().includes(term) ||
          (tournament.slug ?? "").toLowerCase().includes(term)
        );
      }),
    [tournaments, search]
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="rounded-2xl border border-border bg-white p-4 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-charcoal">
              Tournois créés
            </p>
            <p className="text-xs text-muted-foreground">
              {tournaments.length} entrées
            </p>
          </div>
          <Input
            placeholder="Rechercher un tournoi"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="sm:max-w-xs"
          />
        </div>

        <div className="mt-4 space-y-3">
          {filtered.length ? (
            filtered.map((tournament) => (
              <button
                key={tournament.id}
                type="button"
                onClick={() => setSelectedId(tournament.id)}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  selectedId === tournament.id
                    ? "border-brand-charcoal bg-brand-gray/20"
                    : "border-border bg-white hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-brand-charcoal">
                      {tournament.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tournament.date} · {tournament.location ?? "Lieu à définir"}
                    </p>
                  </div>
                  <Badge variant="secondary">{statusLabel[tournament.status]}</Badge>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-white p-6 text-center text-sm text-muted-foreground">
              Aucun tournoi trouvé.
            </div>
          )}
        </div>
      </Card>

      <Card className="rounded-2xl border border-border bg-white p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-charcoal">
              {selected ? "Modifier le tournoi" : "Créer un tournoi"}
            </p>
            <p className="text-xs text-muted-foreground">
              Configurer le format et publier
            </p>
          </div>
          {selected ? (
            <Button
              type="button"
              variant="outline"
              className="bg-brand-violet text-white hover:bg-brand-violet/90 hover:text-white"
              onClick={() => setSelectedId(null)}
            >
              Nouveau
            </Button>
          ) : null}
        </div>

        <form
          className="mt-4 space-y-4"
          action={async (formData) => {
            await upsertTournamentAction(formData);
            router.refresh();
          }}
        >
          <input type="hidden" name="adminToken" value={adminToken} />
          <input type="hidden" name="tournamentId" value={selected?.id ?? ""} />

          <Input name="name" placeholder="Nom" defaultValue={selected?.name ?? ""} />
          <Input name="slug" placeholder="Slug" defaultValue={selected?.slug ?? ""} />
          <Input name="date" type="date" defaultValue={selected?.date ?? ""} />
          <Input
            name="location"
            placeholder="Lieu"
            defaultValue={selected?.location ?? ""}
          />
          <Input
            name="maxPlayers"
            type="number"
            placeholder="Max joueurs"
            defaultValue={selected?.max_players ?? ""}
          />
          <Input
            name="imagePath"
            placeholder="Image (URL ou path)"
            defaultValue={selected?.image_path ?? ""}
          />
          <Input
            name="description"
            placeholder="Description"
            defaultValue={selected?.description ?? ""}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              name="pairingMode"
              placeholder="pairing_mode (manual/random/balanced)"
              defaultValue={selected?.config?.pairing_mode ?? "balanced"}
            />
            <Input
              name="poolsCount"
              type="number"
              placeholder="Nombre de poules"
              defaultValue={selected?.config?.pools_count ?? 4}
            />
            <Input
              name="teamsQualified"
              type="number"
              placeholder="Équipes qualifiées"
              defaultValue={selected?.config?.playoffs?.teams_qualified ?? 8}
            />
            <Input
              name="playoffsFormat"
              placeholder="Format playoffs (single_elim/double_elim)"
              defaultValue={selected?.config?.playoffs?.format ?? "single_elim"}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              name="playoffsEnabled"
              placeholder="Playoffs activés (true/false)"
              defaultValue={selected?.config?.playoffs?.enabled ? "true" : "false"}
            />
            <Input
              name="hasThirdPlace"
              placeholder="Petite finale (true/false)"
              defaultValue={selected?.config?.playoffs?.has_third_place ? "true" : "false"}
            />
            <Input
              name="status"
              placeholder="Statut (draft/published/archived)"
              defaultValue={selected?.status ?? "draft"}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <GradientButton type="submit">
              {selected ? "Mettre à jour" : "Créer"}
            </GradientButton>
            {selected ? (
              <Button
                type="button"
                variant="outline"
                className="bg-brand-violet text-white hover:bg-brand-violet/90 hover:text-white"
                onClick={async () => {
                  const confirmed = window.confirm("Supprimer ce tournoi ?");
                  if (!confirmed) return;
                  const formData = new FormData();
                  formData.set("adminToken", adminToken);
                  formData.set("tournamentId", selected.id);
                  await deleteTournamentAction(formData);
                  setSelectedId(null);
                  router.refresh();
                }}
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
