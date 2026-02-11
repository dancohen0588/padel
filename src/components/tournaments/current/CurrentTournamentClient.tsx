"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Match,
  MatchSet,
  Pool,
  PoolTeam,
  RegistrationWithPlayer,
  Team,
  TeamPlayer,
  Tournament,
} from "@/lib/types";
import { TournamentSelector } from "@/components/tournaments/current/TournamentSelector";
import { TeamsReadOnlyView } from "@/components/tournaments/current/TeamsReadOnlyView";
import { MatchesAndStandingsView } from "@/components/tournaments/current/MatchesAndStandingsView";
import { Toast } from "@/components/ui/toast";

type TournamentPayload = {
  tournament: Tournament | null;
  registrations: RegistrationWithPlayer[];
  teams: Team[];
  teamPlayers: TeamPlayer[];
  pools: Pool[];
  poolTeams: PoolTeam[];
  matches: Match[];
  matchSets: MatchSet[];
  hasStarted: boolean;
};

type CurrentTournamentClientProps = {
  tournaments: Tournament[];
};

export function CurrentTournamentClient({ tournaments }: CurrentTournamentClientProps) {
  const sortedTournaments = useMemo(
    () =>
      [...tournaments].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [tournaments]
  );

  const defaultTournament = sortedTournaments[0];
  const [selectedId, setSelectedId] = useState<string>(defaultTournament?.id ?? "");
  const [payload, setPayload] = useState<TournamentPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "error">("success");

  const handleLoad = async (tournamentId: string) => {
    if (!tournamentId) return;
    setSelectedId(tournamentId);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/public`);
      if (!response.ok) {
        throw new Error("Impossible de charger les données du tournoi.");
      }
      const data = (await response.json()) as TournamentPayload;
      setPayload(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  };

  const handleToast = (message: string, tone: "success" | "error" = "success") => {
    setToastTone(tone);
    setToast(message);
  };

  const selectedTournament = sortedTournaments.find((item) => item.id === selectedId);
  const tournamentData = payload?.tournament?.id === selectedId ? payload : null;

  useEffect(() => {
    if (!selectedId) return;
    if (loading) return;
    if (payload?.tournament?.id === selectedId) return;
    void handleLoad(selectedId);
  }, [loading, payload?.tournament?.id, selectedId]);

  return (
    <div className="mt-8 space-y-8">
      {toast ? (
        <Toast
          message={toast}
          tone={toastTone}
          onDismiss={() => setToast(null)}
        />
      ) : null}
      <TournamentSelector
        tournaments={sortedTournaments}
        value={selectedId}
        onChange={handleLoad}
      />

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
          Chargement des données du tournoi…
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {tournamentData && selectedTournament ? (
        tournamentData.hasStarted ? (
          <MatchesAndStandingsView
            tournament={selectedTournament}
            pools={tournamentData.pools}
            poolTeams={tournamentData.poolTeams}
            teams={tournamentData.teams}
            teamPlayers={tournamentData.teamPlayers}
            matches={tournamentData.matches}
            matchSets={tournamentData.matchSets}
            onSaved={() => {
              handleToast("Score enregistré", "success");
              void handleLoad(selectedId);
            }}
            onError={(message) => handleToast(message, "error")}
          />
        ) : (
          <TeamsReadOnlyView
            tournament={selectedTournament}
            teams={tournamentData.teams}
            teamPlayers={tournamentData.teamPlayers}
            registrations={tournamentData.registrations}
            pools={tournamentData.pools}
            poolTeams={tournamentData.poolTeams}
          />
        )
      ) : null}
    </div>
  );
}
