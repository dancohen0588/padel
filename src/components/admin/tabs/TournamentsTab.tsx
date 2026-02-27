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
import { useNavigationOverlay } from "@/components/ui/navigation-overlay";

type TournamentsTabProps = {
  tournaments: Tournament[];
  adminToken: string;
  selectedId: string | null;
  onSelectTournament: (tournamentId: string | null) => void;
};

const statusLabel: Record<TournamentStatus, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
  upcoming: "À venir",
  registration: "Inscriptions ouvertes",
  ongoing: "En cours",
};

export function TournamentsTab({
  tournaments,
  adminToken,
  selectedId,
  onSelectTournament,
}: TournamentsTabProps) {
  const [search, setSearch] = useState("");
  const [playoffsEnabled, setPlayoffsEnabled] = useState(false);
  const [hasThirdPlace, setHasThirdPlace] = useState(false);
  const [status, setStatus] = useState<TournamentStatus>("draft");
  const [pairingMode, setPairingMode] = useState("balanced");
  const [playoffsFormat, setPlayoffsFormat] = useState("single_elim");
  const [maxPlayers, setMaxPlayers] = useState(0);
  const [poolsCount, setPoolsCount] = useState(0);
  const [teamsQualified, setTeamsQualified] = useState(0);
  const [slugValue, setSlugValue] = useState("");
  const [priceValue, setPriceValue] = useState<string>("");
  const [whatsappLink, setWhatsappLink] = useState<string>("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const tempPreviewRef = useRef<string | null>(null);
  const [reglementUrl, setReglementUrl] = useState<string | null>(null);
  const [isPdfUploading, setIsPdfUploading] = useState(false);
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const { startNavigation } = useNavigationOverlay();
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
    setPriceValue(
      selected?.price !== null && selected?.price !== undefined ? String(selected.price) : ""
    );
    setWhatsappLink(selected?.whatsappGroupLink ?? "");
    setReglementUrl(selected?.reglementUrl ?? null);
    setUploadError(null);
    setPdfUploadError(null);
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

  const handlePdfUpload = async (file: File) => {
    setPdfUploadError(null);
    const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setPdfUploadError("Format non supporté. Utilisez PDF, JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setPdfUploadError("Taille maximale : 20 Mo.");
      return;
    }
    setIsPdfUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("slug", slugValue || "tournoi");
      if (reglementUrl) {
        formData.set("previousUrl", reglementUrl);
      }
      const response = await fetch("/api/tournaments/pdf", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Upload impossible.");
      }
      const payload = (await response.json()) as { url: string };
      setReglementUrl(payload.url);
      setPdfUploadError(null);
    } catch (error) {
      setPdfUploadError(error instanceof Error ? error.message : "Upload impossible.");
    } finally {
      setIsPdfUploading(false);
    }
  };

  const handleRemovePdf = async () => {
    if (!reglementUrl) return;
    setIsPdfUploading(true);
    setPdfUploadError(null);
    try {
      await fetch("/api/tournaments/upload/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: reglementUrl }),
      });
      setReglementUrl(null);
    } catch (error) {
      setPdfUploadError(error instanceof Error ? error.message : "Suppression impossible.");
    } finally {
      setIsPdfUploading(false);
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
      <Card className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Tournois créés</p>
              <p className="text-xs text-white/50">{tournaments.length} entrées</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <GradientButton type="button" onClick={() => onSelectTournament(null)}>
                Créer
              </GradientButton>
            </div>
          </div>
          <Input
            placeholder="Rechercher un tournoi"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input-field sm:max-w-xs"
          />
        </div>

        <div className="mt-4 space-y-3">
          {filtered.length ? (
            filtered.map((tournament) => (
              <div
                key={tournament.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectTournament(tournament.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectTournament(tournament.id);
                  }
                }}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedId === tournament.id
                    ? "border-orange-400/40 bg-white/10"
                    : "border-white/10 bg-white/5 hover:border-orange-400/30"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <div className="flex items-center gap-3">
                    {tournament.image_path ? (
                      <img
                        src={tournament.image_path}
                        alt={tournament.name}
                        className="h-12 w-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-[10px] font-semibold text-white/50">
                        N/A
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {tournament.name}
                      </p>
                      <p className="text-xs text-white/50">
                        {tournament.date} · {tournament.location ?? "Lieu à définir"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="border border-white/10 bg-white/10 text-xs text-white/70">
                      {statusLabel[tournament.status]}
                    </Badge>
                    {tournament.slug ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="border-white/10 bg-white/5 text-white hover:border-orange-400/40 hover:bg-orange-500/10"
                        onClick={() => {
                          startNavigation();
                          router.push(`/tournaments/${tournament.slug}/admin${adminQuery}`);
                        }}
                      >
                        Configurer
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-white/50">
              Aucun tournoi trouvé.
            </div>
          )}
        </div>
      </Card>

      <Card className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">
              {selected ? "Modifier le tournoi" : "Créer un tournoi"}
            </p>
            <p className="text-xs text-white/50">Configurer le format et publier</p>
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

          <label className="flex flex-col gap-2 text-sm font-semibold text-white">
            Nom du tournoi
            <Input name="name" placeholder="Nom" defaultValue={selected?.name ?? ""} className="input-field" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-white">
            Slug
            <Input
              name="slug"
              placeholder="Slug"
              defaultValue={selected?.slug ?? ""}
              onChange={(event) => setSlugValue(event.target.value)}
              className="input-field"
            />
            <input type="hidden" name="imagePath" value={imagePath ?? ""} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-white">
            Date
            <Input name="date" type="date" defaultValue={selected?.date ?? ""} className="input-field" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-white">
            Lieu
            <Input
              name="location"
              placeholder="Lieu"
              defaultValue={selected?.location ?? ""}
              className="input-field"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-white">
            Prix d&apos;inscription (€)
            <Input
              name="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ex: 25.00"
              value={priceValue}
              onChange={(event) => setPriceValue(event.target.value)}
              className="input-field"
            />
            <span className="text-xs text-white/50">
              Laissez vide pour un tournoi gratuit ou sans prix défini
            </span>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-white">
            Lien du groupe WhatsApp
            <div className="flex items-center gap-2">
              <span className="text-xl">💬</span>
              <Input
                name="whatsapp_group_link"
                type="url"
                placeholder="https://chat.whatsapp.com/XXXXX"
                value={whatsappLink}
                onChange={(event) => setWhatsappLink(event.target.value)}
                className="input-field flex-1"
              />
            </div>
            <span className="text-xs text-white/50">
              Laissez vide si vous ne souhaitez pas partager de groupe WhatsApp.
              Le lien doit être au format : https://chat.whatsapp.com/XXXXX
            </span>
          </label>
          <div className="flex flex-col gap-2 text-sm font-semibold text-white">
            Règlement du tournoi
            <input type="hidden" name="reglementUrl" value={reglementUrl ?? ""} />
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handlePdfUpload(file);
              }}
            />
            {reglementUrl ? (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-lg">📄</span>
                <a
                  href={reglementUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 truncate text-xs text-orange-300 hover:underline"
                >
                  Règlement uploadé ↗
                </a>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-white/5 text-xs text-white hover:border-orange-400/40 hover:bg-orange-500/10"
                  onClick={() => void handleRemovePdf()}
                  disabled={isPdfUploading}
                >
                  Supprimer
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const file = event.dataTransfer.files?.[0];
                  if (file) void handlePdfUpload(file);
                }}
                className="upload-zone flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-2xl px-4 py-4 text-center text-xs font-semibold text-white/70"
              >
                {isPdfUploading ? (
                  <span className="text-white/60">Upload en cours...</span>
                ) : (
                  <span>Glissez-déposez un PDF ou une image (JPG/PNG/WebP) ou cliquez pour importer (20 Mo max).</span>
                )}
              </button>
            )}
            {pdfUploadError ? (
              <span className="text-xs font-semibold text-red-300">{pdfUploadError}</span>
            ) : null}
          </div>

          <label className="flex flex-col gap-2 text-sm font-semibold text-white">
            Nombre d&apos;équipes
            <Input
              name="maxPlayers"
              type="number"
              placeholder="Max joueurs"
              defaultValue={selected?.max_players ?? ""}
              onChange={(event) => setMaxPlayers(Number(event.target.value || 0))}
              className="input-field"
            />
          </label>
          <div className="flex flex-col gap-2 text-sm font-semibold text-white">
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
              className="upload-zone flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl px-4 py-6 text-center text-xs font-semibold text-white/70"
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
              {isUploading ? <span className="text-white/60">Upload en cours...</span> : null}
            </button>
            {imagePath ? (
              <Button
                type="button"
                variant="outline"
                className="w-fit border-white/10 bg-white/5 text-white hover:border-orange-400/40 hover:bg-orange-500/10"
                onClick={() => void handleRemoveImage()}
                disabled={isUploading}
              >
                Supprimer l’image
              </Button>
            ) : null}
            {uploadError ? (
              <span className="text-xs font-semibold text-red-300">{uploadError}</span>
            ) : null}
          </div>
          <label className="flex flex-col gap-2 text-sm font-semibold text-white">
            Description
            <Input
              name="description"
              placeholder="Description"
              defaultValue={selected?.description ?? ""}
              className="input-field"
            />
          </label>

          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-2 text-sm font-semibold text-white">
              Mode d&apos;appariement des joueurs
              <input type="hidden" name="pairingMode" value={pairingMode} />
              <div className="grid grid-cols-3 gap-2">
                {(["manual", "random", "balanced"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPairingMode(value)}
                    className={`radio-button rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                      pairingMode === value ? "active" : ""
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
            <label className="flex flex-col gap-2 text-sm font-semibold text-white">
              Nombre de poules
              <Input
                name="poolsCount"
                type="number"
                placeholder="Nombre de poules"
                defaultValue={selected?.config?.pools_count ?? 4}
                onChange={(event) => setPoolsCount(Number(event.target.value || 0))}
                className="input-field"
              />
              <span className="text-xs font-semibold text-emerald-300">
                {poolsInfo}
              </span>
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-white">
              Équipes qualifiées
              <Input
                name="teamsQualified"
                type="number"
                placeholder="Équipes qualifiées"
                defaultValue={selected?.config?.playoffs?.teams_qualified ?? 8}
                onChange={(event) => setTeamsQualified(Number(event.target.value || 0))}
                className="input-field"
              />
              {qualifiedInfo ? (
                <span className="text-xs font-semibold text-emerald-300">
                  {qualifiedInfo}
                </span>
              ) : null}
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-white">
              Format playoffs
              <input type="hidden" name="playoffsFormat" value={playoffsFormat} />
              <div className="grid grid-cols-2 gap-2">
                {(["single_elim", "double_elim"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPlayoffsFormat(value)}
                    className={`radio-button rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                      playoffsFormat === value ? "active" : ""
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </label>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 text-sm font-semibold text-white">
              Playoffs activés
              <input type="hidden" name="playoffsEnabled" value={playoffsEnabled ? "true" : "false"} />
              <button
                type="button"
                aria-pressed={playoffsEnabled}
                onClick={() => setPlayoffsEnabled((value) => !value)}
                className={`flex h-10 items-center justify-between rounded-full border px-4 text-[11px] font-semibold uppercase tracking-[0.08em] transition whitespace-nowrap ${
                  playoffsEnabled
                    ? "border-orange-400/40 bg-orange-500/20 text-white"
                    : "border-white/10 bg-white/5 text-white/60"
                }`}
              >
                <span>{playoffsEnabled ? "Activés" : "Désactivés"}</span>
                <span className={`h-5 w-5 rounded-full ${playoffsEnabled ? "bg-white" : "bg-white/20"}`} />
              </button>
            </div>
            <div className="flex flex-col gap-2 text-sm font-semibold text-white">
              Petite finale
              <input type="hidden" name="hasThirdPlace" value={hasThirdPlace ? "true" : "false"} />
              <button
                type="button"
                aria-pressed={hasThirdPlace}
                onClick={() => setHasThirdPlace((value) => !value)}
                className={`flex h-10 items-center justify-between rounded-full border px-4 text-[11px] font-semibold uppercase tracking-[0.08em] transition whitespace-nowrap ${
                  hasThirdPlace
                    ? "border-orange-400/40 bg-orange-500/20 text-white"
                    : "border-white/10 bg-white/5 text-white/60"
                }`}
              >
                <span>{hasThirdPlace ? "Activée" : "Désactivée"}</span>
                <span className={`h-5 w-5 rounded-full ${hasThirdPlace ? "bg-white" : "bg-white/20"}`} />
              </button>
            </div>
            <div className="flex flex-col gap-2 text-sm font-semibold text-white">
              Statut
              <input type="hidden" name="status" value={status} />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(
                  [
                    "draft",
                    "upcoming",
                    "registration",
                    "ongoing",
                    "published",
                    "archived",
                  ] as TournamentStatus[]
                ).map(
                  (value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStatus(value)}
                      className={`radio-button rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] ${
                        status === value ? "active" : ""
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
            <button
              type="submit"
              form="tournament-form"
              className="rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:translate-y-[-1px] hover:shadow-lg"
            >
              {selected ? "Mettre à jour" : "Créer"}
            </button>
            {selected ? (
              <Button
                type="button"
                variant="outline"
                className="border-white/10 bg-white/5 text-white hover:border-orange-400/40 hover:bg-orange-500/10"
                onClick={async () => {
                  const confirmed = window.confirm("Supprimer ce tournoi ?");
                  if (!confirmed) return;
                  const formData = new FormData();
                  formData.set("adminToken", adminToken);
                  formData.set("tournamentId", selected.id);
                  await deleteTournamentAction(formData);
                  onSelectTournament(null);
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
