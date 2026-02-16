"use server";

import { revalidatePath } from "next/cache";
import { assertAdminToken } from "@/lib/admin";
import { getDatabaseClient } from "@/lib/database";

export async function createTeamAction(
  tournamentId: string,
  adminToken: string
): Promise<{ id: string } | null> {
  assertAdminToken(adminToken);
  const database = getDatabaseClient();
  const rows = await database<Array<{ id: string }>>`
    insert into teams (tournament_id)
    values (${tournamentId})
    returning id
  `;
  revalidatePath("/tournaments");
  return rows[0] ?? null;
}

export async function deleteTeamAction(
  teamId: string,
  adminToken: string
): Promise<void> {
  assertAdminToken(adminToken);
  const database = getDatabaseClient();
  await database`
    delete from teams
    where id = ${teamId}
  `;
  revalidatePath("/tournaments");
}

export async function updateTeamNameAction(
  teamId: string,
  name: string,
  adminToken: string
): Promise<void> {
  assertAdminToken(adminToken);
  const database = getDatabaseClient();
  await database`
    update teams
    set name = ${name || null}
    where id = ${teamId}
  `;
  revalidatePath("/tournaments");
}

export async function assignPlayerToTeamAction(
  teamId: string,
  playerId: string,
  adminToken: string
): Promise<void> {
  assertAdminToken(adminToken);
  const database = getDatabaseClient();

  const counts = await database<Array<{ count: number }>>`
    select count(*)::int as count
    from team_players
    where team_id = ${teamId}
  `;

  if ((counts[0]?.count ?? 0) >= 2) {
    throw new Error("Team is full");
  }

  await database`
    delete from team_players
    where player_id = ${playerId}
  `;

  await database`
    insert into team_players (team_id, player_id)
    values (${teamId}, ${playerId})
  `;

  revalidatePath("/tournaments");
}

export async function removePlayerFromTeamAction(
  playerId: string,
  adminToken: string
): Promise<void> {
  assertAdminToken(adminToken);
  const database = getDatabaseClient();
  await database`
    delete from team_players
    where player_id = ${playerId}
  `;
  revalidatePath("/tournaments");
}

export async function toggleTeamSeededAction(
  teamId: string,
  tournamentId: string,
  adminToken: string
): Promise<{ success: boolean; error?: string; isSeeded?: boolean }> {
  try {
    assertAdminToken(adminToken);
    const database = getDatabaseClient();

    const [tournament] = await database<
      Array<{ id: string; config: { pools_count?: number; poolsCount?: number } | null }>
    >`
      select id, config
      from tournaments
      where id = ${tournamentId}
      limit 1
    `;

    if (!tournament?.id) {
      return { success: false, error: "Tournoi introuvable." };
    }

    const [team] = await database<
      Array<{ id: string; is_seeded: boolean | null; player_count: number }>
    >`
      select
        t.id,
        t.is_seeded,
        count(tp.player_id)::int as player_count
      from teams t
      left join team_players tp on t.id = tp.team_id
      where t.id = ${teamId} and t.tournament_id = ${tournamentId}
      group by t.id, t.is_seeded
    `;

    if (!team?.id) {
      return { success: false, error: "Équipe non trouvée." };
    }

    const currentSeeded = Boolean(team.is_seeded);

    if (!currentSeeded && team.player_count < 2) {
      return {
        success: false,
        error: "Équipe incomplète. Ajoutez 2 joueurs avant de la désigner comme tête de série.",
      };
    }

    if (!currentSeeded) {
      const [seededCountRow] = await database<Array<{ count: number }>>`
        select count(*)::int as count
        from teams
        where tournament_id = ${tournamentId} and is_seeded = true
      `;

      const seededCount = seededCountRow?.count ?? 0;
      const poolsCount =
        tournament.config?.pools_count ?? tournament.config?.poolsCount ?? 4;

      if (seededCount >= poolsCount) {
        return {
          success: false,
          error: `Limite atteinte : ${poolsCount} têtes de série maximum (nombre de poules)`,
        };
      }
    }

    const nextSeeded = !currentSeeded;

    await database`
      update teams
      set is_seeded = ${nextSeeded}
      where id = ${teamId}
    `;

    revalidatePath("/tournaments");
    return { success: true, isSeeded: nextSeeded };
  } catch (error) {
    console.error("[toggleTeamSeededAction] error:", error);
    return { success: false, error: "Erreur serveur" };
  }
}
