import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 获取所有账目（按日期倒序）
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ledger_entries")
    .select("*")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// 新增一条账目
export async function POST(req: Request) {
  const supabase = await createClient();
  const body = await req.json();
  const { username, entry_date, stake, payout, note } = body;

  if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });
  if (stake == null || payout == null) {
    return NextResponse.json({ error: "stake 和 payout 必填" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ledger_entries")
    .insert({
      username,
      entry_date: entry_date || new Date().toISOString().slice(0, 10),
      stake: Number(stake),
      payout: Number(payout),
      note: note || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// 删除一条账目（仅本人可删）
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const username = searchParams.get("username");
  if (!id || !username) return NextResponse.json({ error: "id 和 username 必填" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("ledger_entries")
    .delete()
    .eq("id", id)
    .eq("username", username);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
