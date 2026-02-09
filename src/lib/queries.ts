import { getDatabaseClient } from "@/lib/database";
import type {
  Match,
  MatchSet,
  MatchStatus,
  MatchWithTeams,
  Pool,
  PoolStanding,
  PoolTeam,
  RegistrationStatus,
  RegistrationWithPlayer,
  Team,
  TeamPlayer,
  Tournament,
  TournamentPhoto,
  TournamentStatus,
} from "@/lib/types";

export const getActiveTournament = async (): Promise<Tournament | null> => {
  const database = getDatabaseClient();
  console.info("[db-debug] getActiveTournament using database");
  const tournaments = await database<Tournament[]>`
    select
      id,
      slug,
      name,
      date::text as date,
      location,
      description,
      status,
      max_players,
      image_path,
      config,
      created_at::text as created_at
    from tournaments
    where status = 'published'
    order by created_at desc
    limit 1
  `;

  return tournaments[0] ?? null;
};

export const getActiveTournamentId = async (): Promise<string | null> => {
  const database = getDatabaseClient();
  const rows = await database<Array<{ id: string }>>`
    select id
    from tournaments
    where status = 'published'
    order by created_at desc
    limit 1
  `;

  return rows[0]?.id ?? null;
};

export const getTournaments = async (
  status?: TournamentStatus
): Promise<Tournament[]> => {
  const database = getDatabaseClient();
  const statusClause = status
    ? database`where status = ${status}`
    : database``;

  const rows = await database<Tournament[]>`
    select
      id,
      slug,
      name,
      date::text as date,
      location,
      description,
      status,
      max_players,
      image_path,
      config,
      created_at::text as created_at
    from tournaments
    ${statusClause}
    order by date desc
  `;

  return rows;
};

export const getTournamentById = async (
  tournamentId: string
): Promise<Tournament | null> => {
  const database = getDatabaseClient();
  const rows = await database<Tournament[]>`
    select
      id,
      slug,
      name,
      date::text as date,
      location,
      description,
      status,
      max_players,
      image_path,
      config,
      created_at::text as created_at
    from tournaments
    where id = ${tournamentId}
    limit 1
  `;

  return rows[0] ?? null;
};

export const getFeaturedTournamentPhotos = async (): Promise<
  TournamentPhoto[]
> => {
  const database = getDatabaseClient();
  const rows = await database<TournamentPhoto[]>`
    select
      id,
      tournament_id,
      url,
      caption,
      featured,
      created_at::text as created_at
    from tournament_photos
    where featured = true
    order by created_at desc
  `;

  return rows;
};

export const getTournamentPhotos = async (
  tournamentId?: string
): Promise<TournamentPhoto[]> => {
  const database = getDatabaseClient();
  const tournamentClause = tournamentId
    ? database`where tournament_id = ${tournamentId}`
    : database``;

  const rows = await database<TournamentPhoto[]>`
    select
      id,
      tournament_id,
      url,
      caption,
      featured,
      created_at::text as created_at
    from tournament_photos
    ${tournamentClause}
    order by created_at desc
  `;

  return rows;
};

export const getRegistrationsByStatus = async (
  tournamentId: string,
  status?: RegistrationStatus
): Promise<RegistrationWithPlayer[]> => {
  const database = getDatabaseClient();
  type RegistrationRow = {
    id: string;
    tournament_id: string;
    player_id: string;
    status: RegistrationStatus;
    registered_at: string;
    player_id_join: string;
    player_first_name: string;
    player_last_name: string;
    player_email: string;
    player_phone: string | null;
    player_created_at: string;
  };

  const baseSql = database`
    select
      r.id,
      r.tournament_id,
      r.player_id,
      r.status,
      r.registered_at::text as registered_at,
      p.id as player_id_join,
      p.first_name as player_first_name,
      p.last_name as player_last_name,
      p.email as player_email,
      p.phone as player_phone,
      p.created_at::text as player_created_at
    from registrations r
    join players p on p.id = r.player_id
    where r.tournament_id = ${tournamentId}
  `;

  const statusClause = status
    ? database`and r.status = ${status}`
    : database``;

  const rows = await database<RegistrationRow[]>`
    ${baseSql}
    ${statusClause}
    order by r.registered_at desc
  `;

  return rows.map((row) => ({
    id: row.id,
    tournament_id: row.tournament_id,
    player_id: row.player_id,
    status: row.status,
    registered_at: row.registered_at,
    player: {
      id: row.player_id_join,
      first_name: row.player_first_name,
      last_name: row.player_last_name,
      email: row.player_email,
      phone: row.player_phone,
      created_at: row.player_created_at,
    },
  }));
};

export const countRegistrations = async (tournamentId: string) => {
  const database = getDatabaseClient();
  const rows = await database<Array<{ status: RegistrationStatus; count: number }>>`
    select status, count(*)::int as count
    from registrations
    where tournament_id = ${tournamentId}
    group by status
  `;

  const counts: Record<RegistrationStatus, number> = {
    approved: 0,
    pending: 0,
    rejected: 0,
  };

  rows.forEach((row) => {
    counts[row.status] = row.count;
  });

  return counts;
};

export const getTeamsByTournament = async (tournamentId: string): Promise<Team[]> => {
  const database = getDatabaseClient();
  const rows = await database<Team[]>`
    select id, tournament_id, name, created_at::text as created_at
    from teams
    where tournament_id = ${tournamentId}
    order by created_at asc
  `;

  return rows;
};

export const getTeamPlayersByTournament = async (
  tournamentId: string
): Promise<TeamPlayer[]> => {
  const database = getDatabaseClient();
  const rows = await database<TeamPlayer[]>`
    select tp.team_id, tp.player_id, tp.created_at::text as created_at
    from team_players tp
    join teams t on t.id = tp.team_id
    where t.tournament_id = ${tournamentId}
  `;

  return rows;
};

export const getPoolsByTournament = async (tournamentId: string): Promise<Pool[]> => {
  const database = getDatabaseClient();
  const rows = await database<Pool[]>`
    select id, tournament_id, name, pool_order, created_at::text as created_at
    from pools
    where tournament_id = ${tournamentId}
    order by pool_order asc
  `;

  return rows;
};

export const getPoolTeamsByTournament = async (
  tournamentId: string
): Promise<PoolTeam[]> => {
  const database = getDatabaseClient();
  const rows = await database<PoolTeam[]>`
    select pt.pool_id, pt.team_id, pt.created_at::text as created_at
    from pool_teams pt
    join pools p on p.id = pt.pool_id
    where p.tournament_id = ${tournamentId}
  `;

  return rows;
};

export const getMatchesByTournament = async (
  tournamentId: string
): Promise<Match[]> => {
  const database = getDatabaseClient();
  const rows = await database<Match[]>`
    select
      id,
      tournament_id,
      pool_id,
      team_a_id,
      team_b_id,
      status,
      scheduled_at::text as scheduled_at,
      winner_team_id,
      sets_won_a,
      sets_won_b,
      games_won_a,
      games_won_b,
      created_at::text as created_at
    from matches
    where tournament_id = ${tournamentId}
    order by created_at asc
  `;

  return rows;
};

export const getMatchSetsByTournament = async (
  tournamentId: string
): Promise<MatchSet[]> => {
  const database = getDatabaseClient();
  const rows = await database<MatchSet[]>`
    select
      ms.id,
      ms.match_id,
      ms.set_order,
      ms.team_a_games,
      ms.team_b_games,
      ms.created_at::text as created_at
    from match_sets ms
    join matches m on m.id = ms.match_id
    where m.tournament_id = ${tournamentId}
    order by ms.match_id asc, ms.set_order asc
  `;

  return rows;
};

export const getMatchesWithTeamsByPool = async (
  tournamentId: string,
  poolId: string | null
): Promise<MatchWithTeams[]> => {
  const database = getDatabaseClient();
  type MatchRow = Match & {
    team_a_name: string | null;
    team_b_name: string | null;
    team_a_created_at: string;
    team_b_created_at: string;
  };

  const poolClause = poolId
    ? database`and m.pool_id = ${poolId}`
    : database`and m.pool_id is null`;

  const rows = await database<MatchRow[]>`
    select
      m.id,
      m.tournament_id,
      m.pool_id,
      m.team_a_id,
      m.team_b_id,
      m.status,
      m.scheduled_at::text as scheduled_at,
      m.winner_team_id,
      m.sets_won_a,
      m.sets_won_b,
      m.games_won_a,
      m.games_won_b,
      m.created_at::text as created_at,
      ta.name as team_a_name,
      ta.created_at::text as team_a_created_at,
      tb.name as team_b_name,
      tb.created_at::text as team_b_created_at
    from matches m
    join teams ta on ta.id = m.team_a_id
    join teams tb on tb.id = m.team_b_id
    where m.tournament_id = ${tournamentId}
    ${poolClause}
    order by m.created_at asc
  `;

  const matchIds = rows.map((row) => row.id);
  const sets = matchIds.length
    ? await database<MatchSet[]>`
        select
          id,
          match_id,
          set_order,
          team_a_games,
          team_b_games,
          created_at::text as created_at
        from match_sets
        where match_id in ${database(matchIds)}
        order by match_id asc, set_order asc
      `
    : [];

  const setsByMatch = new Map<string, MatchSet[]>();
  sets.forEach((set) => {
    const list = setsByMatch.get(set.match_id) ?? [];
    list.push(set);
    setsByMatch.set(set.match_id, list);
  });

  return rows.map((row) => ({
    id: row.id,
    tournament_id: row.tournament_id,
    pool_id: row.pool_id,
    team_a_id: row.team_a_id,
    team_b_id: row.team_b_id,
    status: row.status as MatchStatus,
    scheduled_at: row.scheduled_at,
    winner_team_id: row.winner_team_id,
    sets_won_a: row.sets_won_a,
    sets_won_b: row.sets_won_b,
    games_won_a: row.games_won_a,
    games_won_b: row.games_won_b,
    created_at: row.created_at,
    team_a: {
      id: row.team_a_id,
      tournament_id: tournamentId,
      name: row.team_a_name,
      created_at: row.team_a_created_at,
    },
    team_b: {
      id: row.team_b_id,
      tournament_id: tournamentId,
      name: row.team_b_name,
      created_at: row.team_b_created_at,
    },
    sets: setsByMatch.get(row.id) ?? [],
  }));
};

export const getPoolStandings = async (
  tournamentId: string,
  poolId: string | null
): Promise<PoolStanding[]> => {
  const database = getDatabaseClient();
  type TeamRow = {
    id: string;
    name: string | null;
  };

  const poolClause = poolId
    ? database`and pt.pool_id = ${poolId}`
    : database``;

  const teams = await database<TeamRow[]>`
    select t.id, t.name
    from teams t
    join pool_teams pt on pt.team_id = t.id
    join pools p on p.id = pt.pool_id
    where p.tournament_id = ${tournamentId}
    ${poolClause}
    order by t.created_at asc
  `;

  const matches = await getMatchesByTournament(tournamentId);
  const poolMatches = matches.filter((match) =>
    poolId ? match.pool_id === poolId : match.pool_id === null
  );

  const standings = new Map<string, PoolStanding>();
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
    });
  });

  poolMatches.forEach((match) => {
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

  return Array.from(standings.values()).map((standing) => ({
    ...standing,
    set_diff: standing.sets_for - standing.sets_against,
    game_diff: standing.games_for - standing.games_against,
  }));
};
