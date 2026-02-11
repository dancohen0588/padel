import type { Team } from "@/lib/types";

export type PlayoffRound = {
  id: string;
  tournament_id: string;
  round_number: number;
  round_name: string;
  created_at: string;
};

export type PlayoffMatchStatus = "upcoming" | "live" | "completed";

export type PlayoffMatch = {
  id: string;
  tournament_id: string;
  round_id: string;
  match_number: number;
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
  team1_seed: number | null;
  team2_seed: number | null;
  scheduled_at: string | null;
  next_match_id: string | null;
  next_match_position: number | null;
  status: PlayoffMatchStatus;
  created_at: string;
  team1?: Team | null;
  team2?: Team | null;
  winner?: Team | null;
  sets?: PlayoffSet[];
  round?: PlayoffRound | null;
};

export type PlayoffSet = {
  id: string;
  match_id: string;
  set_number: number;
  team1_score: number;
  team2_score: number;
  created_at: string;
};

export type PlayoffBracketData = {
  rounds: Record<number, PlayoffMatch[]>;
  champion: Team | null;
};
