"use server";

import { revalidatePath } from "next/cache";
import { assertAdminToken } from "@/lib/admin";
import { getDatabaseClient } from "@/lib/database";

const maxSets = 5;

type SetInput = {
  teamA: number;
  teamB: number;
};

const computeAggregates = (sets: SetInput[]) => {
  let setsWonA = 0;
  let setsWonB = 0;
  let gamesWonA = 0;
  let gamesWonB = 0;

  sets.forEach((set) => {
    gamesWonA += set.teamA;
    gamesWonB += set.teamB;
    if (set.teamA > set.teamB) {
      setsWonA += 1;
    } else if (set.teamB > set.teamA) {
      setsWonB += 1;
    }
  });

  return {
    setsWonA,
    setsWonB,
    gamesWonA,
    gamesWonB,
  };
};

const ensureValidSets = (sets: SetInput[]) => {
  if (sets.length === 0 || sets.length > maxSets) {
    throw new Error("Nombre de sets invalide");
  }
  sets.forEach((set) => {
    if (!Number.isFinite(set.teamA) || !Number.isFinite(set.teamB)) {
      throw new Error("Score de set invalide");
    }
    if (set.teamA < 0 || set.teamB < 0) {
      throw new Error("Score négatif interdit");
    }
  });
};

export async function generatePoolMatchesAction(
  tournamentId: string,
  adminToken: string
): Promise<void> {
  assertAdminToken(adminToken);
  const database = getDatabaseClient();

  const pools = await database<Array<{ id: string }>>`
    select id from pools where tournament_id = ${tournamentId} order by pool_order asc
  `;

  for (const pool of pools) {
    const teams = await database<Array<{ team_id: string }>>`
      select team_id
      from pool_teams
      where pool_id = ${pool.id}
      order by created_at asc
    `;

    const teamIds = teams.map((row) => row.team_id);
    if (teamIds.length < 2) {
      continue;
    }

    for (let i = 0; i < teamIds.length; i += 1) {
      for (let j = i + 1; j < teamIds.length; j += 1) {
        const teamA = teamIds[i];
        const teamB = teamIds[j];
        const existing = await database<Array<{ id: string }>>`
          select id
          from matches
          where tournament_id = ${tournamentId}
            and pool_id = ${pool.id}
            and ((team_a_id = ${teamA} and team_b_id = ${teamB}) or (team_a_id = ${teamB} and team_b_id = ${teamA}))
          limit 1
        `;
        if (existing.length > 0) {
          continue;
        }

        await database`
          insert into matches (tournament_id, pool_id, team_a_id, team_b_id)
          values (${tournamentId}, ${pool.id}, ${teamA}, ${teamB})
        `;
      }
    }
  }

  revalidatePath("/tournaments");
}

export async function upsertMatchResultAction(
  matchId: string,
  sets: SetInput[],
  adminToken: string
): Promise<void> {
  assertAdminToken(adminToken);
  ensureValidSets(sets);
  const database = getDatabaseClient();
  const { setsWonA, setsWonB, gamesWonA, gamesWonB } = computeAggregates(sets);

  const matches = await database<Array<{ team_a_id: string; team_b_id: string }>>`
    select team_a_id, team_b_id
    from matches
    where id = ${matchId}
    limit 1
  `;

  if (!matches[0]) {
    throw new Error("Match introuvable");
  }

  const winnerId =
    setsWonA === setsWonB
      ? null
      : setsWonA > setsWonB
        ? matches[0].team_a_id
        : matches[0].team_b_id;

  await database`
    update matches
    set
      status = 'finished',
      winner_team_id = ${winnerId},
      sets_won_a = ${setsWonA},
      sets_won_b = ${setsWonB},
      games_won_a = ${gamesWonA},
      games_won_b = ${gamesWonB}
    where id = ${matchId}
  `;

  await database`
    delete from match_sets
    where match_id = ${matchId}
  `;

  for (let index = 0; index < sets.length; index += 1) {
    const set = sets[index];
    await database`
      insert into match_sets (match_id, set_order, team_a_games, team_b_games)
      values (${matchId}, ${index + 1}, ${set.teamA}, ${set.teamB})
    `;
  }

  revalidatePath("/tournaments");
}

export async function updateMatchStatusAction(
  matchId: string,
  status: "upcoming" | "live" | "finished",
  adminToken: string
): Promise<void> {
  assertAdminToken(adminToken);
  const database = getDatabaseClient();
  await database`
    update matches
    set status = ${status}
    where id = ${matchId}
  `;
  revalidatePath("/tournaments");
}
