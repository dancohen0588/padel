"use server";

import { revalidatePath } from "next/cache";
import { assertAdminToken } from "@/lib/admin";
import { getDatabaseClient } from "@/lib/database";
import type { TournamentConfig } from "@/lib/types";

type PlayoffSetInput = {
  team1_score: number;
  team2_score: number;
};

const maxPlayoffSets = 3;

type PoolStandingRow = {
  team_id: string;
  team_name: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  sets_for: number;
  sets_against: number;
  games_for: number;
  games_against: number;
  set_diff: number;
  game_diff: number;
  points: number;
  pool_id: string;
  pool_rank: number;
};

type SeededTeam = {
  team_id: string;
  team_name: string | null;
  pool_rank: number;
  points: number;
  set_diff: number;
  game_diff: number;
  seed: number;
};

const ensureValidPadelSet = (set: PlayoffSetInput) => {
  const maxScore = Math.max(set.team1_score, set.team2_score);
  const minScore = Math.min(set.team1_score, set.team2_score);
  if (maxScore < 6) {
    throw new Error("Un set doit aller au moins jusqu'à 6 jeux.");
  }
  const diff = maxScore - minScore;
  const isValidStandard = maxScore === 6 && diff >= 2;
  const isValidExtended = maxScore === 7 && (diff === 2 || diff === 1);
  if (!isValidStandard && !isValidExtended) {
    throw new Error("Score de set invalide (règles padel).");
  }
};

const ensureValidPadelSets = (sets: PlayoffSetInput[]) => {
  if (sets.length === 0 || sets.length > maxPlayoffSets) {
    throw new Error("Nombre de sets invalide");
  }
  sets.forEach((set) => {
    if (!Number.isFinite(set.team1_score) || !Number.isFinite(set.team2_score)) {
      throw new Error("Score de set invalide");
    }
    if (set.team1_score < 0 || set.team2_score < 0) {
      throw new Error("Score négatif interdit");
    }
    ensureValidPadelSet(set);
  });
};

const roundNameByTeams = (teamsRemaining: number) => {
  const mapping: Record<number, string> = {
    32: "16èmes de finale",
    16: "8èmes de finale",
    8: "Quarts de finale",
    4: "Demi-finales",
    2: "Finale",
  };

  return mapping[teamsRemaining] ?? `Round ${teamsRemaining}`;
};

/**
 * Calcule le seed correct pour un match dans un bracket March Madness.
 */
const getBracketSeed = (
  matchIndex: number,
  totalQualified: number,
  position: "team1" | "team2"
): number => {
  const totalMatches = totalQualified / 2;
  const halfMatches = totalMatches / 2;
  const isLeftSide = matchIndex < halfMatches;

  if (isLeftSide) {
    const groupIndex = Math.floor(matchIndex / 2);
    const isFirstInGroup = matchIndex % 2 === 0;
    if (position === "team1") {
      return isFirstInGroup ? 4 * groupIndex + 1 : 4 * groupIndex + 4;
    }
    return isFirstInGroup
      ? totalQualified - 4 * groupIndex
      : totalQualified - (4 * groupIndex + 3);
  }

  const rightIndex = matchIndex - halfMatches;
  const groupIndex = Math.floor(rightIndex / 2);
  const isFirstInGroup = rightIndex % 2 === 0;
  if (position === "team1") {
    return isFirstInGroup ? 4 * groupIndex + 2 : 4 * groupIndex + 3;
  }
  return isFirstInGroup
    ? totalQualified - 1 - 4 * groupIndex
    : totalQualified - 2 - 4 * groupIndex;
};

const sortStandings = (standings: PoolStandingRow[]) =>
  [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.set_diff !== a.set_diff) return b.set_diff - a.set_diff;
    if (b.game_diff !== a.game_diff) return b.game_diff - a.game_diff;
    return (a.team_name ?? "").localeCompare(b.team_name ?? "");
  });

const computePoolStandings = (
  poolId: string,
  teams: Array<{ id: string; name: string | null }>,
  matches: Array<{
    pool_id: string | null;
    team_a_id: string;
    team_b_id: string;
    status: string;
    sets_won_a: number;
    sets_won_b: number;
    games_won_a: number;
    games_won_b: number;
  }>
): PoolStandingRow[] => {
  const standings = new Map<string, PoolStandingRow>();
  teams.forEach((team) => {
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
      pool_id: poolId,
      pool_rank: 0,
    });
  });

  matches.forEach((match) => {
    if (match.status !== "finished") {
      return;
    }
    const teamA = standings.get(match.team_a_id);
    const teamB = standings.get(match.team_b_id);
    if (!teamA || !teamB) {
      return;
    }

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

  const computed = Array.from(standings.values()).map((standing) => ({
    ...standing,
    set_diff: standing.sets_for - standing.sets_against,
    game_diff: standing.games_for - standing.games_against,
  }));

  const sorted = sortStandings(computed);
  return sorted.map((standing, index) => ({
    ...standing,
    pool_rank: index + 1,
  }));
};

const buildSeeds = (
  poolStandings: PoolStandingRow[],
  poolsCount: number,
  totalQualified: number
): SeededTeam[] => {
  if (totalQualified <= 0 || poolsCount <= 0) {
    return [];
  }

  const qualifiedPerPool = Math.floor(totalQualified / poolsCount);
  const remainder = totalQualified % poolsCount;
  const qualified: PoolStandingRow[] = [];
  const remaining: PoolStandingRow[] = [];

  const standingsByPool = poolStandings.reduce<Record<string, PoolStandingRow[]>>(
    (acc, standing) => {
      if (!acc[standing.pool_id]) {
        acc[standing.pool_id] = [];
      }
      acc[standing.pool_id].push(standing);
      return acc;
    },
    {}
  );

  Object.values(standingsByPool).forEach((standings) => {
    const sorted = sortStandings(standings);
    sorted.forEach((standing, index) => {
      if (index < qualifiedPerPool) {
        qualified.push({ ...standing, pool_rank: index + 1 });
      } else {
        remaining.push({ ...standing, pool_rank: index + 1 });
      }
    });
  });

  if (remainder > 0) {
    const wildcards = sortStandings(remaining).slice(0, remainder);
    qualified.push(...wildcards);
  }

  const byPoolRank = qualified.reduce<Record<number, PoolStandingRow[]>>(
    (acc, team) => {
      if (!acc[team.pool_rank]) {
        acc[team.pool_rank] = [];
      }
      acc[team.pool_rank].push(team);
      return acc;
    },
    {}
  );

  const seeded: SeededTeam[] = [];
  let seed = 1;
  Object.keys(byPoolRank)
    .map((value) => Number(value))
    .sort((a, b) => a - b)
    .forEach((rank) => {
      const group = sortStandings(byPoolRank[rank]);
      group.forEach((team) => {
        seeded.push({
          team_id: team.team_id,
          team_name: team.team_name,
          pool_rank: team.pool_rank,
          points: team.points,
          set_diff: team.set_diff,
          game_diff: team.game_diff,
          seed,
        });
        seed += 1;
      });
    });

  return seeded.slice(0, totalQualified);
};

export async function generateEmptyPlayoffBracket(
  tournamentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const database = getDatabaseClient();
    console.log("[playoffs] generateEmptyPlayoffBracket:start", {
      tournamentId,
    });
    const tournaments = await database<Array<{ config: TournamentConfig; slug: string | null }>>`
      select config, slug
      from tournaments
      where id = ${tournamentId}
      limit 1
    `;

    const tournament = tournaments[0];
    console.log("[playoffs] generateEmptyPlayoffBracket:tournament", {
      tournamentId,
      hasTournament: Boolean(tournament),
      playoffsEnabled: Boolean(tournament?.config?.playoffs?.enabled),
      teamsQualified: tournament?.config?.playoffs?.teams_qualified,
    });
    if (!tournament || !tournament.config?.playoffs?.enabled) {
      return { success: false, error: "Playoffs non activés pour ce tournoi." };
    }

    const totalQualified = tournament.config.playoffs.teams_qualified;
    console.log("[playoffs] generateEmptyPlayoffBracket:config", {
      tournamentId,
      totalQualified,
    });
    if (!Number.isFinite(totalQualified) || totalQualified < 2) {
      return { success: false, error: "Nombre d'équipes qualifiées invalide." };
    }
    if (totalQualified % 2 !== 0) {
      return { success: false, error: "Nombre d'équipes qualifiées doit être pair." };
    }
    if (!Number.isInteger(Math.log2(totalQualified))) {
      return { success: false, error: "Nombre d'équipes qualifiées doit être une puissance de 2." };
    }

    const existingRounds = await database<Array<{ id: string }>>`
      select id from playoff_rounds where tournament_id = ${tournamentId} and bracket_type = 'main' limit 1
    `;
    console.log("[playoffs] generateEmptyPlayoffBracket:existingRounds", {
      tournamentId,
      existingRoundsCount: existingRounds.length,
    });
    if (existingRounds.length > 0) {
      return { success: true };
    }

    let teamsRemaining = totalQualified;
    let roundNumber = 1;
    const rounds: Array<{ id: string; round_number: number; round_name: string; matchCount: number }> = [];

    while (teamsRemaining >= 2) {
      const matchCount = teamsRemaining / 2;
      console.log("[playoffs] generateEmptyPlayoffBracket:roundCreate", {
        tournamentId,
        roundNumber,
        teamsRemaining,
        roundName: roundNameByTeams(teamsRemaining),
        matchCount,
      });
      const roundRows = await database<Array<{ id: string }>>`
        insert into playoff_rounds (tournament_id, round_number, round_name, bracket_type)
        values (${tournamentId}, ${roundNumber}, ${roundNameByTeams(teamsRemaining)}, 'main')
        returning id
      `;

      const roundId = roundRows[0]?.id;
      if (!roundId) {
        return { success: false, error: "Impossible de créer les rounds playoffs." };
      }

      rounds.push({
        id: roundId,
        round_number: roundNumber,
        round_name: roundNameByTeams(teamsRemaining),
        matchCount,
      });
      console.log("[playoffs] generateEmptyPlayoffBracket:roundCreated", {
        tournamentId,
        roundId,
        roundNumber,
        roundName: roundNameByTeams(teamsRemaining),
        matchCount,
      });
      teamsRemaining = teamsRemaining / 2;
      roundNumber += 1;
    }

    const matchesByRound: Array<Array<{ id: string }>> = [];
    for (let index = 0; index < rounds.length; index += 1) {
      const round = rounds[index];
      const matchCount = round.matchCount;
      const roundMatches: Array<{ id: string }> = [];

      for (let matchIndex = 0; matchIndex < matchCount; matchIndex += 1) {
        let team1Seed: number | null = null;
        let team2Seed: number | null = null;
        if (index === 0) {
          team1Seed = getBracketSeed(matchIndex, totalQualified, "team1");
          team2Seed = getBracketSeed(matchIndex, totalQualified, "team2");
        }
        if (index === 0) {
          console.log("[playoffs] generateEmptyPlayoffBracket:seedPair", {
            tournamentId,
            roundNumber: round.round_number,
            matchNumber: matchIndex + 1,
            team1Seed,
            team2Seed,
          });
        }
        const matchRows = await database<Array<{ id: string }>>`
          insert into playoff_matches (
            tournament_id,
            round_id,
            match_number,
            team1_id,
            team2_id,
            winner_id,
            team1_seed,
            team2_seed,
            status
          )
          values (
            ${tournamentId},
            ${round.id},
            ${matchIndex + 1},
            ${null},
            ${null},
            ${null},
            ${team1Seed},
            ${team2Seed},
            'upcoming'
          )
          returning id
        `;
        const matchId = matchRows[0]?.id;
        if (!matchId) {
          return { success: false, error: "Impossible de créer les matchs playoffs." };
        }
        roundMatches.push({ id: matchId });
      }

      matchesByRound.push(roundMatches);
    }

    for (let roundIndex = 0; roundIndex < matchesByRound.length - 1; roundIndex += 1) {
      const currentRoundMatches = matchesByRound[roundIndex];
      const nextRoundMatches = matchesByRound[roundIndex + 1];

      for (let matchIndex = 0; matchIndex < currentRoundMatches.length; matchIndex += 2) {
        const nextMatch = nextRoundMatches[Math.floor(matchIndex / 2)];
        const firstMatch = currentRoundMatches[matchIndex];
        const secondMatch = currentRoundMatches[matchIndex + 1];

        if (!nextMatch || !firstMatch || !secondMatch) {
          continue;
        }

        await database`
          update playoff_matches
          set next_match_id = ${nextMatch.id}, next_match_position = 1
          where id = ${firstMatch.id}
        `;
        await database`
          update playoff_matches
          set next_match_id = ${nextMatch.id}, next_match_position = 2
          where id = ${secondMatch.id}
        `;
      }
    }

    if (tournament.slug) {
      revalidatePath(`/tournaments/${tournament.slug}/admin`);
    }
    revalidatePath("/tournoi/en-cours");

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return { success: false, error: message };
  }
}

export async function updatePlayoffSeeding(
  tournamentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const database = getDatabaseClient();
    console.log("[playoffs] updatePlayoffSeeding:start", { tournamentId });
    const tournaments = await database<
      Array<{ config: TournamentConfig; slug: string | null }>
    >`
      select config, slug
      from tournaments
      where id = ${tournamentId}
      limit 1
    `;

    const tournament = tournaments[0];
    console.log("[playoffs] updatePlayoffSeeding:tournament", {
      tournamentId,
      hasTournament: Boolean(tournament),
      playoffsEnabled: Boolean(tournament?.config?.playoffs?.enabled),
      teamsQualified: tournament?.config?.playoffs?.teams_qualified,
    });
    if (!tournament?.config?.playoffs?.enabled) {
      return { success: false, error: "Playoffs non activés pour ce tournoi." };
    }

    const firstRoundMatches = await database<
      Array<{ id: string; team1_seed: number | null; team2_seed: number | null }>
    >`
      select id, team1_seed, team2_seed
      from playoff_matches
      where tournament_id = ${tournamentId}
        and team1_seed is not null
      order by match_number asc
    `;
    console.log("[playoffs] updatePlayoffSeeding:firstRoundMatches", {
      tournamentId,
      count: firstRoundMatches.length,
      seeds: firstRoundMatches.map((match) => ({
        id: match.id,
        team1_seed: match.team1_seed,
        team2_seed: match.team2_seed,
      })),
    });

    if (firstRoundMatches.length === 0) {
      return { success: false, error: "Bracket playoffs non généré." };
    }

    const [pools, poolTeams, teams, matches] = await Promise.all([
      database<Array<{ id: string }>>`
        select id from pools where tournament_id = ${tournamentId}
      `,
      database<Array<{ pool_id: string; team_id: string }>>`
        select pt.pool_id, pt.team_id
        from pool_teams pt
        join pools p on p.id = pt.pool_id
        where p.tournament_id = ${tournamentId}
      `,
      database<Array<{ id: string; name: string | null }>>`
        select id, name
        from teams
        where tournament_id = ${tournamentId}
      `,
      database<
        Array<{
          pool_id: string | null;
          team_a_id: string;
          team_b_id: string;
          status: string;
          sets_won_a: number;
          sets_won_b: number;
          games_won_a: number;
          games_won_b: number;
        }>
      >`
        select
          pool_id,
          team_a_id,
          team_b_id,
          status,
          sets_won_a,
          sets_won_b,
          games_won_a,
          games_won_b
        from matches
        where tournament_id = ${tournamentId}
      `,
    ]);
    console.log("[playoffs] updatePlayoffSeeding:poolData", {
      tournamentId,
      poolsCount: pools.length,
      poolTeamsCount: poolTeams.length,
      teamsCount: teams.length,
      matchesCount: matches.length,
    });

    const poolStandings: PoolStandingRow[] = [];
    pools.forEach((pool) => {
      const teamIds = new Set(
        poolTeams
          .filter((pt) => pt.pool_id === pool.id)
          .map((pt) => pt.team_id)
      );
      const teamsInPool = teams.filter((team) => teamIds.has(team.id));
      const matchesInPool = matches.filter((match) => match.pool_id === pool.id);
      poolStandings.push(...computePoolStandings(pool.id, teamsInPool, matchesInPool));
    });

    const totalQualified = tournament.config.playoffs.teams_qualified;
    const seeds = buildSeeds(poolStandings, pools.length, totalQualified);
    console.log("[playoffs] updatePlayoffSeeding:seeds", {
      tournamentId,
      totalQualified,
      poolStandingsCount: poolStandings.length,
      seedsCount: seeds.length,
      seeds: seeds.map((seed) => ({
        seed: seed.seed,
        team_id: seed.team_id,
        team_name: seed.team_name,
        pool_rank: seed.pool_rank,
      })),
    });

    const seededByNumber = new Map(seeds.map((seeded) => [seeded.seed, seeded]));
    for (const match of firstRoundMatches) {
      const team1 = match.team1_seed ? seededByNumber.get(match.team1_seed) : null;
      const team2 = match.team2_seed ? seededByNumber.get(match.team2_seed) : null;

      await database`
        update playoff_matches
        set
          team1_id = ${team1?.team_id ?? null},
          team2_id = ${team2?.team_id ?? null}
        where id = ${match.id}
      `;
    }

    if (tournament.slug) {
      revalidatePath(`/tournaments/${tournament.slug}/admin`);
    }
    revalidatePath("/tournoi/en-cours");

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return { success: false, error: message };
  }
}

export async function regeneratePlayoffBracketAction(
  tournamentId: string,
  adminToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    assertAdminToken(adminToken);
    const database = getDatabaseClient();

    await database`
      delete from playoff_sets
      where match_id in (
        select pm.id from playoff_matches pm
        join playoff_rounds pr on pr.id = pm.round_id
        where pm.tournament_id = ${tournamentId} and pr.bracket_type = 'main'
      )
    `;
    await database`
      delete from playoff_matches
      where round_id in (
        select id from playoff_rounds where tournament_id = ${tournamentId} and bracket_type = 'main'
      )
    `;
    await database`
      delete from playoff_rounds where tournament_id = ${tournamentId} and bracket_type = 'main'
    `;

    const generated = await generateEmptyPlayoffBracket(tournamentId);
    if (!generated.success) {
      return generated;
    }

    const seeded = await updatePlayoffSeeding(tournamentId);
    if (!seeded.success) {
      return seeded;
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return { success: false, error: message };
  }
}

export async function overridePlayoffTeamAction(
  matchId: string,
  position: "team1" | "team2",
  newTeamId: string,
  adminToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    assertAdminToken(adminToken);
    const database = getDatabaseClient();

    const matches = await database<Array<{ tournament_id: string }>>`
      SELECT tournament_id FROM playoff_matches WHERE id = ${matchId} LIMIT 1
    `;
    if (!matches[0]) {
      return { success: false, error: "Match introuvable" };
    }

    const tournamentId = matches[0].tournament_id;

    if (position === "team1") {
      await database`UPDATE playoff_matches SET team1_id = ${newTeamId} WHERE id = ${matchId}`;
    } else {
      await database`UPDATE playoff_matches SET team2_id = ${newTeamId} WHERE id = ${matchId}`;
    }

    const tournaments = await database<Array<{ slug: string | null }>>`
      SELECT slug FROM tournaments WHERE id = ${tournamentId} LIMIT 1
    `;
    const slug = tournaments[0]?.slug;
    if (slug) {
      revalidatePath(`/tournaments/${slug}/admin`);
    }
    revalidatePath("/tournoi/en-cours");

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return { success: false, error: message };
  }
}

export async function updatePlayoffMatchScoreAction(
  matchId: string,
  sets: PlayoffSetInput[],
  adminToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (adminToken) {
      assertAdminToken(adminToken);
    }

    ensureValidPadelSets(sets);
    const database = getDatabaseClient();

    const matches = await database<
      Array<{
        id: string;
        tournament_id: string;
        team1_id: string | null;
        team2_id: string | null;
        next_match_id: string | null;
        next_match_position: number | null;
      }>
    >`
      select
        id,
        tournament_id,
        team1_id,
        team2_id,
        next_match_id,
        next_match_position
      from playoff_matches
      where id = ${matchId}
      limit 1
    `;

    const match = matches[0];
    if (!match) {
      return { success: false, error: "Match introuvable" };
    }
    if (!match.team1_id || !match.team2_id) {
      return { success: false, error: "Les équipes du match ne sont pas définies." };
    }

    const tournaments = await database<Array<{ status: string; slug: string | null }>>`
      select status, slug
      from tournaments
      where id = ${match.tournament_id}
      limit 1
    `;

    if (tournaments[0]?.status === "archived") {
      return { success: false, error: "Tournoi archivé : modification interdite." };
    }

    const team1Sets = sets.filter((set) => set.team1_score > set.team2_score).length;
    const team2Sets = sets.filter((set) => set.team2_score > set.team1_score).length;
    if (team1Sets === team2Sets) {
      return { success: false, error: "Il doit y avoir un gagnant en phases finales." };
    }

    const winnerId = team1Sets > team2Sets ? match.team1_id : match.team2_id;

    await database`
      update playoff_matches
      set winner_id = ${winnerId}, status = 'completed'
      where id = ${matchId}
    `;

    await database`
      delete from playoff_sets
      where match_id = ${matchId}
    `;

    for (let index = 0; index < sets.length; index += 1) {
      const set = sets[index];
      await database`
        insert into playoff_sets (match_id, set_number, team1_score, team2_score)
        values (${matchId}, ${index + 1}, ${set.team1_score}, ${set.team2_score})
      `;
    }

    if (match.next_match_id && match.next_match_position) {
      if (match.next_match_position === 1) {
        await database`
          update playoff_matches
          set team1_id = ${winnerId}
          where id = ${match.next_match_id}
        `;
      }
      if (match.next_match_position === 2) {
        await database`
          update playoff_matches
          set team2_id = ${winnerId}
          where id = ${match.next_match_id}
        `;
      }
    }

    const slug = tournaments[0]?.slug;
    if (slug) {
      revalidatePath(`/tournaments/${slug}/admin`);
    }
    revalidatePath("/tournoi/en-cours");

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return { success: false, error: message };
  }
}

// ─── Tableau consolante ───────────────────────────────────────────────────────

const consolationBracketSize = (nonQualifiedCount: number): number | null => {
  if (nonQualifiedCount >= 16) return 16;
  if (nonQualifiedCount >= 8) return 8;
  if (nonQualifiedCount >= 4) return 4;
  return null;
};

async function deleteConsolationBracket(tournamentId: string): Promise<void> {
  const database = getDatabaseClient();
  await database`
    delete from playoff_sets
    where match_id in (
      select pm.id from playoff_matches pm
      join playoff_rounds pr on pr.id = pm.round_id
      where pm.tournament_id = ${tournamentId} and pr.bracket_type = 'consolation'
    )
  `;
  await database`
    delete from playoff_matches
    where round_id in (
      select id from playoff_rounds where tournament_id = ${tournamentId} and bracket_type = 'consolation'
    )
  `;
  await database`
    delete from playoff_rounds where tournament_id = ${tournamentId} and bracket_type = 'consolation'
  `;
}

export async function generateConsolationBracketAction(
  tournamentId: string,
  adminToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    assertAdminToken(adminToken);
    const database = getDatabaseClient();

    const existingRounds = await database<Array<{ id: string }>>`
      select id from playoff_rounds
      where tournament_id = ${tournamentId} and bracket_type = 'consolation'
      limit 1
    `;
    if (existingRounds.length > 0) {
      return { success: false, error: "Le tableau consolante existe déjà. Supprimez-le d'abord." };
    }

    const mainFirstRound = await database<Array<{ team1_id: string | null; team2_id: string | null }>>`
      select pm.team1_id, pm.team2_id
      from playoff_matches pm
      join playoff_rounds pr on pr.id = pm.round_id
      where pm.tournament_id = ${tournamentId}
        and pr.bracket_type = 'main'
        and pm.team1_seed is not null
    `;
    const qualifiedIds = new Set<string>();
    mainFirstRound.forEach((m) => {
      if (m.team1_id) qualifiedIds.add(m.team1_id);
      if (m.team2_id) qualifiedIds.add(m.team2_id);
    });

    const allTeams = await database<Array<{ id: string; name: string | null }>>`
      select id, name from teams where tournament_id = ${tournamentId} order by name asc
    `;
    const nonQualified = allTeams.filter((t) => !qualifiedIds.has(t.id));

    const bracketSize = consolationBracketSize(nonQualified.length);
    if (!bracketSize) {
      return { success: false, error: "Pas assez d'équipes éliminées (minimum 4 requises)." };
    }

    const teamsForConsolation = nonQualified.slice(0, bracketSize);

    const tournaments = await database<Array<{ slug: string | null }>>`
      select slug from tournaments where id = ${tournamentId} limit 1
    `;

    let teamsRemaining = bracketSize;
    let roundNumber = 1;
    const rounds: Array<{ id: string; round_number: number; matchCount: number }> = [];

    while (teamsRemaining >= 2) {
      const matchCount = teamsRemaining / 2;
      const roundRows = await database<Array<{ id: string }>>`
        insert into playoff_rounds (tournament_id, round_number, round_name, bracket_type)
        values (${tournamentId}, ${roundNumber}, ${roundNameByTeams(teamsRemaining)}, 'consolation')
        returning id
      `;
      const roundId = roundRows[0]?.id;
      if (!roundId) return { success: false, error: "Impossible de créer les rounds consolante." };

      rounds.push({ id: roundId, round_number: roundNumber, matchCount });
      teamsRemaining = teamsRemaining / 2;
      roundNumber += 1;
    }

    const matchesByRound: Array<Array<{ id: string }>> = [];
    for (let i = 0; i < rounds.length; i += 1) {
      const round = rounds[i];
      const roundMatches: Array<{ id: string }> = [];

      for (let matchIndex = 0; matchIndex < round.matchCount; matchIndex += 1) {
        const team1Id = i === 0 ? (teamsForConsolation[matchIndex * 2]?.id ?? null) : null;
        const team2Id = i === 0 ? (teamsForConsolation[matchIndex * 2 + 1]?.id ?? null) : null;

        const matchRows = await database<Array<{ id: string }>>`
          insert into playoff_matches (tournament_id, round_id, match_number, team1_id, team2_id, winner_id, team1_seed, team2_seed, status)
          values (${tournamentId}, ${round.id}, ${matchIndex + 1}, ${team1Id}, ${team2Id}, ${null}, ${null}, ${null}, 'upcoming')
          returning id
        `;
        const matchId = matchRows[0]?.id;
        if (!matchId) return { success: false, error: "Impossible de créer les matchs consolante." };
        roundMatches.push({ id: matchId });
      }
      matchesByRound.push(roundMatches);
    }

    for (let roundIndex = 0; roundIndex < matchesByRound.length - 1; roundIndex += 1) {
      const currentRoundMatches = matchesByRound[roundIndex];
      const nextRoundMatches = matchesByRound[roundIndex + 1];

      for (let matchIndex = 0; matchIndex < currentRoundMatches.length; matchIndex += 2) {
        const nextMatch = nextRoundMatches[Math.floor(matchIndex / 2)];
        const firstMatch = currentRoundMatches[matchIndex];
        const secondMatch = currentRoundMatches[matchIndex + 1];
        if (!nextMatch || !firstMatch || !secondMatch) continue;

        await database`
          update playoff_matches set next_match_id = ${nextMatch.id}, next_match_position = 1
          where id = ${firstMatch.id}
        `;
        await database`
          update playoff_matches set next_match_id = ${nextMatch.id}, next_match_position = 2
          where id = ${secondMatch.id}
        `;
      }
    }

    const slug = tournaments[0]?.slug;
    if (slug) revalidatePath(`/tournaments/${slug}/admin`);
    revalidatePath("/tournoi/en-cours");

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return { success: false, error: message };
  }
}

export async function regenerateConsolationBracketAction(
  tournamentId: string,
  adminToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    assertAdminToken(adminToken);
    await deleteConsolationBracket(tournamentId);
    return generateConsolationBracketAction(tournamentId, adminToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return { success: false, error: message };
  }
}
