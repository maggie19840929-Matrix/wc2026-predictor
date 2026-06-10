import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SECRET = process.env.SYNC_SECRET ?? "my-secret-key-123";

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { match_id, secret, home_ah_win_rate, away_ah_win_rate, home_over_rate, away_over_rate } = body;

  if (secret !== SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!match_id) return NextResponse.json({ error: "match_id required" }, { status: 400 });

  const supabase = await createClient();
  const update: Record<string, number> = {};
  if (home_ah_win_rate != null) update.home_ah_win_rate = home_ah_win_rate;
  if (away_ah_win_rate != null) update.away_ah_win_rate = away_ah_win_rate;
  if (home_over_rate != null) update.home_over_rate = home_over_rate;
  if (away_over_rate != null) update.away_over_rate = away_over_rate;

  const { error } = await supabase.from("matches").update(update).eq("id", match_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
