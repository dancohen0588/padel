"use client";

import { useMemo, useState } from "react";
import type { PlayoffBracketData, PlayoffMatch } from "@/types/playoff";
import { PlayoffBracket } from "@/components/tournaments/PlayoffBracket";
import { PlayoffScoreModal } from "@/components/tournaments/PlayoffScoreModal";
import { Button } from "@/components/ui/button";
import { regeneratePlayoffBracketAction } from "@/app/actions/playoff-actions";

type PlayoffsAdminTabProps = {
  tournamentId: string;
  adminToken: string;
  playoffMatches: PlayoffMatch[];
  playoffBracketData: PlayoffBracketData;
};

export function PlayoffsAdminTab({
  tournamentId,
  adminToken,
  playoffMatches,
  playoffBracketData,
}: PlayoffsAdminTabProps) {
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  const matchMap = useMemo(() => {
    return new Map(playoffMatches.map((match) => [match.id, match]));
  }, [playoffMatches]);

  const activeMatch = activeMatchId ? matchMap.get(activeMatchId) ?? null : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Phases finales</h3>
          <p className="text-sm text-white/60">Bracket horizontal • scores éditables</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
        onMatchClick={(matchId) => setActiveMatchId(matchId)}
      />

      {activeMatch ? (
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
