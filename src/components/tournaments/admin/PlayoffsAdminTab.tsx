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
} from "@/app/actions/playoff-actions";

type PlayoffsAdminTabProps = {
  tournamentId: string;
  adminToken: string;
  playoffMatches: PlayoffMatch[];
  playoffBracketData: PlayoffBracketData;
  allTeams: Team[];
};

export function PlayoffsAdminTab({
  tournamentId,
  adminToken,
  playoffMatches,
  playoffBracketData,
  allTeams,
}: PlayoffsAdminTabProps) {
  const router = useRouter();
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const matchMap = useMemo(() => {
    return new Map(playoffMatches.map((match) => [match.id, match]));
  }, [playoffMatches]);

  const activeMatch = activeMatchId ? matchMap.get(activeMatchId) ?? null : null;

  const firstRoundMatches = useMemo(() => {
    const roundNums = Object.keys(playoffBracketData.rounds).map(Number);
    if (roundNums.length === 0) return [];
    const minRound = Math.min(...roundNums);
    return playoffBracketData.rounds[minRound] ?? [];
  }, [playoffBracketData]);

  const qualifiedTeamIds = useMemo(() => {
    const ids = new Set<string>();
    firstRoundMatches.forEach((match) => {
      if (match.team1_id) ids.add(match.team1_id);
      if (match.team2_id) ids.add(match.team2_id);
    });
    return ids;
  }, [firstRoundMatches]);

  const nonQualifiedTeams = useMemo(() => {
    return allTeams.filter((team) => !qualifiedTeamIds.has(team.id));
  }, [allTeams, qualifiedTeamIds]);

  const sortedTeams = useMemo(() => {
    const nonQualified = allTeams.filter((team) => !qualifiedTeamIds.has(team.id));
    const qualified = allTeams.filter((team) => qualifiedTeamIds.has(team.id));
    return [...nonQualified, ...qualified];
  }, [allTeams, qualifiedTeamIds]);

  const handleOverride = (matchId: string, position: "team1" | "team2", newTeamId: string) => {
    if (!newTeamId) return;
    setEditError(null);
    startTransition(async () => {
      const result = await overridePlayoffTeamAction(matchId, position, newTeamId, adminToken);
      if (!result.success) {
        setEditError(result.error ?? "Erreur lors de la modification.");
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Phases finales</h3>
          <p className="text-sm text-white/60">Bracket horizontal • scores éditables</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {firstRoundMatches.length > 0 && (
            <Button
              type="button"
              variant="outline"
              className={
                isEditMode
                  ? "border-orange-400/40 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 hover:text-orange-300"
                  : "border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              }
              onClick={() => {
                setIsEditMode((v) => !v);
                setEditError(null);
              }}
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
              const confirmed = window.confirm(
                "Cette action supprime et regénère tous les matchs des phases finales. Continuer ?"
              );
              if (!confirmed) return;
              setIsRegenerating(true);
              setRegenerateError(null);
              setIsEditMode(false);
              const result = await regeneratePlayoffBracketAction(tournamentId, adminToken);
              if (!result.success) {
                setRegenerateError(result.error ?? "Erreur lors de la régénération.");
              } else {
                setRefreshTick((value) => value + 1);
              }
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

      {regenerateError ? (
        <div className="text-xs text-red-400">{regenerateError}</div>
      ) : null}

      <PlayoffBracket
        bracketData={playoffBracketData}
        onMatchClick={(matchId) => {
          if (!isEditMode) setActiveMatchId(matchId);
        }}
      />

      {isEditMode && firstRoundMatches.length > 0 && (
        <div className="rounded-2xl border border-orange-400/30 bg-orange-500/5 p-6 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-orange-300">Édition des équipes qualifiées</h4>
            <p className="text-xs text-white/50 mt-1">
              Remplace une équipe qualifiée par une équipe non qualifiée. Les équipes déjà qualifiées sont marquées{" "}
              <span className="text-white/30">(qualifié)</span> dans les menus.
            </p>
          </div>
          {editError && <div className="text-xs text-red-400">{editError}</div>}
          <div className="space-y-3">
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
                    onChange={(e) => handleOverride(match.id, "team1", e.target.value)}
                  >
                    <option value="">— Aucune équipe —</option>
                    {sortedTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name ?? `Équipe ${team.id.slice(0, 6)}`}
                        {qualifiedTeamIds.has(team.id) && team.id !== match.team1_id
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
                    onChange={(e) => handleOverride(match.id, "team2", e.target.value)}
                  >
                    <option value="">— Aucune équipe —</option>
                    {sortedTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name ?? `Équipe ${team.id.slice(0, 6)}`}
                        {qualifiedTeamIds.has(team.id) && team.id !== match.team2_id
                          ? " (qualifié)"
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
          {isPending && <p className="text-xs text-white/40">Enregistrement en cours...</p>}
        </div>
      )}

      {firstRoundMatches.length > 0 && nonQualifiedTeams.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
          <h4 className="text-sm font-semibold text-white/70">
            Équipes non qualifiées
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

      {activeMatch && !isEditMode ? (
        <PlayoffScoreModal
          match={activeMatch}
          adminToken={adminToken}
          onClose={() => setActiveMatchId(null)}
          onSaved={() => {
            setActiveMatchId(null);
            setRefreshTick((value) => value + 1);
          }}
          onError={() => setActiveMatchId(null)}
        />
      ) : null}

      {refreshTick > 0 ? (
        <div className="text-xs text-white/50">
          Les scores ont été mis à jour. Rafraîchir la page pour voir le bracket mis à jour.
        </div>
      ) : null}
    </div>
  );
}
