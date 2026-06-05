export type Outcome = "HOME" | "DRAW" | "AWAY";

export interface Team {
  id: number;
  name: string;
  shortName: string;
  crest: string;
}

export interface Match {
  id: string;
  api_id: number;
  home_team: Team;
  away_team: Team;
  utc_date: string;
  status: "TIMED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "POSTPONED";
  stage: string;
  group?: string;
  home_score: number | null;
  away_score: number | null;
  home_odds: number | null;
  draw_odds: number | null;
  away_odds: number | null;
  // community prediction percentages
  home_pct: number;
  draw_pct: number;
  away_pct: number;
  total_predictions: number;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  outcome: Outcome;
  home_score_pred: number | null;
  away_score_pred: number | null;
  is_correct: boolean | null;
  points: number;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  total_points: number;
  correct_predictions: number;
  total_predictions: number;
}

export interface ValueBet {
  outcome: Outcome;
  community_prob: number;
  bookie_implied_prob: number;
  edge: number; // community_prob - bookie_implied_prob, positive = value
}
