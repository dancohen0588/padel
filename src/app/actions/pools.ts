"use server";

import { revalidatePath } from "next/cache";
import { assertAdminToken } from "@/lib/admin";
import { getDatabaseClient } from "@/lib/database";

export async function ensurePoolsAction(
  tournamentId: string,
  poolCount: number,
  adminToken: string
): Promise<void> {
  console.info("[pools] ensurePoolsAction", { tournamentId, poolCount });
  assertAdminToken(adminToken);
  const database = getDatabaseClient();

  const existing = await database<Array<{ id: string }>>`
    select id
    from pools
    where tournament_id = ${tournamentId}
  `;

  if (existing.length >= poolCount) {
    console.info("[pools] ensurePoolsAction skip", {
      existing: existing.length,
      poolCount,
    });
    return;
  }

  const missing = Math.max(poolCount - existing.length, 0);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let index = 0; index < missing; index += 1) {
    const order = existing.length + index + 1;
    const name = `Poule ${alphabet[index] ?? order}`;
    await database`
      insert into pools (tournament_id, name, pool_order)
      values (${tournamentId}, ${name}, ${order})
    `;
  }

  revalidatePath("/tournaments");
  console.info("[pools] ensurePoolsAction done", { created: missing });
}

export async function updatePoolNameAction(
  poolId: string,
  name: string,
  adminToken: string
): Promise<void> {
  assertAdminToken(adminToken);
  const database = getDatabaseClient();
  await database`
    update pools
    set name = ${name}
    where id = ${poolId}
  `;
  revalidatePath("/tournaments");
}

export async function assignTeamToPoolAction(
  teamId: string,
  poolId: string,
  adminToken: string
): Promise<void> {
  assertAdminToken(adminToken);
  const database = getDatabaseClient();

  await database`
    delete from pool_teams
    where team_id = ${teamId}
  `;

  await database`
    insert into pool_teams (pool_id, team_id)
    values (${poolId}, ${teamId})
  `;

  revalidatePath("/tournaments");
}

export async function removeTeamFromPoolAction(
  teamId: string,
  adminToken: string
): Promise<void> {
  assertAdminToken(adminToken);
  const database = getDatabaseClient();
  await database`
    delete from pool_teams
    where team_id = ${teamId}
  `;
  revalidatePath("/tournaments");
}

export async function fillPoolsAction(
  tournamentId: string,
  adminToken: string
): Promise<{ poolTeams: Array<{ pool_id: string; team_id: string }> }> {
  assertAdminToken(adminToken);
  const database = getDatabaseClient();

  const pools = await database<Array<{ id: string }>>`
    select id from pools
    where tournament_id = ${tournamentId}
    order by pool_order asc
  `;

  if (pools.length === 0) return { poolTeams: [] };

  const teams = await database<Array<{ id: string }>>`
    select t.id
    from teams t
    where t.tournament_id = ${tournamentId}
      and (select count(*) from team_players tp where tp.team_id = t.id) >= 2
    order by t.is_seeded desc, t.created_at asc
  `;

  if (teams.length === 0) return { poolTeams: [] };

  await database`
    delete from pool_teams
    where pool_id in (select id from pools where tournament_id = ${tournamentId})
  `;

  const newPoolTeams: Array<{ pool_id: string; team_id: string }> = [];
  for (let i = 0; i < teams.length; i++) {
    const pool = pools[i % pools.length];
    await database`
      insert into pool_teams (pool_id, team_id)
      values (${pool.id}, ${teams[i].id})
    `;
    newPoolTeams.push({ pool_id: pool.id, team_id: teams[i].id });
  }

  revalidatePath("/tournaments");
  return { poolTeams: newPoolTeams };
}

export async function clearPoolsAction(
  tournamentId: string,
  adminToken: string
): Promise<void> {
  assertAdminToken(adminToken);
  const database = getDatabaseClient();
  await database`
    delete from pool_teams
    where pool_id in (select id from pools where tournament_id = ${tournamentId})
  `;
  revalidatePath("/tournaments");
}
