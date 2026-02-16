export type RegistrationStatus = "pending" | "approved" | "rejected" | "waitlist";

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

export type PaymentMethodBank = {
  enabled: boolean;
  iban: string | null;
  bic: string | null;
};

export type PaymentMethodLydia = {
  enabled: boolean;
  identifier: string | null;
};

export type PaymentMethodRevolut = {
  enabled: boolean;
  link: string | null;
  tag: string | null;
};

export type PaymentMethodWero = {
  enabled: boolean;
  identifier: string | null;
};

export type PaymentMethodCash = {
  enabled: boolean;
};

export type PaymentMethodKey = "bank" | "lydia" | "revolut" | "wero" | "cash";

export type PaymentConfig = {
  enabled: boolean;
  methods: {
    bank: PaymentMethodBank;
    lydia: PaymentMethodLydia;
    revolut: PaymentMethodRevolut;
    wero: PaymentMethodWero;
    cash: PaymentMethodCash;
  };
  confirmationEmail: string | null;
  paymentDeadlineHours: number;
};

export const getEnabledPaymentMethods = (
  config: PaymentConfig
): Array<{ key: PaymentMethodKey; label: string; icon: string }> => {
  const allMethods = [
    { key: "bank" as const, label: "Virement bancaire", icon: "🏦" },
    { key: "lydia" as const, label: "Lydia", icon: "💜" },
    { key: "revolut" as const, label: "Revolut", icon: "💳" },
    { key: "wero" as const, label: "Wero", icon: "💰" },
    { key: "cash" as const, label: "Paiement sur place", icon: "💵" },
  ];

  return allMethods.filter((method) => config.methods[method.key]?.enabled);
};

export type WhatsAppJoin = {
  tournamentId: string;
  joinedAt: string;
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
  price: number | null;
  paymentConfig: PaymentConfig;
  whatsappGroupLink: string | null;
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
  pair_with?: string | null;
  whatsappJoinedTournaments?: WhatsAppJoin[];
};

export type PairRegistrationData = {
  player1: {
    mode: "new" | "existing";
    phone: string;
    playerId?: string;
    firstName?: string;
    lastName?: string;
    email?: string | null;
    level?: string;
    isRanked?: boolean;
    ranking?: string | null;
    playPreference?: string;
    photo?: File | null;
  };
  player2: {
    mode: "new" | "existing";
    phone: string;
    playerId?: string;
    firstName?: string;
    lastName?: string;
    email?: string | null;
    level?: string;
    isRanked?: boolean;
    ranking?: string | null;
    playPreference?: string;
    photo?: File | null;
  };
  tournamentId: string;
};

export type Registration = {
  id: string;
  tournament_id: string;
  player_id: string;
  status: RegistrationStatus;
  registered_at: string;
  waitlist_added_at?: string | null;
  payment_status?: boolean;
  payment_method?: PaymentMethodKey | null;
  payment_date?: string | null;
};

export type RegistrationWithPlayer = Registration & {
  player: Player;
  hasJoinedWhatsApp?: boolean;
  whatsappJoinDate?: string | null;
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
  is_seeded?: boolean;
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
