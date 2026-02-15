export type RegistrationStatus = "pending" | "approved" | "rejected";

export type TournamentStatus =
  | "draft"
  | "published"
  | "archived"
  | "upcoming"
  | "registration"
  | "ongoing";

export type TournamentConfig = {
  pairing_mode: "manual" | "random" | "balanced";
  pools_count: number;
  playoffs: {
    enabled: boolean;
    teams_qualified: number;
    format: "single_elim" | "double_elim";
    has_third_place: boolean;
  };
};

export type Tournament = {
  id: string;
  slug: string | null;
  name: string;
  date: string;
  location: string | null;
  description: string | null;
  status: TournamentStatus;
  max_players: number | null;
  image_path: string | null;
  config: TournamentConfig;
  created_at: string;
};

export type Player = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  level: string | null;
  is_ranked?: boolean | null;
  ranking?: string | null;
  play_preference?: "droite" | "gauche" | "aucune" | null;
  phone: string | null;
  created_at: string;
};

export type Registration = {
  id: string;
  tournament_id: string;
  player_id: string;
  status: RegistrationStatus;
  registered_at: string;
};

export type RegistrationWithPlayer = Registration & {
  player: Player;
};

export type TournamentPhoto = {
  id: string;
  tournament_id: string | null;
  url: string;
  caption: string | null;
  featured: boolean;
  created_at: string;
};

export type PlayerStats = {
  player_id: string;
  first_name: string;
  last_name: string;
  email: string;
  tournaments_played: number;
  approved_registrations: number;
  last_registered_at: string | null;
};

export type Team = {
  id: string;
  tournament_id: string;
  name: string | null;
  created_at: string;
};

export type TeamPlayer = {
  team_id: string;
  player_id: string;
  created_at: string;
};

export type Pool = {
  id: string;
  tournament_id: string;
  name: string;
  pool_order: number;
  created_at: string;
};

export type PoolTeam = {
  pool_id: string;
  team_id: string;
  created_at: string;
};

export type MatchStatus = "upcoming" | "live" | "finished";

export type Match = {
  id: string;
  tournament_id: string;
  pool_id: string | null;
  team_a_id: string;
  team_b_id: string;
  status: MatchStatus;
  scheduled_at: string | null;
  winner_team_id: string | null;
  sets_won_a: number;
  sets_won_b: number;
  games_won_a: number;
  games_won_b: number;
  created_at: string;
};

export type MatchSet = {
  id: string;
  match_id: string;
  set_order: number;
  team_a_games: number;
  team_b_games: number;
  created_at: string;
};

export type MatchWithTeams = Match & {
  team_a: Team;
  team_b: Team;
  sets: MatchSet[];
};

export type PoolStanding = {
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
};
