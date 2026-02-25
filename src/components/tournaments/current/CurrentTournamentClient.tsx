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
import type { PlayoffBracketData, PlayoffMatch } from "@/types/playoff";
import { TournamentSelector } from "@/components/tournaments/current/TournamentSelector";
import { TeamsReadOnlyView } from "@/components/tournaments/current/TeamsReadOnlyView";
import { MatchesAndStandingsView } from "@/components/tournaments/current/MatchesAndStandingsView";
import { Toast } from "@/components/ui/toast";
import { PlayoffBracket } from "@/components/tournaments/PlayoffBracket";
import { PlayoffScoreModal } from "@/components/tournaments/PlayoffScoreModal";
import { cn } from "@/lib/utils";

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
  playoffMatches: PlayoffMatch[];
  playoffBracketData: PlayoffBracketData;
  consolationMatches: PlayoffMatch[];
  consolationBracketData: PlayoffBracketData;
};

type CurrentTournamentClientProps = {
  tournaments: Tournament[];
};

type ActiveTab = "matches" | "playoffs" | "consolation";

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
  const [activeTab, setActiveTab] = useState<ActiveTab>("matches");
  const [activePlayoffMatchId, setActivePlayoffMatchId] = useState<string | null>(null);
  const [activeConsolationMatchId, setActiveConsolationMatchId] = useState<string | null>(null);

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

  const activePlayoffMatch = useMemo(() => {
    if (!activePlayoffMatchId || !tournamentData) return null;
    return tournamentData.playoffMatches.find((m) => m.id === activePlayoffMatchId) ?? null;
  }, [activePlayoffMatchId, tournamentData]);

  const activeConsolationMatch = useMemo(() => {
    if (!activeConsolationMatchId || !tournamentData) return null;
    return tournamentData.consolationMatches?.find((m) => m.id === activeConsolationMatchId) ?? null;
  }, [activeConsolationMatchId, tournamentData]);

  const hasConsolation = (tournamentData?.consolationMatches?.length ?? 0) > 0;

  useEffect(() => {
    if (!selectedId) return;
    if (loading) return;
    if (payload?.tournament?.id === selectedId) return;
    void handleLoad(selectedId);
  }, [loading, payload?.tournament?.id, selectedId]);

  const tabClass = (tab: ActiveTab) =>
    cn(
      "rounded-t-lg px-6 py-3 text-sm font-semibold transition",
      activeTab === tab
        ? "bg-gradient-to-r from-orange-500 to-orange-400 text-white"
        : "text-white/60 hover:text-white"
    );

  return (
    <div className="mt-8 space-y-8">
      {toast ? (
        <Toast message={toast} tone={toastTone} onDismiss={() => setToast(null)} />
      ) : null}
      <TournamentSelector
        tournaments={sortedTournaments}
        value={selectedId}
        onChange={handleLoad}
      />

      {selectedTournament?.reglementUrl ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-white">Règlement du tournoi</div>
            <div className="text-xs text-white/60">
              Consultez les règles et conditions de participation.
            </div>
          </div>
          <a
            href={selectedTournament.reglementUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          >
            Consulter le règlement
            <span aria-hidden>↗</span>
          </a>
        </div>
      ) : null}

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
          <div className="space-y-6">
            <div className="flex gap-2 border-b border-white/10">
              <button type="button" onClick={() => setActiveTab("matches")} className={tabClass("matches")}>
                Matchs & Classement
              </button>
              <button type="button" onClick={() => setActiveTab("playoffs")} className={tabClass("playoffs")}>
                Phases finales
              </button>
              {hasConsolation && (
                <button
                  type="button"
                  onClick={() => setActiveTab("consolation")}
                  className={tabClass("consolation")}
                >
                  Phases consolantes
                </button>
              )}
            </div>

            {activeTab === "matches" && (
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
            )}

            {activeTab === "playoffs" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-white">Mode display</div>
                    <div className="text-xs text-white/60">
                      Ouvre l'affichage plein écran pour diffusion.
                    </div>
                  </div>
                  {selectedTournament?.slug ? (
                    <a
                      href={`/tournaments/${selectedTournament.slug}/display`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
                    >
                      Ouvrir le display
                      <span aria-hidden>↗</span>
                    </a>
                  ) : null}
                </div>
                <PlayoffBracket
                  bracketData={tournamentData.playoffBracketData}
                  onMatchClick={(matchId) => setActivePlayoffMatchId(matchId)}
                />
                {activePlayoffMatch ? (
                  <PlayoffScoreModal
                    match={activePlayoffMatch}
                    onClose={() => setActivePlayoffMatchId(null)}
                    onSaved={() => {
                      handleToast("Score playoffs enregistré", "success");
                      void handleLoad(selectedId);
                      setActivePlayoffMatchId(null);
                    }}
                    onError={(message) => handleToast(message, "error")}
                  />
                ) : null}
              </div>
            )}

            {activeTab === "consolation" && hasConsolation && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-sm font-semibold text-white">Tableau consolante</div>
                  <div className="text-xs text-white/60">
                    Phases finales pour les équipes éliminées du tableau principal.
                  </div>
                </div>
                <PlayoffBracket
                  bracketData={tournamentData.consolationBracketData}
                  onMatchClick={(matchId) => setActiveConsolationMatchId(matchId)}
                />
                {activeConsolationMatch ? (
                  <PlayoffScoreModal
                    match={activeConsolationMatch}
                    onClose={() => setActiveConsolationMatchId(null)}
                    onSaved={() => {
                      handleToast("Score consolante enregistré", "success");
                      void handleLoad(selectedId);
                      setActiveConsolationMatchId(null);
                    }}
                    onError={(message) => handleToast(message, "error")}
                  />
                ) : null}
              </div>
            )}
          </div>
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
