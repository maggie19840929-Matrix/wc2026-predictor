"use client";

import { useState } from "react";
import type { TotalsOdds } from "@/lib/odds-api";

interface Props {
  matchId: string;
  totalsDetail: TotalsOdds[];
  initialLine?: number;
  initialOver?: number;
  initialUnder?: number;
}

/** 各庄大小球共识：取最多庄家的盘口线，平均去水 */
function consensus(totals: TotalsOdds[]) {
  if (!totals || totals.length === 0) return null;
  const counts: Record<string, number> = {};
  for (const t of totals) {
    const k = String(t.line);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  let modalLine = totals[0].line, best = 0;
  for (const k of Object.keys(counts)) {
    if (counts[k] > best) { best = counts[k]; modalLine = parseFloat(k); }
  }
  const atLine = totals.filter((t) => t.line === modalLine);
  const avgOver = atLine.reduce((s, t) => s + t.over, 0) / atLine.length;
  const avgUnder = atLine.reduce((s, t) => s + t.under, 0) / atLine.length;
  const ro = 1 / avgOver, ru = 1 / avgUnder, sum = ro + ru;
  return { line: modalLine, avgOver, avgUnder, probOver: ro / sum, probUnder: ru / sum, count: atLine.length };
}

export function TotalsSection({ matchId, totalsDetail, initialLine, initialOver, initialUnder }: Props) {
  const [open, setOpen] = useState(false);
  const [line, setLine] = useState(initialLine?.toString() ?? "2.5");
  const [over, setOver] = useState(initialOver?.toString() ?? "");
  const [under, setUnder] = useState(initialUnder?.toString() ?? "");
  const [ayxLine, setAyxLine] = useState(initialLine);
  const [ayxOver, setAyxOver] = useState(initialOver);
  const [ayxUnder, setAyxUnder] = useState(initialUnder);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const con = consensus(totalsDetail);

  async function save() {
    const l = parseFloat(line), o = parseFloat(over), u = parseFloat(under);
    if (!l || !o || !u) { setMsg("请填写完整"); return; }
    setSaving(true);
    const res = await fetch("/api/totals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match_id: matchId, secret: "my-secret-key-123", line: l, over: o, under: u }),
    });
    setSaving(false);
    if (res.ok) {
      setAyxLine(l); setAyxOver(o); setAyxUnder(u);
      setMsg("保存成功 ✓");
      setTimeout(() => { setOpen(false); setMsg(""); }, 800);
    } else setMsg("保存失败");
  }

  const hasAyx = ayxOver != null && ayxUnder != null && ayxLine != null;
  const lineMatch = con && hasAyx && Math.abs(con.line - ayxLine!) < 0.01;

  // 价值：用市场真实概率 × AYX赔率
  let verdict: null | {
    side: "over" | "under"; label: string; odds: number; ev: number; prob: number; approx: boolean;
  } = null;
  if (con && hasAyx) {
    const evOver = ayxOver! * con.probOver - 1;
    const evUnder = ayxUnder! * con.probUnder - 1;
    const pick = evOver >= evUnder ? "over" : "under";
    verdict = {
      side: pick,
      label: pick === "over" ? `大 ${ayxLine}` : `小 ${ayxLine}`,
      odds: pick === "over" ? ayxOver! : ayxUnder!,
      ev: pick === "over" ? evOver : evUnder,
      prob: pick === "over" ? con.probOver : con.probUnder,
      approx: !lineMatch,
    };
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-300">⚽ 大小球分析</p>
        <button
          onClick={() => setOpen((v) => !v)}
          className={`text-xs underline ${hasAyx ? "text-yellow-400 hover:text-yellow-300" : "text-gray-600 hover:text-yellow-400"}`}
        >
          {hasAyx ? "修改AYX大小球" : "录入AYX大小球"}
        </button>
      </div>

      {/* 市场共识 */}
      {con ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-950 rounded-xl p-3 text-center border border-gray-800">
            <p className="text-xs text-gray-600 font-mono mb-1">市场 大 {con.line}</p>
            <p className="text-lg font-black text-white font-mono">{Math.round(con.probOver * 100)}%</p>
            <p className="text-xs text-gray-500">均赔 {con.avgOver.toFixed(2)}</p>
          </div>
          <div className="bg-gray-950 rounded-xl p-3 text-center border border-gray-800">
            <p className="text-xs text-gray-600 font-mono mb-1">市场 小 {con.line}</p>
            <p className="text-lg font-black text-white font-mono">{Math.round(con.probUnder * 100)}%</p>
            <p className="text-xs text-gray-500">均赔 {con.avgUnder.toFixed(2)}</p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500">市场大小球数据暂未同步（开赛前会有）</p>
      )}

      {/* 录入表单 */}
      {open && (
        <div className="space-y-3 border-t border-gray-800 pt-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">盘口线</p>
              <input type="number" step="0.25" value={line} onChange={(e) => setLine(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-center font-bold focus:outline-none focus:border-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">大球</p>
              <input type="number" step="0.01" placeholder="1.90" value={over} onChange={(e) => setOver(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-center font-bold focus:outline-none focus:border-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">小球</p>
              <input type="number" step="0.01" placeholder="1.90" value={under} onChange={(e) => setUnder(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-center font-bold focus:outline-none focus:border-yellow-400" />
            </div>
          </div>
          <button disabled={saving} onClick={save}
            className="w-full py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-700 text-black font-bold text-sm">
            {saving ? "保存中..." : "保存"}
          </button>
          {msg && <p className={`text-xs text-center ${msg.includes("✓") ? "text-emerald-400" : "text-red-400"}`}>{msg}</p>}
        </div>
      )}

      {/* 价值结论 */}
      {verdict && (
        <div className={`border rounded-xl px-4 py-3 ${verdict.ev > 0 ? "border-emerald-500/40 bg-emerald-950/20" : "border-gray-700 bg-black/30"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-mono">大小球推荐</p>
              <p className={`text-lg font-black ${verdict.ev > 0 ? "text-emerald-400" : "text-gray-300"}`}>
                {verdict.label} @ {verdict.odds}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 font-mono">期望值</p>
              <p className={`text-lg font-black font-mono ${verdict.ev > 0 ? "text-emerald-400" : "text-red-400"}`}>
                {verdict.ev > 0 ? "+" : ""}{(verdict.ev * 100).toFixed(1)}%
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            市场真实概率 {Math.round(verdict.prob * 100)}%
            {verdict.ev > 0 ? " · AYX给的价有价值 ✅" : " · 无价值，建议跳过"}
            {verdict.approx && " ⚠️ AYX盘口线与市场不同，此为近似参考"}
          </p>
        </div>
      )}

      <p className="text-center text-xs text-gray-700 font-mono">// 总进球 大/小 · 同样只下有价值的</p>
    </div>
  );
}
