"use client";

import { useMemo } from "react";
import type {
  Pool,
  PoolTeam,
  RegistrationWithPlayer,
  Team,
  TeamPlayer,
  Tournament,
} from "@/lib/types";

type TeamsReadOnlyViewProps = {
  tournament: Tournament;
  registrations: RegistrationWithPlayer[];
  teams: Team[];
  teamPlayers: TeamPlayer[];
  pools: Pool[];
  poolTeams: PoolTeam[];
};

const getInitials = (firstName?: string | null, lastName?: string | null) =>
  `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "??";

export function TeamsReadOnlyView({
  registrations,
  teams,
  teamPlayers,
  pools,
  poolTeams,
}: TeamsReadOnlyViewProps) {
  const playerById = useMemo(() => {
    const map = new Map<string, RegistrationWithPlayer["player"]>();
    registrations.forEach((registration) => map.set(registration.player.id, registration.player));
    return map;
  }, [registrations]);

  const teamPlayersMap = useMemo(() => {
    const map = new Map<string, string[]>();
    teamPlayers.forEach((tp) => {
      map.set(tp.team_id, [...(map.get(tp.team_id) ?? []), tp.player_id]);
    });
    return map;
  }, [teamPlayers]);

  const poolByTeamId = useMemo(() => {
    const map = new Map<string, Pool>();
    poolTeams.forEach((poolTeam) => {
      const pool = pools.find((item) => item.id === poolTeam.pool_id);
      if (pool) {
        map.set(poolTeam.team_id, pool);
      }
    });
    return map;
  }, [pools, poolTeams]);

  const totalPlayers = registrations.length;
  const completeTeams = teams.filter(
    (team) => (teamPlayersMap.get(team.id)?.length ?? 0) >= 2
  ).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-white">Équipes inscrites</p>
            <p className="text-xs text-white/60">Lecture seule • En attente du lancement du tournoi</p>
          </div>
          <div className="text-xs text-white/60">
            {totalPlayers} joueurs • {teams.length} équipes • {completeTeams} complètes
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team, index) => {
          const playerIds = teamPlayersMap.get(team.id) ?? [];
          const players = playerIds.map((id) => playerById.get(id)).filter(Boolean);
          const isComplete = players.length >= 2;
          const pool = poolByTeamId.get(team.id);
          return (
            <div
              key={team.id}
              className={`rounded-2xl border p-4 text-white transition hover:-translate-y-0.5 hover:border-orange-400/50 ${
                isComplete
                  ? "border-emerald-400/40 bg-emerald-500/5"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">
                  {team.name || `Équipe ${index + 1}`}
                </p>
                {pool ? (
                  <span className="rounded-full bg-violet-500/20 px-3 py-1 text-[10px] font-semibold text-violet-200">
                    {pool.name}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 space-y-2">
                {[0, 1].map((slot) => {
                  const player = players[slot];
                  return (
                    <div
                      key={`${team.id}-${slot}`}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs ${
                        player
                          ? "border border-white/10 bg-white/5"
                          : "border border-dashed border-white/10 bg-white/5 text-white/40"
                      }`}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 text-[10px] font-semibold text-white">
                        {player ? getInitials(player.first_name, player.last_name) : "—"}
                      </div>
                      <span className="text-xs font-semibold">
                        {player ? `${player.first_name} ${player.last_name}` : "En attente"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                {isComplete ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    Complète
                  </span>
                ) : (
                  <span className="text-xs text-white/50">{players.length}/2 joueurs</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
