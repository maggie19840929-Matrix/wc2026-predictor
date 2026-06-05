import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getMatches, normalizeMatch } from "@/lib/football-api";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.SYNC_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const data = await getMatches();
  const matches = data.matches
    .filter((m: { homeTeam: { id: number | null } }) => m.homeTeam?.id != null)
    .map(normalizeMatch);

  const { error } = await supabase
    .from("matches")
    .upsert(matches, { onConflict: "api_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ synced: matches.length });
}
