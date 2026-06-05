import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(req: Request) {
  const body = await req.json();
  const { match_id, secret, ...fields } = body;

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

  const allowed = [
    "subj_home_form", "subj_away_form",
    "subj_motivation", "subj_venue",
    "subj_intel", "subj_home_intel", "subj_away_intel",
  ];

  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) update[key] = fields[key];
  }

  const { error } = await supabase.from("matches").update(update).eq("id", match_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
