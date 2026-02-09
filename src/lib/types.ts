export type RegistrationStatus = "pending" | "approved" | "rejected";

export type TournamentStatus = "draft" | "published" | "archived";

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
  email: string;
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
