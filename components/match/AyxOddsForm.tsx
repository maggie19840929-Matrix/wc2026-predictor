"use client";

import { useState } from "react";

interface Props {
  matchId: string;
  initialHome?: number;
  initialDraw?: number;
  initialAway?: number;
  onSaved: (home: number, draw: number, away: number) => void;
}

export function AyxOddsForm({ matchId, initialHome, initialDraw, initialAway, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [home, setHome] = useState(initialHome?.toString() ?? "");
  const [draw, setDraw] = useState(initialDraw?.toString() ?? "");
  const [away, setAway] = useState(initialAway?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    const h = parseFloat(home);
    const d = parseFloat(draw);
    const a = parseFloat(away);
    if (!h || !d || !a) { setMsg("请填写完整赔率"); return; }

    setSaving(true);
    const res = await fetch("/api/odds", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match_id: matchId, home_odds: h, draw_odds: d, away_odds: a, secret: "my-secret-key-123" }),
    });
    setSaving(false);

    if (res.ok) {
      setMsg("保存成功 ✓");
      onSaved(h, d, a);
      setTimeout(() => setOpen(false), 800);
    } else {
      setMsg("保存失败");
    }
  }

  if (!open) {
    const hasOdds = initialHome && initialDraw && initialAway;
    return (
      <button
        onClick={() => setOpen(true)}
        className={`text-xs underline transition-colors ${hasOdds ? "text-yellow-400 hover:text-yellow-300" : "text-gray-600 hover:text-yellow-400"}`}
      >
        ✏️ {hasOdds ? "修改爱游戏赔率" : "录入爱游戏赔率"}
      </button>
    );
  }

  return (
    <div className="bg-gray-900 border border-yellow-400/30 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-yellow-300">录入爱游戏赔率</p>
        <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white text-lg">×</button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-xs text-gray-500 mb-1">主胜</p>
          <input
            type="number" step="0.01" placeholder="1.41"
            value={home} onChange={(e) => setHome(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-center font-bold focus:outline-none focus:border-yellow-400"
          />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">和局</p>
          <input
            type="number" step="0.01" placeholder="4.20"
            value={draw} onChange={(e) => setDraw(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-center font-bold focus:outline-none focus:border-yellow-400"
          />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">客胜</p>
          <input
            type="number" step="0.01" placeholder="7.40"
            value={away} onChange={(e) => setAway(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-center font-bold focus:outline-none focus:border-yellow-400"
          />
        </div>
      </div>
      <button
        disabled={saving} onClick={save}
        className="w-full py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-700 text-black font-bold text-sm"
      >
        {saving ? "保存中..." : "保存"}
      </button>
      {msg && (
        <p className={`text-xs text-center ${msg.includes("✓") ? "text-emerald-400" : "text-red-400"}`}>{msg}</p>
      )}
    </div>
  );
}
