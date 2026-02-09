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
