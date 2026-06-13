import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchWCOdds } from "@/lib/odds-api";

// POST /api/odds/sync — 从 the-odds-api 拉取赔率写入数据库
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.SYNC_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const oddsData = await fetchWCOdds();

  let updated = 0;
  let skipped = 0;
  for (const odds of oddsData) {
    if (odds.bookmakers.length === 0) continue;

    // 同时匹配主队+客队首词，避免"同首词不同对手"串台
    // （旧bug：只匹配主队首词 → Brazil vs Morocco 和 Brazil vs Haiti 拿到同一份赔率）
    const homeKey = odds.home_team.split(" ")[0];
    const awayKey = odds.away_team.split(" ")[0];

    const { data: rows, error } = await supabase
      .from("matches")
      .update({
        home_odds: odds.best_home,
        draw_odds: odds.best_draw,
        away_odds: odds.best_away,
        odds_detail: odds.bookmakers,
        totals_detail: odds.totals,
        updated_at: new Date().toISOString(),
      })
      .ilike("home_team_name", `%${homeKey}%`)
      .ilike("away_team_name", `%${awayKey}%`)
      .select("id");

    if (!error && rows && rows.length > 0) updated++;
    else skipped++;
  }

  return NextResponse.json({ updated, skipped, total: oddsData.length });
}
