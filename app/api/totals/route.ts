import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SECRET = process.env.SYNC_SECRET ?? "my-secret-key-123";

// PATCH /api/totals — 录入 AYX 大小球赔率
export async function PATCH(req: Request) {
  const body = await req.json();
  const { match_id, secret, line, over, under } = body;

  if (secret !== SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!match_id) return NextResponse.json({ error: "match_id required" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({
      ayx_total_line: line ?? null,
      ayx_over: over ?? null,
      ayx_under: under ?? null,
    })
    .eq("id", match_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
