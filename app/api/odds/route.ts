import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// PATCH /api/odds — update bookmaker odds for a match (admin)
export async function PATCH(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { match_id, home_odds, draw_odds, away_odds } = await req.json();

  const { error } = await supabase
    .from("matches")
    .update({ home_odds, draw_odds, away_odds })
    .eq("id", match_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
