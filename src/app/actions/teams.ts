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
