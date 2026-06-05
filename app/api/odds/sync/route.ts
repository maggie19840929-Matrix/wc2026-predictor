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
  for (const odds of oddsData) {
    if (odds.bookmakers.length === 0) continue;

    // 用最佳赔率（取各庄最高）写入 matches 表
    // 同时把完整 bookmakers JSON 存到 odds_detail 字段
    const { error } = await supabase
      .from("matches")
      .update({
        home_odds: odds.best_home,
        draw_odds: odds.best_draw,
        away_odds: odds.best_away,
        odds_detail: odds.bookmakers,
        updated_at: new Date().toISOString(),
      })
      .ilike("home_team_name", `%${odds.home_team.split(" ")[0]}%`);

    if (!error) updated++;
  }

  return NextResponse.json({ updated, total: oddsData.length });
}
