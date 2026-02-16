"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type {
  Pool,
  PoolTeam,
  RegistrationWithPlayer,
  Team,
  TeamPlayer,
  Tournament,
} from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";
import {
  assignPlayerToTeamAction,
  createTeamAction,
  deleteTeamAction,
  removePlayerFromTeamAction,
  updateTeamNameAction,
} from "@/app/actions/teams";
import {
  assignTeamToPoolAction,
  ensurePoolsAction,
  removeTeamFromPoolAction,
  updatePoolNameAction,
} from "@/app/actions/pools";

type TournamentConfigAdminProps = {
  tournament: Tournament;
  adminToken: string;
  registrations: RegistrationWithPlayer[];
  teams: Team[];
  teamPlayers: TeamPlayer[];
  pools: Pool[];
  poolTeams: PoolTeam[];
};

type PlayerItem = RegistrationWithPlayer["player"];


type DroppableProps = {
  id: string;
  className?: string;
  children: React.ReactNode;
};

const DroppableArea = ({ id, className, children }: DroppableProps) => {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`${className ?? ""} ${isOver ? "ring-2 ring-brand-violet" : ""}`}
    >
      {children}
    </div>
  );
};

type DraggableProps = {
  id: string;
  className?: string;
  children: React.ReactNode;
};

const DraggableItem = ({ id, className, children }: DraggableProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${className ?? ""} ${isDragging ? "opacity-70" : ""}`}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
};

type TournamentConfigContentProps = {
  adminToken: string;
  tournament: Tournament;
  registrations: RegistrationWithPlayer[];
  teams: Team[];
  teamPlayers: TeamPlayer[];
  pools: Pool[];
  poolTeams: PoolTeam[];
  mode?: "teams" | "pools";
};

export function TournamentConfigContent({
  tournament,
  adminToken,
  registrations,
  teams,
  teamPlayers,
  pools,
  poolTeams,
  mode = "teams",
}: TournamentConfigContentProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [localTeams, setLocalTeams] = useState<Team[]>(teams);
  const [localTeamPlayers, setLocalTeamPlayers] = useState<TeamPlayer[]>(teamPlayers);
  const [localPools, setLocalPools] = useState<Pool[]>(pools);
  const [localPoolTeams, setLocalPoolTeams] = useState<PoolTeam[]>(poolTeams);
  const [isEnsuringPools, setIsEnsuringPools] = useState(false);
  const router = useRouter();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const approvedPlayers = useMemo(() => registrations.map((r) => r.player), [registrations]);

  const teamPlayerMap = useMemo(() => {
    const map = new Map<string, string[]>();
    localTeamPlayers.forEach((tp) => {
      map.set(tp.team_id, [...(map.get(tp.team_id) ?? []), tp.player_id]);
    });
    return map;
  }, [localTeamPlayers]);

  const playerById = useMemo(() => {
    const map = new Map<string, PlayerItem>();
    approvedPlayers.forEach((player) => map.set(player.id, player));
    return map;
  }, [approvedPlayers]);

  const assignedPlayerIds = useMemo(
    () => new Set(localTeamPlayers.map((tp) => tp.player_id)),
    [localTeamPlayers]
  );

  const unassignedPlayers = useMemo(
    () => approvedPlayers.filter((player) => !assignedPlayerIds.has(player.id)),
    [approvedPlayers, assignedPlayerIds]
  );

  const teamIdsByPool = useMemo(() => {
    const map = new Map<string, string[]>();
    localPoolTeams.forEach((pt) => {
      map.set(pt.pool_id, [...(map.get(pt.pool_id) ?? []), pt.team_id]);
    });
    return map;
  }, [localPoolTeams]);

  const unassignedTeams = useMemo(() => {
    const assignedTeams = new Set(localPoolTeams.map((pt) => pt.team_id));
    return localTeams.filter((team) => !assignedTeams.has(team.id));
  }, [localTeams, localPoolTeams]);

  const completeTeamIds = useMemo(() => {
    const set = new Set<string>();
    localTeams.forEach((team) => {
      if ((teamPlayerMap.get(team.id)?.length ?? 0) >= 2) {
        set.add(team.id);
      }
    });
    return set;
  }, [localTeams, teamPlayerMap]);

  const poolsCount = Number(
    tournament.config?.pools_count ??
      (tournament.config as { poolsCount?: number } | null | undefined)?.poolsCount ??
      4
  );


  useEffect(() => {
    console.info("[tournament-admin] pools config", {
      tournamentId: tournament.id,
      poolsCount,
      localPools: localPools.length,
    });
  }, [localPools.length, poolsCount, tournament.id]);

  useEffect(() => {
    const ensure = async () => {
      if (poolsCount <= 0) return;
      if (localPools.length >= poolsCount) return;
      if (isEnsuringPools) return;
      setIsEnsuringPools(true);
      await ensurePoolsAction(tournament.id, poolsCount, adminToken);
      router.refresh();
      setIsEnsuringPools(false);
    };
    void ensure();
  }, [adminToken, isEnsuringPools, localPools.length, poolsCount, router, tournament.id]);

  useEffect(() => {
    console.info("[tournament-admin] players", {
      approved: approvedPlayers.length,
      unassigned: unassignedPlayers.length,
      teams: localTeams.length,
    });
  }, [approvedPlayers.length, localTeams.length, unassignedPlayers.length]);

  const handleCreateTeam = async () => {
    const created = await createTeamAction(tournament.id, adminToken);
    if (!created) return;
    setLocalTeams((prev) => [...prev, { id: created.id, tournament_id: tournament.id, name: null, created_at: "" }]);
    setToast("Équipe créée");
  };

  const handleDeleteTeam = async (teamId: string) => {
    await deleteTeamAction(teamId, adminToken);
    setLocalTeams((prev) => prev.filter((team) => team.id !== teamId));
    setLocalTeamPlayers((prev) => prev.filter((tp) => tp.team_id !== teamId));
    setLocalPoolTeams((prev) => prev.filter((pt) => pt.team_id !== teamId));
    setToast("Équipe supprimée");
  };

  const handleAssignPlayer = async (teamId: string, playerId: string) => {
    const currentCount = teamPlayerMap.get(teamId)?.length ?? 0;
    if (currentCount >= 2) {
      setToast("Équipe complète (2/2)");
      return;
    }

    await assignPlayerToTeamAction(teamId, playerId, adminToken);
    setLocalTeamPlayers((prev) => [
      ...prev.filter((tp) => tp.player_id !== playerId),
      { team_id: teamId, player_id: playerId, created_at: "" },
    ]);
    setToast("Joueur ajouté");
  };

  const handleRemovePlayer = async (playerId: string) => {
    await removePlayerFromTeamAction(playerId, adminToken);
    setLocalTeamPlayers((prev) => prev.filter((tp) => tp.player_id !== playerId));
    setToast("Joueur retiré");
  };

  const handleUpdateTeamName = async (teamId: string, name: string) => {
    await updateTeamNameAction(teamId, name, adminToken);
    setLocalTeams((prev) => prev.map((team) => (team.id === teamId ? { ...team, name } : team)));
  };

  const ensurePools = async () => {
    console.info("[tournament-admin] ensurePools click", {
      tournamentId: tournament.id,
      poolsCount,
      adminTokenPresent: Boolean(adminToken),
    });
    if (poolsCount <= 0) {
      console.warn("[tournament-admin] poolsCount invalid", { poolsCount });
      return;
    }
    await ensurePoolsAction(tournament.id, poolsCount, adminToken);
    console.info("[tournament-admin] ensurePools done");
  };

  const handleAssignTeamToPool = async (teamId: string, poolId: string) => {
    if (!completeTeamIds.has(teamId)) {
      setToast("Équipe incomplète (2/2 requis)");
      return;
    }
    await assignTeamToPoolAction(teamId, poolId, adminToken);
    setLocalPoolTeams((prev) => [
      ...prev.filter((pt) => pt.team_id !== teamId),
      { pool_id: poolId, team_id: teamId, created_at: "" },
    ]);
    setToast("Équipe assignée à la poule");
  };

  const handleRemoveTeamFromPool = async (teamId: string) => {
    await removeTeamFromPoolAction(teamId, adminToken);
    setLocalPoolTeams((prev) => prev.filter((pt) => pt.team_id !== teamId));
    setToast("Équipe retirée de la poule");
  };

  const handleUpdatePoolName = async (poolId: string, name: string) => {
    await updatePoolNameAction(poolId, name, adminToken);
    setLocalPools((prev) => prev.map((pool) => (pool.id === poolId ? { ...pool, name } : pool)));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith("player:")) {
      const playerId = activeId.replace("player:", "");
      if (overId === "drop:unassignedPlayers") {
        await handleRemovePlayer(playerId);
        return;
      }
      if (overId.startsWith("drop:team:")) {
        const teamId = overId.replace("drop:team:", "");
        await handleAssignPlayer(teamId, playerId);
      }
    }

    if (activeId.startsWith("team:")) {
      const teamId = activeId.replace("team:", "");
      if (overId === "drop:unassignedTeams") {
        await handleRemoveTeamFromPool(teamId);
        return;
      }
      if (overId.startsWith("drop:pool:")) {
        const poolId = overId.replace("drop:pool:", "");
        await handleAssignTeamToPool(teamId, poolId);
      }
    }
  };

  const getInitials = (player: PlayerItem) =>
    `${player.first_name?.[0] ?? ""}${player.last_name?.[0] ?? ""}`.toUpperCase() || "??";

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast} /> : null}
      {mode === "teams" ? (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <Card className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-5 text-white shadow-card">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 text-lg">
                  🎯
                </div>
                <div>
                  <p className="text-sm font-semibold">Joueurs disponibles</p>
                  <p className="text-xs text-white/60">À glisser dans les équipes</p>
                </div>
                <span className="ml-auto text-xs font-semibold text-white/60">
                  {unassignedPlayers.length}
                </span>
              </div>
              <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
                <DroppableArea id="drop:unassignedPlayers" className="space-y-2">
                  {unassignedPlayers.map((player) => (
                    <DraggableItem
                      key={player.id}
                      id={`player:${player.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs transition hover:translate-x-1 hover:border-violet-300/60 hover:bg-violet-500/15"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 text-xs font-semibold">
                          {getInitials(player)}
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-xs font-semibold">
                            {player.first_name} {player.last_name}
                          </span>
                          {player.pair_with ? (
                            <span className="block text-[10px] text-white/60">
                              Binôme : {player.pair_with}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span className="text-base text-white/30">⋮⋮</span>
                    </DraggableItem>
                  ))}
                  {!unassignedPlayers.length ? (
                    <p className="text-xs text-white/60">Tous les joueurs sont assignés.</p>
                  ) : null}
                </DroppableArea>
              </div>
            </Card>

            <Card className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="bg-gradient-to-br from-orange-400 to-amber-200 bg-clip-text text-sm font-semibold text-transparent">
                  Équipes du tournoi
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-none bg-gradient-to-br from-orange-400 to-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:translate-y-[-1px] hover:shadow-lg"
                  onClick={handleCreateTeam}
                >
                  Créer une équipe
                </Button>
              </div>
              <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {localTeams.map((team) => {
                    const players = teamPlayerMap.get(team.id) ?? [];
                    const isComplete = players.length >= 2;
                    return (
                      <div
                        key={team.id}
                        className={`rounded-2xl border p-4 transition ${
                          isComplete
                            ? "border-emerald-400/40 bg-emerald-500/5"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white placeholder:text-white/30 focus:border-orange-400 focus:outline-none"
                            placeholder="Nom de l’équipe"
                            defaultValue={team.name ?? ""}
                            onBlur={(event) => handleUpdateTeamName(team.id, event.target.value)}
                          />
                          {players.length === 0 ? (
                            <button
                              type="button"
                              className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
                              onClick={() => handleDeleteTeam(team.id)}
                            >
                              ✕
                            </button>
                          ) : null}
                        </div>
                        <DroppableArea
                          id={`drop:team:${team.id}`}
                          className="mt-3 space-y-2 rounded-xl border border-dashed border-white/15 bg-white/5 p-3"
                        >
                          {[0, 1].map((slot) => {
                            const playerId = players[slot];
                            const player = playerId ? playerById.get(playerId) : null;
                            return (
                              <div
                                key={`${team.id}-${slot}`}
                                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs ${
                                  player
                                    ? "border border-emerald-400/30 bg-emerald-500/10"
                                    : "border border-white/10 bg-white/5"
                                }`}
                              >
                                {player ? (
                                  <DraggableItem id={`player:${player.id}`} className="flex flex-1 items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-violet-600 text-[10px] font-semibold">
                                      {getInitials(player)}
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="block text-xs font-semibold">
                                        {player.first_name} {player.last_name}
                                      </span>
                                      {player.pair_with ? (
                                        <span className="block text-[10px] text-white/60">
                                          Binôme : {player.pair_with}
                                        </span>
                                      ) : null}
                                    </div>
                                  </DraggableItem>
                                ) : (
                                  <span className="text-xs text-white/40">Glissez un joueur ici...</span>
                                )}
                              </div>
                            );
                          })}
                        </DroppableArea>
                        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                          {isComplete ? (
                            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
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
            </Card>
          </div>
        </DndContext>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="bg-gradient-to-br from-orange-400 to-amber-200 bg-clip-text text-lg font-semibold text-transparent">
                Répartition des poules
              </p>
              <p className="text-xs text-white/60">
                Glissez-déposez les équipes complètes dans les poules
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-none bg-gradient-to-br from-violet-400 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:translate-y-[-1px] hover:shadow-lg"
              onClick={ensurePools}
              disabled={isEnsuringPools}
            >
              Générer les poules
            </Button>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
            <Card className="sticky top-6 h-fit rounded-2xl border border-orange-400/30 bg-orange-500/10 p-5 text-white shadow-card">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 text-lg">
                  👥
                </div>
                <div>
                  <p className="text-sm font-semibold">Équipes complètes</p>
                  <p className="text-xs text-white/60">À répartir</p>
                </div>
                <span className="ml-auto text-xs font-semibold text-white/60">
                  {unassignedTeams.length}
                </span>
              </div>
              <DroppableArea id="drop:unassignedTeams" className="mt-4 space-y-2">
                {unassignedTeams.map((team) => (
                  <DraggableItem
                    key={team.id}
                    id={`team:${team.id}`}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs transition hover:translate-x-1 hover:border-orange-300/50 hover:bg-orange-500/10"
                  >
                    <span className="float-right text-base text-white/30">⋮⋮</span>
                    <p className="font-semibold text-white">{team.name || "Équipe"}</p>
                    <p className="text-white/60">
                      {(teamPlayerMap.get(team.id) ?? [])
                        .map((playerId) => {
                          const player = playerById.get(playerId);
                          if (!player) return "";
                          return player.pair_with
                            ? `${player.first_name} ${player.last_name} (Binôme : ${player.pair_with})`
                            : `${player.first_name} ${player.last_name}`;
                        })
                        .filter(Boolean)
                        .join(" / ")}
                    </p>
                  </DraggableItem>
                ))}
              </DroppableArea>
            </Card>

            <div className="grid gap-5 md:grid-cols-2">
              {localPools.map((pool, index) => {
                const teamIds = teamIdsByPool.get(pool.id) ?? [];
                const teamsCount = teamIds.length;
                const isReady = teamsCount > 0;
                const borderVariants = [
                  "border-orange-400/40",
                  "border-emerald-400/40",
                  "border-violet-400/40",
                  "border-amber-300/40",
                ];
                return (
                  <Card
                    key={pool.id}
                    className={`rounded-2xl border bg-white/5 p-4 text-white shadow-card ${
                      borderVariants[index % borderVariants.length]
                    }`}
                  >
                    <div className="mb-3">
                      <input
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white placeholder:text-white/30 focus:border-orange-400 focus:outline-none"
                        defaultValue={pool.name}
                        onBlur={(event) => handleUpdatePoolName(pool.id, event.target.value)}
                        placeholder="Nom de la poule"
                      />
                    </div>
                    <DroppableArea
                      id={`drop:pool:${pool.id}`}
                      className={`min-h-[160px] space-y-2 rounded-xl border border-dashed border-white/15 bg-white/5 p-3 ${
                        teamsCount === 0 ? "flex items-center justify-center" : ""
                      }`}
                    >
                      {teamIds.length === 0 ? (
                        <p className="text-xs text-white/30">Glissez les équipes ici...</p>
                      ) : (
                        teamIds.map((teamId) => {
                          const team = localTeams.find((item) => item.id === teamId);
                          if (!team) return null;
                          return (
                            <DraggableItem
                              key={team.id}
                              id={`team:${team.id}`}
                              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs transition hover:border-white/30 hover:bg-white/10"
                            >
                              <p className="font-semibold text-white">{team.name || "Équipe"}</p>
                              <p className="text-white/60">
                                {(teamPlayerMap.get(team.id) ?? [])
                                  .map((playerId) => {
                                    const player = playerById.get(playerId);
                                    if (!player) return "";
                                    return player.pair_with
                                      ? `${player.first_name} ${player.last_name} (Binôme : ${player.pair_with})`
                                      : `${player.first_name} ${player.last_name}`;
                                  })
                                  .filter(Boolean)
                                  .join(" / ")}
                              </p>
                            </DraggableItem>
                          );
                        })
                      )}
                    </DroppableArea>
                    <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                      <span className="text-xs text-white/60">
                        {teamsCount} équipe{teamsCount > 1 ? "s" : ""}
                      </span>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                          isReady ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-400/20 text-amber-200"
                        }`}
                      >
                        {isReady ? "Prête" : teamsCount === 0 ? "Vide" : "Incomplète"}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </DndContext>
      )}
    </div>
  );
}

export function TournamentConfigAdmin(props: TournamentConfigAdminProps) {
  return <TournamentConfigContent {...props} />;
}
