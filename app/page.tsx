import { createClient } from "@/lib/supabase/server";
import { MatchCard } from "@/components/match/MatchCard";
import { MatchListClient } from "@/components/match/MatchListClient";
import type { Match } from "@/types";

export const revalidate = 60;

function toMatch(row: Record<string, unknown>): Match {
  return {
    id: row.id as string,
    api_id: row.api_id as number,
    home_team: {
      id: row.home_team_id as number,
      name: row.home_team_name as string,
      shortName: row.home_team_short as string,
      crest: row.home_team_crest as string,
    },
    away_team: {
      id: row.away_team_id as number,
      name: row.away_team_name as string,
      shortName: row.away_team_short as string,
      crest: row.away_team_crest as string,
    },
    utc_date: row.utc_date as string,
    status: row.status as Match["status"],
    stage: row.stage as string,
    group: row.group as string | undefined,
    home_score: row.home_score as number | null,
    away_score: row.away_score as number | null,
    home_odds: row.home_odds as number | null,
    draw_odds: row.draw_odds as number | null,
    away_odds: row.away_odds as number | null,
    home_pct: Number(row.home_pct),
    draw_pct: Number(row.draw_pct),
    away_pct: Number(row.away_pct),
    total_predictions: row.total_predictions as number,
  };
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: matchRows } = await supabase
    .from("matches")
    .select("*")
    .order("utc_date", { ascending: true });

  const matches = (matchRows ?? []).map(toMatch);

  if (matches.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-4">⚽</p>
        <h1 className="text-2xl font-bold text-white mb-2">2026 世界杯 · 赛程即将更新</h1>
        <p className="text-gray-400 mb-2 text-sm">
          运行以下命令同步赛程：
        </p>
        <code className="bg-gray-800 px-3 py-1.5 rounded text-sm text-emerald-400">
          POST /api/sync
        </code>
        <p className="text-gray-500 text-sm mt-4">世界杯开幕：2026年6月12日</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">2026 世界杯竞猜</h1>
        <p className="text-gray-400 mt-1 text-sm">预测赛果，比拼眼光，发现价值投注</p>
      </div>
      {/* Client component handles username-aware card rendering */}
      <MatchListClient matches={matches} />
    </div>
  );
}
