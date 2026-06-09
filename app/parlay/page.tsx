import { createClient } from "@/lib/supabase/server";
import { ParlayClient } from "@/components/parlay/ParlayClient";
import type { BookmakerOdds } from "@/lib/odds-api";

export const revalidate = 60;

export default async function ParlayPage() {
  const supabase = await createClient();

  // 取未来3天内有赔率的比赛
  const now = new Date();
  const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const { data: rows } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "TIMED")
    .gte("utc_date", now.toISOString())
    .lte("utc_date", in3days.toISOString())
    .order("utc_date", { ascending: true });

  // 只取有赔率的（爱游戏赔率 或 bookmaker赔率）
  const matchesWithOdds = (rows ?? []).filter((row) => {
    const hasAyx = row.home_odds > 1 && row.draw_odds > 1 && row.away_odds > 1;
    if (hasAyx) return true;
    const detail: BookmakerOdds[] = (row.odds_detail as BookmakerOdds[]) ?? [];
    return detail.length > 0;
  }).map((row) => {
    const detail: BookmakerOdds[] = (row.odds_detail as BookmakerOdds[]) ?? [];
    // 优先用爱游戏赔率，否则取bookmaker最大赔率
    const homeOdds = row.home_odds > 1 ? row.home_odds
      : detail.length > 0 ? Math.max(...detail.map((b: BookmakerOdds) => b.home)) : 0;
    const drawOdds = row.draw_odds > 1 ? row.draw_odds
      : detail.length > 0 ? Math.max(...detail.map((b: BookmakerOdds) => b.draw)) : 0;
    const awayOdds = row.away_odds > 1 ? row.away_odds
      : detail.length > 0 ? Math.max(...detail.map((b: BookmakerOdds) => b.away)) : 0;

    return {
      id: row.id as string,
      homeTeam: (row.home_team_short ?? row.home_team_name) as string,
      awayTeam: (row.away_team_short ?? row.away_team_name) as string,
      utcDate: row.utc_date as string,
      homeOdds,
      drawOdds,
      awayOdds,
      communityHome: Number(row.home_pct) || 33,
      communityDraw: Number(row.draw_pct) || 33,
      communityAway: Number(row.away_pct) || 34,
      totalPredictions: Number(row.total_predictions) || 0,
    };
  }).filter(m => m.homeOdds > 1 && m.drawOdds > 1 && m.awayOdds > 1);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="text-center space-y-2 pt-2">
        <h1 className="text-2xl font-black text-white">串关策略</h1>
        <p className="text-gray-500 text-sm">基于 Kelly 准则的最优投注组合推荐</p>
      </div>
      <ParlayClient matches={matchesWithOdds} />
    </div>
  );
}
