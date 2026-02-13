export type RecentWinner = {
  tournament_id: string;
  tournament_name: string;
  tournament_date: string;
  player1_name: string | null;
  player1_photo: string | null;
  player2_name: string | null;
  player2_photo: string | null;
};

export type ClosestMatch = {
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
};

export type TopTeam = {
  team_id: string;
  total_wins: number;
  tournament_count: number;
  team_name: string | null;
  player1_name: string | null;
  player2_name: string | null;
  player1_photo: string | null;
  player2_photo: string | null;
};

export type TopPlayer = {
  player_id: string;
  player_name: string;
  player_photo: string | null;
  total_wins: number;
  tournament_count: number;
  partners_count: number;
};
