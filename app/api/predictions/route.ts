import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");
  const matchId = searchParams.get("match_id");

  if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });

  const supabase = await createClient();
  let query = supabase.from("predictions").select("*").eq("username", username);
  if (matchId) query = query.eq("match_id", matchId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();
  const { username, match_id, outcome, home_score_pred, away_score_pred } = body;

  if (!username || !match_id || !outcome) {
    return NextResponse.json({ error: "username, match_id and outcome required" }, { status: 400 });
  }

  // Ensure match hasn't started
  const { data: match } = await supabase
    .from("matches")
    .select("utc_date, status")
    .eq("id", match_id)
    .single();

  if (!match || new Date(match.utc_date) <= new Date()) {
    return NextResponse.json({ error: "预测窗口已关闭" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("predictions")
    .upsert(
      { username, match_id, outcome, home_score_pred: home_score_pred ?? null, away_score_pred: away_score_pred ?? null },
      { onConflict: "username,match_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
