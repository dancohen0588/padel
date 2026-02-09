import { getDatabaseClient } from "@/lib/database";
import type {
  RegistrationStatus,
  RegistrationWithPlayer,
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
