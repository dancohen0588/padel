import { getDatabaseClient } from "@/lib/database";
import type {
  Match,
  MatchSet,
  MatchStatus,
  MatchWithTeams,
  PaymentConfig,
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
  WhatsAppJoin,
} from "@/lib/types";
import type {
  PlayoffMatch,
  PlayoffMatchStatus,
  PlayoffRound,
  PlayoffSet,
  PlayoffBracketData,
} from "@/types/playoff";
import type {
  ClosestMatch,
  RecentWinner,
  TopPlayer,
  TopTeam,
} from "@/types/home-stats";

const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  enabled: false,
  methods: {
    bank: {
      enabled: false,
      iban: null,
      bic: null,
    },
    lydia: {
      enabled: false,
      identifier: null,
    },
    revolut: {
      enabled: false,
      link: null,
      tag: null,
    },
    wero: {
      enabled: false,
      identifier: null,
    },
    cash: {
      enabled: false,
    },
  },
  confirmationEmail: null,
  paymentDeadlineHours: 48,
};

const getPaymentConfigOrDefault = (value: PaymentConfig | null) =>
  value ?? DEFAULT_PAYMENT_CONFIG;

const GLOBAL_PAYMENT_CONFIG_ID = "00000000-0000-0000-0000-000000000001";

export const getActiveTournament = async (): Promise<Tournament | null> => {
  const database = getDatabaseClient();
  console.info("[db-debug] getActiveTournament using database");
  const tournaments = await database<Array<Tournament & { payment_config: PaymentConfig | null }>>`
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
      price,
      payment_config,
      config,
      created_at::text as created_at
    from tournaments
    where status in ('published', 'ongoing')
    order by date desc, created_at desc
    limit 1
  `;

  const row = tournaments[0];
  if (!row) return null;

  return {
    ...row,
    paymentConfig: getPaymentConfigOrDefault((row.payment_config ?? null) as PaymentConfig),
  };
};

export const getPublishedTournaments = async (): Promise<Tournament[]> => {
  return getTournaments("published");
};

export const getActiveDisplayTournaments = async (): Promise<Tournament[]> => {
  const database = getDatabaseClient();
  const rows = await database<Array<Tournament & { payment_config: PaymentConfig | null }>>`
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
      price,
      payment_config,
      config,
      created_at::text as created_at
    from tournaments
    where status in ('published', 'ongoing')
    order by date desc, created_at desc
  `;

  return rows.map((row) => ({
    ...row,
    paymentConfig: getPaymentConfigOrDefault((row.payment_config ?? null) as PaymentConfig),
  }));
};

export const getTournamentWithAllData = async (tournamentId: string) => {
  const [
    tournament,
    registrations,
    teams,
    teamPlayers,
    pools,
    poolTeams,
    matches,
    matchSets,
  ] = await Promise.all([
    getTournamentById(tournamentId),
    getRegistrationsByStatus(tournamentId, "approved"),
    getTeamsByTournament(tournamentId),
    getTeamPlayersByTournament(tournamentId),
    getPoolsByTournament(tournamentId),
    getPoolTeamsByTournament(tournamentId),
    getMatchesByTournament(tournamentId),
    getMatchSetsByTournament(tournamentId),
  ]);

  return {
    tournament,
    registrations,
    teams,
    teamPlayers,
    pools,
    poolTeams,
    matches,
    matchSets,
  };
};

export const checkIfTournamentStarted = async (
  tournamentId: string
): Promise<boolean> => {
  const database = getDatabaseClient();
  const rows = await database<Array<{ id: string }>>`
    select ms.id
    from match_sets ms
    join matches m on m.id = ms.match_id
    where m.tournament_id = ${tournamentId}
    limit 1
  `;

  return rows.length > 0;
};

export const getActiveTournamentId = async (): Promise<string | null> => {
  const database = getDatabaseClient();
  const rows = await database<Array<{ id: string }>>`
    select id
    from tournaments
    where status in ('published', 'ongoing')
    order by date desc, created_at desc
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

  const rows = await database<Array<Tournament & { payment_config: PaymentConfig | null }>>`
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
      price,
      payment_config,
      config,
      created_at::text as created_at
    from tournaments
    ${statusClause}
    order by date desc
  `;

  return rows.map((row) => ({
    ...row,
    paymentConfig: getPaymentConfigOrDefault((row.payment_config ?? null) as PaymentConfig),
  }));
};

export const getTournamentById = async (
  tournamentId: string
): Promise<Tournament | null> => {
  const database = getDatabaseClient();
  const rows = await database<Array<Tournament & { payment_config: PaymentConfig | null }>>`
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
      price,
      payment_config,
      config,
      created_at::text as created_at
    from tournaments
    where id = ${tournamentId}
    limit 1
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    ...row,
    paymentConfig: getPaymentConfigOrDefault((row.payment_config ?? null) as PaymentConfig),
  };
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

export const getHomeConfig = async (): Promise<
  { id: string; cover_photo_url: string | null } | null
> => {
  const database = getDatabaseClient();
  const [config] = await database<
    { id: string; cover_photo_url: string | null }[]
  >`
    select id, cover_photo_url
    from home_config
    where id = ${"00000000-0000-0000-0000-000000000001"}
  `;
  return config ?? null;
};

const normalizePaymentConfig = (value: unknown): PaymentConfig | null => {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as PaymentConfig;
    } catch {
      return null;
    }
  }
  return value as PaymentConfig;
};

export const getGlobalPaymentConfig = async (): Promise<PaymentConfig> => {
  const database = getDatabaseClient();
  const [row] = await database<
    { id: string; config: PaymentConfig | null }[]
  >`
    select id, config
    from payment_config
    where id = ${GLOBAL_PAYMENT_CONFIG_ID}
  `;
  const normalized = normalizePaymentConfig(row?.config ?? null);
  if (!normalized) {
    console.warn("[payment-config] invalid config, fallback defaults", {
      hasRow: Boolean(row),
      configType: row?.config ? typeof row.config : "null",
    });
  }
  return getPaymentConfigOrDefault(normalized);
};

export const getHomeGallery = async (): Promise<
  { id: string; photo_url: string; caption: string | null; display_order: number }[]
> => {
  const database = getDatabaseClient();
  return database<
    { id: string; photo_url: string; caption: string | null; display_order: number }[]
  >`
    select id, photo_url, caption, display_order
    from home_gallery
    where is_active = true
    order by display_order asc
  `;
};

export const getHomeRecentWinners = async (): Promise<RecentWinner[]> => {
  const database = getDatabaseClient();
  const rows = await database<
    Array<{
      tournament_id: string;
      tournament_name: string;
      tournament_date: string;
      player1_name: string | null;
      player1_photo: string | null;
      player2_name: string | null;
      player2_photo: string | null;
    }>
  >`
    with recent as (
      select id, name, date
      from tournaments
      where status in ('archived', 'published')
      order by date desc
      limit 3
    ),
    finals as (
      select
        r.id as tournament_id,
        pm.winner_id
      from recent r
      left join lateral (
        select pm.winner_id
        from playoff_matches pm
        join playoff_rounds pr on pr.id = pm.round_id
        where pr.tournament_id = r.id
        order by pr.round_number desc, pm.match_number desc
        limit 1
      ) pm on true
    ),
    team_players_ranked as (
      select
        tp.team_id,
        p.first_name,
        p.last_name,
        p.photo_url,
        row_number() over (partition by tp.team_id order by p.last_name, p.first_name) as rn
      from team_players tp
      join players p on p.id = tp.player_id
    )
    select
      r.id as tournament_id,
      r.name as tournament_name,
      r.date::text as tournament_date,
      concat(p1.first_name, ' ', p1.last_name) as player1_name,
      p1.photo_url as player1_photo,
      concat(p2.first_name, ' ', p2.last_name) as player2_name,
      p2.photo_url as player2_photo
    from recent r
    left join finals f on f.tournament_id = r.id
    left join team_players_ranked p1 on p1.team_id = f.winner_id and p1.rn = 1
    left join team_players_ranked p2 on p2.team_id = f.winner_id and p2.rn = 2
    order by r.date desc;
  `;

  return rows;
};

export const getHomeClosestMatch = async (): Promise<ClosestMatch | null> => {
  const database = getDatabaseClient();
  const rows = await database<
    Array<{
      match_id: string;
      match_type: "pool" | "playoff";
      nb_sets: number;
      team_a_id: string;
      team_b_id: string;
      team_a_score: number;
      team_b_score: number;
      team_a_name: string | null;
      team_b_name: string | null;
      player1a_name: string | null;
      player2a_name: string | null;
      player1b_name: string | null;
      player2b_name: string | null;
      player1a_photo: string | null;
      player2a_photo: string | null;
      player1b_photo: string | null;
      player2b_photo: string | null;
    }>
  >`
    with last_tournament as (
      select id
      from tournaments
      where status in ('archived', 'published')
      order by date desc
      limit 1
    ),
    pool_matches as (
      select
        m.id as match_id,
        'pool'::text as match_type,
        m.team_a_id,
        m.team_b_id,
        m.sets_won_a as team_a_score,
        m.sets_won_b as team_b_score,
        count(ms.id) as nb_sets
      from matches m
      join last_tournament lt on lt.id = m.tournament_id
      left join match_sets ms on ms.match_id = m.id
      group by m.id
    ),
    playoff_matches_cte as (
      select
        pm.id as match_id,
        'playoff'::text as match_type,
        pm.team1_id as team_a_id,
        pm.team2_id as team_b_id,
        coalesce(
          (select count(*) from playoff_sets ps where ps.match_id = pm.id and ps.team1_score > ps.team2_score),
          0
        ) as team_a_score,
        coalesce(
          (select count(*) from playoff_sets ps where ps.match_id = pm.id and ps.team2_score > ps.team1_score),
          0
        ) as team_b_score,
        (select count(*) from playoff_sets ps where ps.match_id = pm.id) as nb_sets
      from playoff_matches pm
      join last_tournament lt on lt.id = pm.tournament_id
    ),
    all_matches as (
      select * from pool_matches
      union all
      select * from playoff_matches_cte
    ),
    team_players_ranked as (
      select
        tp.team_id,
        p.first_name,
        p.last_name,
        p.photo_url,
        row_number() over (partition by tp.team_id order by p.last_name, p.first_name) as rn
      from team_players tp
      join players p on p.id = tp.player_id
    )
    select
      am.match_id,
      am.match_type,
      am.nb_sets,
      am.team_a_id,
      am.team_b_id,
      am.team_a_score,
      am.team_b_score,
      ta.name as team_a_name,
      tb.name as team_b_name,
      concat(p1a.first_name, ' ', p1a.last_name) as player1a_name,
      concat(p2a.first_name, ' ', p2a.last_name) as player2a_name,
      concat(p1b.first_name, ' ', p1b.last_name) as player1b_name,
      concat(p2b.first_name, ' ', p2b.last_name) as player2b_name,
      p1a.photo_url as player1a_photo,
      p2a.photo_url as player2a_photo,
      p1b.photo_url as player1b_photo,
      p2b.photo_url as player2b_photo
    from all_matches am
    left join teams ta on ta.id = am.team_a_id
    left join teams tb on tb.id = am.team_b_id
    left join team_players_ranked p1a on p1a.team_id = am.team_a_id and p1a.rn = 1
    left join team_players_ranked p2a on p2a.team_id = am.team_a_id and p2a.rn = 2
    left join team_players_ranked p1b on p1b.team_id = am.team_b_id and p1b.rn = 1
    left join team_players_ranked p2b on p2b.team_id = am.team_b_id and p2b.rn = 2
    order by am.nb_sets desc, am.match_id
    limit 1;
  `;

  return rows[0] ?? null;
};

export const getHomeTopTeams = async (): Promise<TopTeam[]> => {
  const database = getDatabaseClient();
  const rows = await database<
    Array<{
      team_id: string;
      total_wins: number;
      tournament_count: number;
      team_name: string | null;
      player1_name: string | null;
      player2_name: string | null;
      player1_photo: string | null;
      player2_photo: string | null;
    }>
  >`
    with pool_wins as (
      select winner_team_id as team_id, count(*) as wins
      from matches
      where winner_team_id is not null
      group by winner_team_id
    ),
    playoff_wins as (
      select winner_id as team_id, count(*) as wins
      from playoff_matches
      where winner_id is not null
      group by winner_id
    ),
    total_wins as (
      select
        coalesce(pw.team_id, pl.team_id) as team_id,
        coalesce(pw.wins, 0) + coalesce(pl.wins, 0) as total_wins
      from pool_wins pw
      full outer join playoff_wins pl on pl.team_id = pw.team_id
    ),
    team_players_ranked as (
      select
        tp.team_id,
        p.first_name,
        p.last_name,
        p.photo_url,
        row_number() over (partition by tp.team_id order by p.last_name, p.first_name) as rn
      from team_players tp
      join players p on p.id = tp.player_id
    )
    select
      tw.team_id,
      tw.total_wins,
      count(distinct tm.tournament_id) as tournament_count,
      tm.name as team_name,
      concat(p1.first_name, ' ', p1.last_name) as player1_name,
      concat(p2.first_name, ' ', p2.last_name) as player2_name,
      p1.photo_url as player1_photo,
      p2.photo_url as player2_photo
    from total_wins tw
    join teams tm on tm.id = tw.team_id
    left join team_players_ranked p1 on p1.team_id = tw.team_id and p1.rn = 1
    left join team_players_ranked p2 on p2.team_id = tw.team_id and p2.rn = 2
    group by tw.team_id, tw.total_wins, tm.name, p1.first_name, p1.last_name, p1.photo_url, p2.first_name, p2.last_name, p2.photo_url
    order by tw.total_wins desc
    limit 5;
  `;

  return rows.map((row) => ({
    ...row,
    total_wins: Number(row.total_wins) || 0,
    tournament_count: Number(row.tournament_count) || 0,
  }));
};

export const getHomeTopPlayers = async (): Promise<TopPlayer[]> => {
  const database = getDatabaseClient();
  const rows = await database<
    Array<{
      player_id: string;
      player_name: string;
      player_photo: string | null;
      total_wins: number;
      tournament_count: number;
      partners_count: number;
    }>
  >`
    with wins as (
      select winner_team_id as team_id from matches where winner_team_id is not null
      union all
      select winner_id as team_id from playoff_matches where winner_id is not null
    ),
    player_wins as (
      select tp.player_id, count(*) as total_wins
      from wins w
      join team_players tp on tp.team_id = w.team_id
      group by tp.player_id
    ),
    partner_counts as (
      select
        tp.player_id,
        count(distinct tp2.player_id) as partners_count
      from team_players tp
      join team_players tp2 on tp2.team_id = tp.team_id and tp2.player_id <> tp.player_id
      group by tp.player_id
    )
    select
      p.id as player_id,
      concat(p.first_name, ' ', p.last_name) as player_name,
      p.photo_url as player_photo,
      pw.total_wins,
      count(distinct tm.tournament_id) as tournament_count,
      coalesce(pc.partners_count, 0) as partners_count
    from player_wins pw
    join players p on p.id = pw.player_id
    join team_players tp on tp.player_id = pw.player_id
    join teams tm on tm.id = tp.team_id
    left join partner_counts pc on pc.player_id = pw.player_id
    group by p.id, p.first_name, p.last_name, p.photo_url, pw.total_wins, pc.partners_count
    order by pw.total_wins desc
    limit 5;
  `;

  return rows.map((row) => ({
    ...row,
    total_wins: Number(row.total_wins) || 0,
    tournament_count: Number(row.tournament_count) || 0,
    partners_count: Number(row.partners_count) || 0,
  }));
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
    player_level: string | null;
    player_phone: string | null;
  player_is_ranked: boolean | null;
  player_ranking: string | null;
  player_play_preference: "droite" | "gauche" | "aucune" | null;
  player_created_at: string;
  player_whatsapp_joined_tournaments: unknown;
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
      p.level as player_level,
      p.phone as player_phone,
      p.is_ranked as player_is_ranked,
      p.ranking as player_ranking,
      p.play_preference as player_play_preference,
      p.created_at::text as player_created_at,
      p.whatsapp_joined_tournaments as player_whatsapp_joined_tournaments
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

  console.info("[admin-debug] registrationsByStatus", {
    tournamentId,
    status: status ?? "all",
    total: rows.length,
    sample: rows.slice(0, 5).map((row) => ({
      player_id: row.player_id_join,
      player_name: `${row.player_first_name} ${row.player_last_name}`,
      is_ranked: row.player_is_ranked,
      ranking: row.player_ranking,
      play_preference: row.player_play_preference,
    })),
  });

  return rows.map((row) => {
    const whatsappJoins = (row.player_whatsapp_joined_tournaments as WhatsAppJoin[]) ?? [];
    const whatsappJoin = whatsappJoins.find((join) => join.tournamentId === tournamentId);

    return {
      id: row.id,
      tournament_id: row.tournament_id,
      player_id: row.player_id,
      status: row.status,
      registered_at: row.registered_at,
      hasJoinedWhatsApp: Boolean(whatsappJoin),
      whatsappJoinDate: whatsappJoin?.joinedAt ?? null,
      player: {
        id: row.player_id_join,
        first_name: row.player_first_name,
        last_name: row.player_last_name,
        email: row.player_email,
        level: row.player_level,
        phone: row.player_phone,
        is_ranked: row.player_is_ranked,
        ranking: row.player_ranking,
        play_preference: row.player_play_preference,
        created_at: row.player_created_at,
        whatsappJoinedTournaments: whatsappJoins,
      },
    };
  });
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

export const getPlayoffRoundsByTournament = async (
  tournamentId: string
): Promise<PlayoffRound[]> => {
  const database = getDatabaseClient();
  const rows = await database<PlayoffRound[]>`
    select
      id,
      tournament_id,
      round_number,
      round_name,
      created_at::text as created_at
    from playoff_rounds
    where tournament_id = ${tournamentId}
    order by round_number asc
  `;

  return rows;
};

export const getPlayoffMatchesByTournament = async (
  tournamentId: string
): Promise<PlayoffMatch[]> => {
  const database = getDatabaseClient();
  const rows = await database<PlayoffMatch[]>`
    select
      id,
      tournament_id,
      round_id,
      match_number,
      team1_id,
      team2_id,
      winner_id,
      team1_seed,
      team2_seed,
      scheduled_at::text as scheduled_at,
      next_match_id,
      next_match_position,
      status,
      created_at::text as created_at
    from playoff_matches
    where tournament_id = ${tournamentId}
    order by round_id asc, match_number asc
  `;

  return rows.map((row) => ({
    ...row,
    status: row.status as PlayoffMatchStatus,
  }));
};

export const getPlayoffSetsByTournament = async (
  tournamentId: string
): Promise<PlayoffSet[]> => {
  const database = getDatabaseClient();
  const rows = await database<PlayoffSet[]>`
    select
      ps.id,
      ps.match_id,
      ps.set_number,
      ps.team1_score,
      ps.team2_score,
      ps.created_at::text as created_at
    from playoff_sets ps
    join playoff_matches pm on pm.id = ps.match_id
    where pm.tournament_id = ${tournamentId}
    order by ps.match_id asc, ps.set_number asc
  `;

  return rows;
};

export const getPlayoffMatchesWithTeams = async (
  tournamentId: string
): Promise<PlayoffMatch[]> => {
  const database = getDatabaseClient();
  type PlayoffMatchRow = PlayoffMatch & {
    team1_name: string | null;
    team2_name: string | null;
    winner_name: string | null;
    team1_created_at: string | null;
    team2_created_at: string | null;
    winner_created_at: string | null;
    round_number: number;
    round_name: string;
  };

  const rows = await database<PlayoffMatchRow[]>`
    select
      pm.id,
      pm.tournament_id,
      pm.round_id,
      pm.match_number,
      pm.team1_id,
      pm.team2_id,
      pm.winner_id,
      pm.team1_seed,
      pm.team2_seed,
      pm.scheduled_at::text as scheduled_at,
      pm.next_match_id,
      pm.next_match_position,
      pm.status,
      pm.created_at::text as created_at,
      pr.round_number,
      pr.round_name,
      t1.name as team1_name,
      t1.created_at::text as team1_created_at,
      t2.name as team2_name,
      t2.created_at::text as team2_created_at,
      tw.name as winner_name,
      tw.created_at::text as winner_created_at
    from playoff_matches pm
    join playoff_rounds pr on pr.id = pm.round_id
    left join teams t1 on t1.id = pm.team1_id
    left join teams t2 on t2.id = pm.team2_id
    left join teams tw on tw.id = pm.winner_id
    where pm.tournament_id = ${tournamentId}
    order by pr.round_number asc, pm.match_number asc
  `;

  const matchIds = rows.map((row) => row.id);
  const sets = matchIds.length
    ? await database<PlayoffSet[]>`
        select
          id,
          match_id,
          set_number,
          team1_score,
          team2_score,
          created_at::text as created_at
        from playoff_sets
        where match_id in ${database(matchIds)}
        order by match_id asc, set_number asc
      `
    : [];

  const setsByMatch = new Map<string, PlayoffSet[]>();
  sets.forEach((set) => {
    const list = setsByMatch.get(set.match_id) ?? [];
    list.push(set);
    setsByMatch.set(set.match_id, list);
  });

  return rows.map((row) => ({
    id: row.id,
    tournament_id: row.tournament_id,
    round_id: row.round_id,
    match_number: row.match_number,
    team1_id: row.team1_id,
    team2_id: row.team2_id,
    winner_id: row.winner_id,
    team1_seed: row.team1_seed,
    team2_seed: row.team2_seed,
    scheduled_at: row.scheduled_at,
    next_match_id: row.next_match_id,
    next_match_position: row.next_match_position,
    status: row.status as PlayoffMatchStatus,
    created_at: row.created_at,
    round: {
      id: row.round_id,
      tournament_id: row.tournament_id,
      round_number: row.round_number,
      round_name: row.round_name,
      created_at: "",
    },
    team1: row.team1_id
      ? {
          id: row.team1_id,
          tournament_id: row.tournament_id,
          name: row.team1_name,
          created_at: row.team1_created_at ?? "",
        }
      : null,
    team2: row.team2_id
      ? {
          id: row.team2_id,
          tournament_id: row.tournament_id,
          name: row.team2_name,
          created_at: row.team2_created_at ?? "",
        }
      : null,
    winner: row.winner_id
      ? {
          id: row.winner_id,
          tournament_id: row.tournament_id,
          name: row.winner_name,
          created_at: row.winner_created_at ?? "",
        }
      : null,
    sets: setsByMatch.get(row.id) ?? [],
  }));
};

export const getPlayoffBracketData = async (
  tournamentId: string
): Promise<PlayoffBracketData> => {
  const matches = await getPlayoffMatchesWithTeams(tournamentId);
  const rounds = matches.reduce<Record<number, PlayoffMatch[]>>((acc, match) => {
    const roundNumber = match.round?.round_number ?? 0;
    if (!acc[roundNumber]) {
      acc[roundNumber] = [];
    }
    acc[roundNumber].push(match);
    return acc;
  }, {});

  const roundNumbers = Object.keys(rounds)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  const finalRound = roundNumbers.length ? Math.max(...roundNumbers) : 0;
  const finalMatch = finalRound ? rounds[finalRound]?.[0] : undefined;
  const champion = finalMatch?.winner ?? null;

  return { rounds, champion };
};
