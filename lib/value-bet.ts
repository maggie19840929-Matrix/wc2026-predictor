import type { Match, ValueBet } from "@/types";

/** Convert decimal odds to implied probability (removing vig) */
function oddsToProb(odds: number): number {
  return 1 / odds;
}

/** Remove bookmaker margin and return fair probabilities */
function removeVig(home: number, draw: number, away: number) {
  const rawHome = oddsToProb(home);
  const rawDraw = oddsToProb(draw);
  const rawAway = oddsToProb(away);
  const total = rawHome + rawDraw + rawAway;
  return {
    home: rawHome / total,
    draw: rawDraw / total,
    away: rawAway / total,
  };
}

/**
 * Compare community predictions against bookmaker odds.
 * Returns value bets where the community probability exceeds
 * the bookmaker's implied probability by at least threshold.
 */
export function detectValueBets(match: Match, threshold = 0.05): ValueBet[] {
  if (!match.home_odds || !match.draw_odds || !match.away_odds) return [];
  if (match.total_predictions < 10) return []; // need enough sample

  const fair = removeVig(match.home_odds, match.draw_odds, match.away_odds);
  const community = {
    home: match.home_pct / 100,
    draw: match.draw_pct / 100,
    away: match.away_pct / 100,
  };

  const bets: ValueBet[] = [];

  const outcomes = [
    { outcome: "HOME" as const, comm: community.home, bookie: fair.home },
    { outcome: "DRAW" as const, comm: community.draw, bookie: fair.draw },
    { outcome: "AWAY" as const, comm: community.away, bookie: fair.away },
  ];

  for (const { outcome, comm, bookie } of outcomes) {
    const edge = comm - bookie;
    if (edge >= threshold) {
      bets.push({ outcome, community_prob: comm, bookie_implied_prob: bookie, edge });
    }
  }

  return bets.sort((a, b) => b.edge - a.edge);
}

/** Points system for predictions */
export function calcPoints(
  outcome: string,
  correctOutcome: string,
  homePred: number | null,
  awayPred: number | null,
  homeActual: number | null,
  awayActual: number | null
): number {
  if (outcome !== correctOutcome) return 0;
  let pts = 3; // correct outcome
  if (homePred !== null && awayPred !== null && homeActual !== null && awayActual !== null) {
    if (homePred === homeActual && awayPred === awayActual) pts += 5; // exact score
    else if (homePred - awayPred === homeActual - awayActual) pts += 2; // correct margin
  }
  return pts;
}
