"use client";

import { useMemo, useState } from "react";
import type { Match, MatchSet, Pool, PoolStanding, PoolTeam, Team, TeamPlayer, Tournament } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MatchScoreModal } from "@/components/tournaments/current/MatchScoreModal";

type MatchesAndStandingsViewProps = {
  tournament: Tournament;
  pools: Pool[];
  poolTeams: PoolTeam[];
  teams: Team[];
  teamPlayers: TeamPlayer[];
  matches: Match[];
  matchSets: MatchSet[];
  onSaved?: () => void;
  onError?: (message: string) => void;
};

type MatchWithTeams = Match & {
  team_a: Team;
  team_b: Team;
  sets: MatchSet[];
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "Date à définir";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date à définir";
  }
  return date.toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusStyles: Record<string, string> = {
  finished: "bg-emerald-500/15 text-emerald-300",
  live: "bg-orange-500/20 text-orange-300 animate-pulse",
  upcoming: "bg-amber-400/15 text-amber-200",
};

const statusLabel: Record<string, string> = {
  finished: "Terminé",
  live: "En direct",
  upcoming: "À venir",
};

const sortStandings = (standings: PoolStanding[]) =>
  [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.set_diff !== a.set_diff) return b.set_diff - a.set_diff;
    if (b.game_diff !== a.game_diff) return b.game_diff - a.game_diff;
    return (a.team_name ?? "").localeCompare(b.team_name ?? "");
  });

const computeStandings = (
  teams: Team[],
  matches: MatchWithTeams[],
  poolTeamIds: Set<string>
): PoolStanding[] => {
  const standings = new Map<string, PoolStanding>();
  teams
    .filter((team) => poolTeamIds.has(team.id))
    .forEach((team) => {
      standings.set(team.id, {
        team_id: team.id,
        team_name: team.name,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        sets_for: 0,
        sets_against: 0,
        games_for: 0,
        games_against: 0,
        set_diff: 0,
        game_diff: 0,
        points: 0,
      });
    });

  matches.forEach((match) => {
    if (match.status !== "finished") return;
    const teamA = standings.get(match.team_a_id);
    const teamB = standings.get(match.team_b_id);
    if (!teamA || !teamB) return;

    teamA.played += 1;
    teamB.played += 1;
    teamA.sets_for += match.sets_won_a;
    teamA.sets_against += match.sets_won_b;
    teamB.sets_for += match.sets_won_b;
    teamB.sets_against += match.sets_won_a;
    teamA.games_for += match.games_won_a;
    teamA.games_against += match.games_won_b;
    teamB.games_for += match.games_won_b;
    teamB.games_against += match.games_won_a;

    if (match.sets_won_a > match.sets_won_b) {
      teamA.wins += 1;
      teamB.losses += 1;
      teamA.points += 2;
    } else if (match.sets_won_b > match.sets_won_a) {
      teamB.wins += 1;
      teamA.losses += 1;
      teamB.points += 2;
    } else {
      teamA.draws += 1;
      teamB.draws += 1;
      teamA.points += 1;
      teamB.points += 1;
    }
  });

  return Array.from(standings.values()).map((standing) => ({
    ...standing,
    set_diff: standing.sets_for - standing.sets_against,
    game_diff: standing.games_for - standing.games_against,
  }));
};

export function MatchesAndStandingsView({
  pools,
  poolTeams,
  teams,
  matches,
  matchSets,
  onSaved,
  onError,
}: MatchesAndStandingsViewProps) {
  const [activeMatch, setActiveMatch] = useState<MatchWithTeams | null>(null);

  const matchesWithTeams = useMemo<MatchWithTeams[]>(() => {
    const teamMap = new Map(teams.map((team) => [team.id, team]));
    const setsByMatch = new Map<string, MatchSet[]>();
    matchSets.forEach((set) => {
      const list = setsByMatch.get(set.match_id) ?? [];
      list.push(set);
      setsByMatch.set(set.match_id, list);
    });
    return matches.map((match) => ({
      ...match,
      team_a: teamMap.get(match.team_a_id) ?? {
        id: match.team_a_id,
        tournament_id: match.tournament_id,
        name: null,
        created_at: "",
      },
      team_b: teamMap.get(match.team_b_id) ?? {
        id: match.team_b_id,
        tournament_id: match.tournament_id,
        name: null,
        created_at: "",
      },
      sets: setsByMatch.get(match.id) ?? [],
    }));
  }, [matchSets, matches, teams]);

  const poolData = useMemo(() =>
    pools.map((pool) => {
      const poolTeamIds = new Set(
        poolTeams.filter((pt) => pt.pool_id === pool.id).map((pt) => pt.team_id)
      );
      const poolMatches = matchesWithTeams.filter((match) => match.pool_id === pool.id);
      const standings = computeStandings(teams, poolMatches, poolTeamIds);
      return { pool, poolMatches, standings, poolTeamIds };
    }),
  [matchesWithTeams, poolTeams, pools, teams]);

  if (pools.length === 0) {
    return (
      <Card className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white">
        <div className="text-lg font-semibold">Les poules n'ont pas encore été générées.</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Matchs & Classements</h3>
          <p className="text-sm text-white/60">Lecture publique • scores éditables</p>
        </div>
      </div>

      <Tabs defaultValue={pools[0]?.id ?? ""} className="w-full">
        <TabsList className="flex w-full flex-wrap gap-2 rounded-2xl bg-white/5 p-2">
          {pools.map((pool) => (
            <TabsTrigger key={pool.id} value={pool.id}>
              {pool.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {poolData.map((poolItem) => {
          const sortedStandings = sortStandings(poolItem.standings);
          return (
            <TabsContent key={poolItem.pool.id} value={poolItem.pool.id} className="mt-6">
              <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
                <Card className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-400 text-lg">
                      📊
                    </div>
                    <div className="text-lg font-semibold">Classement</div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {sortedStandings.map((standing, index) => {
                      const rankClass =
                        index === 0
                          ? "bg-gradient-to-br from-yellow-300 to-orange-400 text-[#1E1E2E]"
                          : index === 1
                            ? "bg-gradient-to-br from-gray-200 to-gray-400 text-[#1E1E2E]"
                            : index === 2
                              ? "bg-gradient-to-br from-orange-300 to-amber-700 text-white"
                              : "bg-white/10 text-white/60";
                      return (
                        <div
                          key={standing.team_id}
                          className="grid grid-cols-[52px_1fr_auto] items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:translate-x-1 hover:border-orange-400/60"
                        >
                          <div className={`flex h-11 w-11 items-center justify-center rounded-xl font-bold ${rankClass}`}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">
                              {standing.team_name ?? "Équipe"}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-3 text-xs text-white/50">
                              <span>G: <strong className="text-emerald-300">{standing.wins}</strong></span>
                              <span>N: <strong className="text-amber-200">{standing.draws}</strong></span>
                              <span>P: <strong className="text-rose-300">{standing.losses}</strong></span>
                              <span>+/-: <strong className="text-emerald-300">{standing.set_diff}</strong></span>
                            </div>
                          </div>
                          <div className="rounded-xl bg-violet-500/20 px-3 py-2 text-sm font-bold text-violet-300">
                            {standing.points} pts
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-400 text-lg">
                      ⚔️
                    </div>
                    <div className="text-lg font-semibold">Matchs</div>
                  </div>
                  <div className="mt-4 max-h-[520px] space-y-4 overflow-y-auto pr-2">
                    {poolItem.poolMatches.length === 0 ? (
                      <div className="text-sm text-white/60">
                        Aucun match généré pour cette poule.
                      </div>
                    ) : (
                      poolItem.poolMatches.map((match) => {
                        const aIsWinner = match.sets_won_a > match.sets_won_b;
                        const bIsWinner = match.sets_won_b > match.sets_won_a;
                        const statusClass = statusStyles[match.status] ?? statusStyles.upcoming;
                        return (
                          <div
                            key={match.id}
                            className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-0.5 hover:border-orange-400/60 hover:shadow-[0_6px_20px_rgba(255,107,53,0.15)]"
                          >
                            <div className="flex items-center justify-between text-xs font-semibold text-white/60">
                              <div className="flex items-center gap-2">
                                <span>📅</span>
                                <span>{formatDateTime(match.scheduled_at)}</span>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-[11px] uppercase ${statusClass}`}>
                                {statusLabel[match.status] ?? "À venir"}
                              </span>
                            </div>
                            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 text-sm font-bold text-white">
                                  {(match.team_a.name ?? "").slice(0, 2).toUpperCase() || "A"}
                                </div>
                                <div className="font-semibold text-white">{match.team_a.name ?? "Équipe A"}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-2xl font-bold ${aIsWinner ? "text-emerald-400" : "text-orange-300"}`}>
                                  {match.sets_won_a}
                                </span>
                                <span className="rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-white/50">-</span>
                                <span className={`text-2xl font-bold ${bIsWinner ? "text-emerald-400" : "text-orange-300"}`}>
                                  {match.sets_won_b}
                                </span>
                              </div>
                              <div className="flex items-center justify-end gap-3">
                                <div className="font-semibold text-white">{match.team_b.name ?? "Équipe B"}</div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 text-sm font-bold text-white">
                                  {(match.team_b.name ?? "").slice(0, 2).toUpperCase() || "B"}
                                </div>
                              </div>
                            </div>
                            {match.sets.length > 0 ? (
                              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                                {match.sets.map((set) => {
                                  const isWon = set.team_a_games > set.team_b_games;
                                  const isLost = set.team_b_games > set.team_a_games;
                                  return (
                                    <span
                                      key={set.id}
                                      className={`rounded-md px-3 py-1 text-xs font-semibold ${
                                        isWon
                                          ? "bg-emerald-500/15 text-emerald-300"
                                          : isLost
                                            ? "text-white/40"
                                            : "bg-orange-500/15 text-orange-300"
                                      }`}
                                    >
                                      Set {set.set_order}: {set.team_a_games}-{set.team_b_games}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : null}
                            <div className="mt-4 flex justify-end border-t border-white/10 pt-4">
                              <Button
                                type="button"
                                variant={match.status === "finished" ? "secondary" : "default"}
                                onClick={() => setActiveMatch(match)}
                              >
                                {match.status === "finished" ? "Modifier le score" : "Saisir résultat"}
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </Card>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {activeMatch ? (
        <MatchScoreModal
          match={activeMatch}
          onClose={() => setActiveMatch(null)}
          onSaved={onSaved}
          onError={onError}
        />
      ) : null}
    </div>
  );
}
