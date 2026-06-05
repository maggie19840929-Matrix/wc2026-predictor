import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(req: Request) {
  const body = await req.json();
  const { match_id, home_odds, draw_odds, away_odds, secret } = body;

  // 支持 header 或 body 传 secret
  const authHeader = req.headers.get("authorization");
  const isAuthed =
    authHeader === `Bearer ${process.env.SYNC_SECRET}` ||
    secret === process.env.SYNC_SECRET;

  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from("matches")
    .update({ home_odds, draw_odds, away_odds })
    .eq("id", match_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
