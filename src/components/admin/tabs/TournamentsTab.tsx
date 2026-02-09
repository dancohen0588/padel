"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [playoffsEnabled, setPlayoffsEnabled] = useState(false);
  const [hasThirdPlace, setHasThirdPlace] = useState(false);
  const [status, setStatus] = useState<TournamentStatus>("draft");
  const [pairingMode, setPairingMode] = useState("balanced");
  const [playoffsFormat, setPlayoffsFormat] = useState("single_elim");
  const [maxPlayers, setMaxPlayers] = useState(0);
  const [poolsCount, setPoolsCount] = useState(0);
  const [teamsQualified, setTeamsQualified] = useState(0);
  const [slugValue, setSlugValue] = useState("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const tempPreviewRef = useRef<string | null>(null);
  const router = useRouter();
  const adminQuery = `?token=${adminToken}`;

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

  useEffect(() => {
    setPlayoffsEnabled(selected?.config?.playoffs?.enabled ?? false);
    setHasThirdPlace(selected?.config?.playoffs?.has_third_place ?? false);
    setStatus(selected?.status ?? "draft");
    setPairingMode(selected?.config?.pairing_mode ?? "balanced");
    setPlayoffsFormat(selected?.config?.playoffs?.format ?? "single_elim");
    setMaxPlayers(Number(selected?.max_players ?? 0));
    setPoolsCount(Number(selected?.config?.pools_count ?? 4));
    setTeamsQualified(Number(selected?.config?.playoffs?.teams_qualified ?? 0));
    setSlugValue(selected?.slug ?? "");
    setImagePath(selected?.image_path ?? null);
    setImagePreview(selected?.image_path ?? null);
    setUploadError(null);
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    console.info("[admin] tournament config", {
      id: selected.id,
      name: selected.name,
      pools_count: selected.config?.pools_count,
    });
  }, [selected]);

  const handleFileUpload = async (file: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024;
    setUploadError(null);

    if (!allowedTypes.includes(file.type)) {
      setUploadError("Formats autorisés : JPG, PNG, WEBP.");
      return;
    }

    if (file.size > maxSize) {
      setUploadError("Taille maximale : 5 Mo.");
      return;
    }

    if (tempPreviewRef.current) {
      URL.revokeObjectURL(tempPreviewRef.current);
    }

    const localPreview = URL.createObjectURL(file);
    tempPreviewRef.current = localPreview;
    setImagePreview(localPreview);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("slug", slugValue || "tournoi");
      if (imagePath) {
        formData.set("previousPath", imagePath);
      }

      const response = await fetch("/api/tournaments/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Upload impossible.");
      }

      const payload = (await response.json()) as { path: string };
      setImagePath(payload.path);
      setImagePreview(payload.path);
      setUploadError(null);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload impossible.");
      setImagePreview(imagePath);
    } finally {
      if (tempPreviewRef.current) {
        URL.revokeObjectURL(tempPreviewRef.current);
        tempPreviewRef.current = null;
      }
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!imagePath) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      const response = await fetch("/api/tournaments/upload/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: imagePath }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Suppression impossible.");
      }

      setImagePath(null);
      setImagePreview(null);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Suppression impossible.");
    } finally {
      setIsUploading(false);
    }
  };

  const poolsInfo = useMemo(() => {
    if (!maxPlayers || !poolsCount) {
      return "Renseignez le nombre d'équipes et de poules pour calculer.";
    }
    if (maxPlayers <= 0 || poolsCount <= 0) {
      return "Renseignez le nombre d'équipes et de poules pour calculer.";
    }
    const baseTeams = Math.floor(maxPlayers / poolsCount);
    const remainder = maxPlayers % poolsCount;
    if (!baseTeams) {
      return "Renseignez le nombre d'équipes et de poules pour calculer.";
    }
    if (remainder === 0) {
      return `${baseTeams} équipes par poule`;
    }
    const smallerPools = poolsCount - remainder;
    return `${smallerPools} poules de ${baseTeams} équipes et ${remainder} poule${
      remainder > 1 ? "s" : ""
    } de ${baseTeams + 1} équipes`;
  }, [maxPlayers, poolsCount]);

  useEffect(() => {
    console.info("[admin] poolsInfo", { maxPlayers, poolsCount, poolsInfo });
  }, [maxPlayers, poolsCount, poolsInfo]);

  const qualifiedInfo = useMemo(() => {
    if (!teamsQualified || !poolsCount) return null;
    if (teamsQualified <= 0 || poolsCount <= 0) return null;
    const baseTeams = Math.floor(teamsQualified / poolsCount);
    const remainder = teamsQualified % poolsCount;
    if (!baseTeams) return null;

    const ordinalLabel = (rank: number) => {
      if (rank === 1) return "premiers";
      if (rank === 2) return "deuxièmes";
      if (rank === 3) return "troisièmes";
      if (rank === 4) return "quatrièmes";
      if (rank === 5) return "cinquièmes";
      if (rank === 6) return "sixièmes";
      if (rank === 7) return "septièmes";
      if (rank === 8) return "huitièmes";
      if (rank === 9) return "neuvièmes";
      if (rank === 10) return "dixièmes";
      return `${rank}èmes`;
    };

    const rangeLabel = (count: number) => {
      if (count === 1) return "les premiers";
      return `les premiers à ${ordinalLabel(count)}`;
    };

    if (remainder === 0) {
      return `${rangeLabel(baseTeams)} de chaque poule`;
    }

    const extraRank = baseTeams + 1;
    return `${rangeLabel(baseTeams)} de chaque poule + les ${remainder} meilleurs ${ordinalLabel(
      extraRank
    )}`;
  }, [teamsQualified, poolsCount]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="rounded-2xl border border-border bg-white p-4 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div>
              <p className="text-sm font-semibold text-brand-charcoal">
                Tournois créés
              </p>
              <p className="text-xs text-muted-foreground">
                {tournaments.length} entrées
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <GradientButton type="button" onClick={() => setSelectedId(null)}>
                Créer
              </GradientButton>
            </div>
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
              <div
                key={tournament.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(tournament.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedId(tournament.id);
                  }
                }}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  selectedId === tournament.id
                    ? "border-brand-charcoal bg-brand-gray/20"
                    : "border-border bg-white hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {tournament.image_path ? (
                      <img
                        src={tournament.image_path}
                        alt={tournament.name}
                        className="h-12 w-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-[10px] font-semibold text-muted-foreground">
                        N/A
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-brand-charcoal">
                        {tournament.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tournament.date} · {tournament.location ?? "Lieu à définir"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{statusLabel[tournament.status]}</Badge>
                    {tournament.slug ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-brand-violet text-white hover:bg-brand-violet/90 hover:text-white"
                        onClick={() =>
                          router.push(`/tournaments/${tournament.slug}/admin${adminQuery}`)
                        }
                      >
                        Configurer
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
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
        </div>

        <form
          id="tournament-form"
          className="mt-4 space-y-4"
          action={async (formData) => {
            console.info("[admin] tournament submit payload", {
              poolsCount: formData.get("poolsCount"),
              maxPlayers: formData.get("maxPlayers"),
              name: formData.get("name"),
              date: formData.get("date"),
              keys: Array.from(formData.keys()),
            });
            const result = await upsertTournamentAction(formData);
            console.info("[admin] tournament submit result", result);
            router.refresh();
          }}
        >
          <input type="hidden" name="adminToken" value={adminToken} />
          <input type="hidden" name="tournamentId" value={selected?.id ?? ""} />

          <label className="flex flex-col gap-2 text-sm font-semibold text-brand-charcoal">
            Nom du tournoi
            <Input name="name" placeholder="Nom" defaultValue={selected?.name ?? ""} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-brand-charcoal">
            Slug
            <Input
              name="slug"
              placeholder="Slug"
              defaultValue={selected?.slug ?? ""}
              onChange={(event) => setSlugValue(event.target.value)}
            />
            <input type="hidden" name="imagePath" value={imagePath ?? ""} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-brand-charcoal">
            Date
            <Input name="date" type="date" defaultValue={selected?.date ?? ""} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-brand-charcoal">
            Lieu
            <Input
              name="location"
              placeholder="Lieu"
              defaultValue={selected?.location ?? ""}
            />
          </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-brand-charcoal">
              Nombre d&apos;équipes
              <Input
                name="maxPlayers"
                type="number"
                placeholder="Max joueurs"
                defaultValue={selected?.max_players ?? ""}
                onChange={(event) => setMaxPlayers(Number(event.target.value || 0))}
              />
            </label>
          <div className="flex flex-col gap-2 text-sm font-semibold text-brand-charcoal">
            Photo du tournoi
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleFileUpload(file);
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files?.[0];
                if (file) {
                  void handleFileUpload(file);
                }
              }}
              className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-white px-4 py-6 text-center text-xs font-semibold text-muted-foreground transition hover:bg-muted/40"
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Aperçu tournoi"
                  className="h-32 w-full max-w-[280px] rounded-xl object-cover"
                />
              ) : (
                <span>
                  Glissez-déposez une image ici ou cliquez pour importer (JPG/PNG/WEBP, 5 Mo max).
                </span>
              )}
              {isUploading ? <span>Upload en cours...</span> : null}
            </button>
            {imagePath ? (
              <Button
                type="button"
                variant="outline"
                className="w-fit bg-brand-violet text-white hover:bg-brand-violet/90 hover:text-white"
                onClick={() => void handleRemoveImage()}
                disabled={isUploading}
              >
                Supprimer l’image
              </Button>
            ) : null}
            {uploadError ? (
              <span className="text-xs font-semibold text-red-500">{uploadError}</span>
            ) : null}
          </div>
          <label className="flex flex-col gap-2 text-sm font-semibold text-brand-charcoal">
            Description
            <Input
              name="description"
              placeholder="Description"
              defaultValue={selected?.description ?? ""}
            />
          </label>

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-2 text-sm font-semibold text-brand-charcoal">
              Mode d&apos;appariement des joueurs
              <input type="hidden" name="pairingMode" value={pairingMode} />
              <div className="grid grid-cols-3 gap-2">
                {(["manual", "random", "balanced"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPairingMode(value)}
                    className={`rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition whitespace-nowrap ${
                      pairingMode === value
                        ? "border-brand-violet bg-brand-violet text-white"
                        : "border-border bg-white text-brand-charcoal"
                    }`}
                  >
                    {value === "manual"
                      ? "Manuel"
                      : value === "random"
                        ? "Automatique"
                        : "Auto equitable"}
                  </button>
                ))}
              </div>
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-brand-charcoal">
              Nombre de poules
              <Input
                name="poolsCount"
                type="number"
                placeholder="Nombre de poules"
                defaultValue={selected?.config?.pools_count ?? 4}
                onChange={(event) => setPoolsCount(Number(event.target.value || 0))}
              />
              <span className="text-xs font-semibold text-status-approved">
                {poolsInfo}
              </span>
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-brand-charcoal">
              Équipes qualifiées
              <Input
                name="teamsQualified"
                type="number"
                placeholder="Équipes qualifiées"
                defaultValue={selected?.config?.playoffs?.teams_qualified ?? 8}
                onChange={(event) => setTeamsQualified(Number(event.target.value || 0))}
              />
              {qualifiedInfo ? (
                <span className="text-xs font-semibold text-status-approved">
                  {qualifiedInfo}
                </span>
              ) : null}
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-brand-charcoal">
              Format playoffs
              <input type="hidden" name="playoffsFormat" value={playoffsFormat} />
              <div className="grid grid-cols-2 gap-2">
                {(["single_elim", "double_elim"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPlayoffsFormat(value)}
                    className={`rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition whitespace-nowrap ${
                      playoffsFormat === value
                        ? "border-brand-violet bg-brand-violet text-white"
                        : "border-border bg-white text-brand-charcoal"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </label>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 text-sm font-semibold text-brand-charcoal">
              Playoffs activés
              <input type="hidden" name="playoffsEnabled" value={playoffsEnabled ? "true" : "false"} />
              <button
                type="button"
                aria-pressed={playoffsEnabled}
                onClick={() => setPlayoffsEnabled((value) => !value)}
                className={`flex h-10 items-center justify-between rounded-full border px-4 text-[11px] font-semibold uppercase tracking-[0.08em] transition whitespace-nowrap ${
                  playoffsEnabled
                    ? "border-brand-violet bg-brand-violet text-white"
                    : "border-border bg-white text-brand-charcoal"
                }`}
              >
                <span>{playoffsEnabled ? "Activés" : "Désactivés"}</span>
                <span className={`h-5 w-5 rounded-full ${playoffsEnabled ? "bg-white" : "bg-brand-gray"}`} />
              </button>
            </div>
            <div className="flex flex-col gap-2 text-sm font-semibold text-brand-charcoal">
              Petite finale
              <input type="hidden" name="hasThirdPlace" value={hasThirdPlace ? "true" : "false"} />
              <button
                type="button"
                aria-pressed={hasThirdPlace}
                onClick={() => setHasThirdPlace((value) => !value)}
                className={`flex h-10 items-center justify-between rounded-full border px-4 text-[11px] font-semibold uppercase tracking-[0.08em] transition whitespace-nowrap ${
                  hasThirdPlace
                    ? "border-brand-violet bg-brand-violet text-white"
                    : "border-border bg-white text-brand-charcoal"
                }`}
              >
                <span>{hasThirdPlace ? "Activée" : "Désactivée"}</span>
                <span className={`h-5 w-5 rounded-full ${hasThirdPlace ? "bg-white" : "bg-brand-gray"}`} />
              </button>
            </div>
            <div className="flex flex-col gap-2 text-sm font-semibold text-brand-charcoal">
              Statut
              <input type="hidden" name="status" value={status} />
              <div className="grid grid-cols-3 gap-2">
                {(["draft", "published", "archived"] as TournamentStatus[]).map(
                  (value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStatus(value)}
                      className={`rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] transition whitespace-nowrap ${
                        status === value
                          ? "border-brand-violet bg-brand-violet text-white"
                          : "border-border bg-white text-brand-charcoal"
                      }`}
                    >
                      {statusLabel[value]}
                    </button>
                  )
                )}
              </div>
            </div>
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
