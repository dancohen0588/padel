"use client";

import { useState, useTransition } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generatePoolMatchesAction, upsertMatchResultAction } from "@/app/actions/matches";
import type { MatchWithTeams, Pool, PoolStanding } from "@/lib/types";

type PoolData = {
  pool: Pool;
  matches: MatchWithTeams[];
  standings: PoolStanding[];
};

type MatchesAdminTabProps = {
  tournamentId: string;
  pools: Pool[];
  poolData: PoolData[];
  adminToken: string;
};

type SetInput = {
  teamA: string;
  teamB: string;
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

const buildInitialSets = (match?: MatchWithTeams | null): SetInput[] => {
  if (!match || match.sets.length === 0) {
    return [{ teamA: "", teamB: "" }];
  }
  return match.sets.map((set) => ({
    teamA: String(set.team_a_games),
    teamB: String(set.team_b_games),
  }));
};

const sortStandings = (standings: PoolStanding[]) =>
  [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.set_diff !== a.set_diff) return b.set_diff - a.set_diff;
    if (b.game_diff !== a.game_diff) return b.game_diff - a.game_diff;
    return (a.team_name ?? "").localeCompare(b.team_name ?? "");
  });

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

export function MatchesAdminTab({
  tournamentId,
  pools,
  poolData,
  adminToken,
}: MatchesAdminTabProps) {
  const [activeMatch, setActiveMatch] = useState<MatchWithTeams | null>(null);
  const [sets, setSets] = useState<SetInput[]>(buildInitialSets());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasPools = pools.length > 0;
  const defaultPoolId = pools[0]?.id ?? "";

  const handleOpenModal = (match: MatchWithTeams) => {
    setActiveMatch(match);
    setSets(buildInitialSets(match));
    setError(null);
  };

  const handleCloseModal = () => {
    setActiveMatch(null);
    setError(null);
  };

  const handleAddSet = () => {
    setSets((prev) =>
      prev.length < 5 ? [...prev, { teamA: "", teamB: "" }] : prev
    );
  };

  const handleRemoveSet = (index: number) => {
    setSets((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!activeMatch) return;
    const normalized = sets.map((set) => ({
      teamA: set.teamA.trim(),
      teamB: set.teamB.trim(),
    }));

    const hasPartial = normalized.some(
      (set) => (set.teamA && !set.teamB) || (!set.teamA && set.teamB)
    );
    if (hasPartial) {
      setError("Renseigne les deux scores pour chaque set.");
      return;
    }

    const payload = normalized
      .filter((set) => set.teamA !== "" && set.teamB !== "")
      .map((set) => ({
        teamA: Number(set.teamA),
        teamB: Number(set.teamB),
      }));

    if (payload.length === 0) {
      setError("Saisis au moins un set.");
      return;
    }

    startTransition(async () => {
      await upsertMatchResultAction(activeMatch.id, payload, adminToken);
      setActiveMatch(null);
    });
  };

  const handleGenerateMatches = () => {
    startTransition(async () => {
      await generatePoolMatchesAction(tournamentId, adminToken);
    });
  };

  const renderMatchCard = (match: MatchWithTeams) => {
    const aIsWinner = match.sets_won_a > match.sets_won_b;
    const bIsWinner = match.sets_won_b > match.sets_won_a;
    const statusClass = statusStyles[match.status] ?? statusStyles.upcoming;
    return (
      <div
        key={match.id}
        className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-orange-400/60 hover:shadow-[0_6px_20px_rgba(255,107,53,0.15)]"
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
            onClick={() => handleOpenModal(match)}
          >
            {match.status === "finished" ? "Modifier" : "Saisir résultat"}
          </Button>
        </div>
      </div>
    );
  };

  if (!hasPools) {
    return (
      <Card className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white">
        <div className="text-lg font-semibold">Crée d&apos;abord des poules pour générer les matchs.</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Matchs & Classements</h3>
          <p className="text-sm text-white/60">Round‑robin par poule • V=2, N=1, D=0</p>
        </div>
        <Button type="button" onClick={handleGenerateMatches} disabled={isPending}>
          Générer les matchs
        </Button>
      </div>

      <Tabs defaultValue={defaultPoolId} className="w-full">
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
                  <div className="mt-4 space-y-4">
                    {poolItem.matches.length === 0 ? (
                      <div className="text-sm text-white/60">
                        Aucun match généré pour cette poule.
                      </div>
                    ) : (
                      poolItem.matches.map(renderMatchCard)
                    )}
                  </div>
                </Card>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {activeMatch ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <div className="w-full max-w-xl rounded-3xl bg-[#2A2A3E] p-8 text-white shadow-2xl">
            <div className="text-2xl font-semibold">Saisir le résultat du match</div>
            <div className="mt-6 rounded-2xl bg-white/5 p-4">
              <div className="text-xs text-white/50">Match</div>
              <div className="text-lg font-semibold text-white">
                {activeMatch.team_a.name ?? "Équipe A"} vs {activeMatch.team_b.name ?? "Équipe B"}
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {sets.map((set, index) => (
                <div key={`set-${index}`} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-white/60">
                    <span>Set {index + 1}</span>
                    {sets.length > 1 ? (
                      <button
                        type="button"
                        className="text-rose-300 hover:text-rose-200"
                        onClick={() => handleRemoveSet(index)}
                      >
                        Retirer
                      </button>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      className="rounded-xl border border-white/10 bg-white/10 p-3 text-center text-lg font-semibold text-white focus:border-orange-400 focus:outline-none"
                      value={set.teamA}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSets((prev) =>
                          prev.map((item, idx) =>
                            idx === index ? { ...item, teamA: value } : item
                          )
                        );
                      }}
                    />
                    <span className="text-white/40">:</span>
                    <input
                      type="number"
                      min={0}
                      className="rounded-xl border border-white/10 bg-white/10 p-3 text-center text-lg font-semibold text-white focus:border-orange-400 focus:outline-none"
                      value={set.teamB}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSets((prev) =>
                          prev.map((item, idx) =>
                            idx === index ? { ...item, teamB: value } : item
                          )
                        );
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {sets.length < 5 ? (
              <div className="mt-4">
                <button
                  type="button"
                  className="text-sm font-semibold text-orange-300 hover:text-orange-200"
                  onClick={handleAddSet}
                >
                  + Ajouter un set
                </button>
              </div>
            ) : null}

            {error ? <div className="mt-4 text-sm text-rose-300">{error}</div> : null}

            <div className="mt-8 flex gap-3">
              <Button type="button" className="flex-1" onClick={handleSave} disabled={isPending}>
                Enregistrer
              </Button>
              <Button type="button" variant="secondary" className="flex-1" onClick={handleCloseModal}>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
