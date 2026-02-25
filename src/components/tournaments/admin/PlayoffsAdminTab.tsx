"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PlayoffBracketData, PlayoffMatch } from "@/types/playoff";
import type { Team } from "@/lib/types";
import { PlayoffBracket } from "@/components/tournaments/PlayoffBracket";
import { PlayoffScoreModal } from "@/components/tournaments/PlayoffScoreModal";
import { Button } from "@/components/ui/button";
import {
  regeneratePlayoffBracketAction,
  overridePlayoffTeamAction,
  generateConsolationBracketAction,
  regenerateConsolationBracketAction,
} from "@/app/actions/playoff-actions";

type PlayoffsAdminTabProps = {
  tournamentId: string;
  adminToken: string;
  playoffMatches: PlayoffMatch[];
  playoffBracketData: PlayoffBracketData;
  consolationMatches: PlayoffMatch[];
  consolationBracketData: PlayoffBracketData;
  allTeams: Team[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useFirstRoundMatches(bracketData: PlayoffBracketData) {
  return useMemo(() => {
    const roundNums = Object.keys(bracketData.rounds).map(Number);
    if (roundNums.length === 0) return [];
    return bracketData.rounds[Math.min(...roundNums)] ?? [];
  }, [bracketData]);
}

function useQualifiedIds(firstRoundMatches: PlayoffMatch[]) {
  return useMemo(() => {
    const ids = new Set<string>();
    firstRoundMatches.forEach((m) => {
      if (m.team1_id) ids.add(m.team1_id);
      if (m.team2_id) ids.add(m.team2_id);
    });
    return ids;
  }, [firstRoundMatches]);
}

// ─── Edit panel (réutilisable pour principal et consolante) ───────────────────

function BracketEditPanel({
  firstRoundMatches,
  allSelectableTeams,
  qualifiedInBracket,
  isPending,
  error,
  onOverride,
}: {
  firstRoundMatches: PlayoffMatch[];
  allSelectableTeams: Team[];
  qualifiedInBracket: Set<string>;
  isPending: boolean;
  error: string | null;
  onOverride: (matchId: string, position: "team1" | "team2", newTeamId: string) => void;
}) {
  const sortedTeams = useMemo(() => {
    const free = allSelectableTeams.filter((t) => !qualifiedInBracket.has(t.id));
    const taken = allSelectableTeams.filter((t) => qualifiedInBracket.has(t.id));
    return [...free, ...taken];
  }, [allSelectableTeams, qualifiedInBracket]);

  return (
    <div className="space-y-3">
      {error && <div className="text-xs text-red-400">{error}</div>}
      {firstRoundMatches.map((match, index) => (
        <div
          key={match.id}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
        >
          <span className="w-16 shrink-0 text-xs font-semibold text-white/40">
            Match {index + 1}
          </span>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <select
              className="flex-1 min-w-[160px] rounded-lg border border-white/20 bg-[#1E1E2E] px-3 py-2 text-sm text-white disabled:opacity-50"
              value={match.team1_id ?? ""}
              disabled={isPending}
              onChange={(e) => e.target.value && onOverride(match.id, "team1", e.target.value)}
            >
              <option value="">— Aucune équipe —</option>
              {sortedTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name ?? `Équipe ${team.id.slice(0, 6)}`}
                  {qualifiedInBracket.has(team.id) && team.id !== match.team1_id
                    ? " (qualifié)"
                    : ""}
                </option>
              ))}
            </select>
            <span className="text-xs text-white/30">vs</span>
            <select
              className="flex-1 min-w-[160px] rounded-lg border border-white/20 bg-[#1E1E2E] px-3 py-2 text-sm text-white disabled:opacity-50"
              value={match.team2_id ?? ""}
              disabled={isPending}
              onChange={(e) => e.target.value && onOverride(match.id, "team2", e.target.value)}
            >
              <option value="">— Aucune équipe —</option>
              {sortedTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name ?? `Équipe ${team.id.slice(0, 6)}`}
                  {qualifiedInBracket.has(team.id) && team.id !== match.team2_id
                    ? " (qualifié)"
                    : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}
      {isPending && <p className="text-xs text-white/40">Enregistrement en cours...</p>}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function PlayoffsAdminTab({
  tournamentId,
  adminToken,
  playoffMatches,
  playoffBracketData,
  consolationMatches,
  consolationBracketData,
  allTeams,
}: PlayoffsAdminTabProps) {
  const router = useRouter();

  // Tableau principal
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditPending, startEditTransition] = useTransition();

  // Tableau consolante
  const [activeConsolationMatchId, setActiveConsolationMatchId] = useState<string | null>(null);
  const [isGeneratingConsolation, setIsGeneratingConsolation] = useState(false);
  const [consolationError, setConsolationError] = useState<string | null>(null);
  const [isConsolationEditMode, setIsConsolationEditMode] = useState(false);
  const [consolationEditError, setConsolationEditError] = useState<string | null>(null);
  const [isConsolationEditPending, startConsolationEditTransition] = useTransition();

  const [refreshTick, setRefreshTick] = useState(0);

  // Maps matchId → match
  const mainMatchMap = useMemo(
    () => new Map(playoffMatches.map((m) => [m.id, m])),
    [playoffMatches]
  );
  const consolationMatchMap = useMemo(
    () => new Map(consolationMatches.map((m) => [m.id, m])),
    [consolationMatches]
  );

  // Premier tour de chaque tableau
  const mainFirstRound = useFirstRoundMatches(playoffBracketData);
  const consolationFirstRound = useFirstRoundMatches(consolationBracketData);

  // IDs qualifiés dans chaque tableau
  const mainQualifiedIds = useQualifiedIds(mainFirstRound);
  const consolationQualifiedIds = useQualifiedIds(consolationFirstRound);

  // Équipes non qualifiées au tableau principal
  const nonQualifiedTeams = useMemo(
    () => allTeams.filter((t) => !mainQualifiedIds.has(t.id)),
    [allTeams, mainQualifiedIds]
  );

  const hasConsolation = consolationMatches.length > 0;

  const handleMainOverride = (matchId: string, position: "team1" | "team2", teamId: string) => {
    setEditError(null);
    startEditTransition(async () => {
      const result = await overridePlayoffTeamAction(matchId, position, teamId, adminToken);
      if (!result.success) setEditError(result.error ?? "Erreur lors de la modification.");
      else router.refresh();
    });
  };

  const handleConsolationOverride = (
    matchId: string,
    position: "team1" | "team2",
    teamId: string
  ) => {
    setConsolationEditError(null);
    startConsolationEditTransition(async () => {
      const result = await overridePlayoffTeamAction(matchId, position, teamId, adminToken);
      if (!result.success) setConsolationEditError(result.error ?? "Erreur lors de la modification.");
      else router.refresh();
    });
  };

  const activeMainMatch = activeMatchId ? mainMatchMap.get(activeMatchId) ?? null : null;
  const activeConsolationMatch = activeConsolationMatchId
    ? consolationMatchMap.get(activeConsolationMatchId) ?? null
    : null;

  return (
    <div className="space-y-8">
      {/* ── Tableau principal ── */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Tableau principal</h3>
            <p className="text-sm text-white/60">Bracket horizontal • scores éditables</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {mainFirstRound.length > 0 && (
              <Button
                type="button"
                variant="outline"
                className={
                  isEditMode
                    ? "border-orange-400/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 hover:text-orange-300"
                    : "border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                }
                onClick={() => { setIsEditMode((v) => !v); setEditError(null); }}
              >
                {isEditMode ? "Quitter le mode édition" : "Modifier les qualifiés"}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="bg-brand-violet text-white hover:bg-brand-violet/90 hover:text-white"
              disabled={isRegenerating}
              onClick={async () => {
                if (!window.confirm("Cette action supprime et regénère tous les matchs du tableau principal. Continuer ?")) return;
                setIsRegenerating(true);
                setRegenerateError(null);
                setIsEditMode(false);
                const result = await regeneratePlayoffBracketAction(tournamentId, adminToken);
                if (!result.success) setRegenerateError(result.error ?? "Erreur lors de la régénération.");
                else setRefreshTick((v) => v + 1);
                setIsRegenerating(false);
              }}
            >
              {isRegenerating ? "Génération..." : "Générer les matchs"}
            </Button>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/60">
              {playoffMatches.length} matchs
            </div>
          </div>
        </div>

        {regenerateError && <div className="text-xs text-red-400">{regenerateError}</div>}

        <PlayoffBracket
          bracketData={playoffBracketData}
          onMatchClick={(id) => { if (!isEditMode) setActiveMatchId(id); }}
        />

        {isEditMode && mainFirstRound.length > 0 && (
          <div className="rounded-2xl border border-orange-400/30 bg-orange-500/5 p-6 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-orange-300">Édition des équipes qualifiées</h4>
              <p className="text-xs text-white/50 mt-1">
                Sélectionne une équipe dans chaque slot. Les équipes marquées{" "}
                <span className="text-white/30">(qualifié)</span> sont déjà dans le tableau.
              </p>
            </div>
            <BracketEditPanel
              firstRoundMatches={mainFirstRound}
              allSelectableTeams={allTeams}
              qualifiedInBracket={mainQualifiedIds}
              isPending={isEditPending}
              error={editError}
              onOverride={handleMainOverride}
            />
          </div>
        )}

        {mainFirstRound.length > 0 && nonQualifiedTeams.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
            <h4 className="text-sm font-semibold text-white/70">
              Équipes non qualifiées au tableau principal
              <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">
                {nonQualifiedTeams.length}
              </span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {nonQualifiedTeams.map((team) => (
                <span
                  key={team.id}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60"
                >
                  {team.name ?? `Équipe ${team.id.slice(0, 6)}`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Séparateur ── */}
      {mainFirstRound.length > 0 && (
        <div className="border-t border-white/10" />
      )}

      {/* ── Tableau consolante ── */}
      {mainFirstRound.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Tableau consolante
                {nonQualifiedTeams.length < 4 && !hasConsolation && (
                  <span className="ml-3 text-xs font-normal text-white/40">
                    (minimum 4 équipes éliminées requises)
                  </span>
                )}
              </h3>
              <p className="text-sm text-white/60">
                {hasConsolation
                  ? `Bracket secondaire • ${consolationMatches.length} matchs`
                  : "Phases finales pour les équipes éliminées du tableau principal"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {hasConsolation && consolationFirstRound.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className={
                    isConsolationEditMode
                      ? "border-orange-400/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 hover:text-orange-300"
                      : "border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                  }
                  onClick={() => { setIsConsolationEditMode((v) => !v); setConsolationEditError(null); }}
                >
                  {isConsolationEditMode ? "Quitter le mode édition" : "Modifier les équipes"}
                </Button>
              )}
              {nonQualifiedTeams.length >= 4 && (
                <Button
                  type="button"
                  variant="outline"
                  className="bg-brand-violet text-white hover:bg-brand-violet/90 hover:text-white"
                  disabled={isGeneratingConsolation}
                  onClick={async () => {
                    if (hasConsolation) {
                      if (!window.confirm("Cette action supprime et regénère le tableau consolante. Continuer ?")) return;
                    }
                    setIsGeneratingConsolation(true);
                    setConsolationError(null);
                    setIsConsolationEditMode(false);
                    const action = hasConsolation
                      ? regenerateConsolationBracketAction
                      : generateConsolationBracketAction;
                    const result = await action(tournamentId, adminToken);
                    if (!result.success) setConsolationError(result.error ?? "Erreur lors de la génération.");
                    else router.refresh();
                    setIsGeneratingConsolation(false);
                  }}
                >
                  {isGeneratingConsolation
                    ? "Génération..."
                    : hasConsolation
                    ? "Regénérer"
                    : "Générer le tableau consolante"}
                </Button>
              )}
              {hasConsolation && (
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/60">
                  {consolationMatches.length} matchs
                </div>
              )}
            </div>
          </div>

          {consolationError && <div className="text-xs text-red-400">{consolationError}</div>}

          {hasConsolation && (
            <>
              <PlayoffBracket
                bracketData={consolationBracketData}
                onMatchClick={(id) => { if (!isConsolationEditMode) setActiveConsolationMatchId(id); }}
              />

              {isConsolationEditMode && consolationFirstRound.length > 0 && (
                <div className="rounded-2xl border border-orange-400/30 bg-orange-500/5 p-6 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-orange-300">
                      Édition des équipes — tableau consolante
                    </h4>
                    <p className="text-xs text-white/50 mt-1">
                      Seules les équipes non qualifiées au tableau principal sont disponibles.
                    </p>
                  </div>
                  <BracketEditPanel
                    firstRoundMatches={consolationFirstRound}
                    allSelectableTeams={nonQualifiedTeams}
                    qualifiedInBracket={consolationQualifiedIds}
                    isPending={isConsolationEditPending}
                    error={consolationEditError}
                    onOverride={handleConsolationOverride}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Modals de score ── */}
      {activeMainMatch && !isEditMode && (
        <PlayoffScoreModal
          match={activeMainMatch}
          adminToken={adminToken}
          onClose={() => setActiveMatchId(null)}
          onSaved={() => { setActiveMatchId(null); setRefreshTick((v) => v + 1); }}
          onError={() => setActiveMatchId(null)}
        />
      )}
      {activeConsolationMatch && !isConsolationEditMode && (
        <PlayoffScoreModal
          match={activeConsolationMatch}
          adminToken={adminToken}
          onClose={() => setActiveConsolationMatchId(null)}
          onSaved={() => { setActiveConsolationMatchId(null); setRefreshTick((v) => v + 1); }}
          onError={() => setActiveConsolationMatchId(null)}
        />
      )}

      {refreshTick > 0 && (
        <div className="text-xs text-white/50">
          Les scores ont été mis à jour. Rafraîchir la page pour voir le bracket mis à jour.
        </div>
      )}
    </div>
  );
}
