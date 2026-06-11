"use client";

import { useEffect, useState, useCallback } from "react";
import { getUsername } from "@/lib/username";

interface Entry {
  id: string;
  username: string;
  entry_date: string;
  stake: number;
  payout: number;
  note: string | null;
  created_at: string;
}

interface PersonSummary {
  username: string;
  totalStake: number;
  totalPayout: number;
  net: number;
  roi: number;
  days: number;
}

export function LedgerClient() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [username, setUsernameState] = useState<string | null>(null);

  // 表单状态
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [stake, setStake] = useState("");
  const [payout, setPayout] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/ledger");
    const data = await res.json();
    if (Array.isArray(data)) setEntries(data);
    setLoaded(true);
  }, []);

  useEffect(() => {
    setUsernameState(getUsername());
    load();
  }, [load]);

  async function submit() {
    if (!username) { setMsg("请先在首页设置昵称"); return; }
    if (stake === "" || payout === "") { setMsg("投入和收回都要填"); return; }
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, entry_date: date, stake: Number(stake), payout: Number(payout), note }),
    });
    setSaving(false);
    if (res.ok) {
      setStake(""); setPayout(""); setNote("");
      setMsg("记账成功 ✓");
      load();
      setTimeout(() => setMsg(""), 1500);
    } else {
      setMsg("记账失败");
    }
  }

  async function remove(id: string) {
    if (!username) return;
    if (!confirm("确定删除这条记录？")) return;
    await fetch(`/api/ledger?id=${id}&username=${encodeURIComponent(username)}`, { method: "DELETE" });
    load();
  }

  // 计算每人汇总
  const summaries: PersonSummary[] = (() => {
    const map = new Map<string, PersonSummary>();
    for (const e of entries) {
      const s = map.get(e.username) ?? { username: e.username, totalStake: 0, totalPayout: 0, net: 0, roi: 0, days: 0 };
      s.totalStake += Number(e.stake);
      s.totalPayout += Number(e.payout);
      s.days += 1;
      map.set(e.username, s);
    }
    const arr = Array.from(map.values());
    for (const s of arr) {
      s.net = s.totalPayout - s.totalStake;
      s.roi = s.totalStake > 0 ? Math.round(s.net / s.totalStake * 1000) / 10 : 0;
    }
    return arr.sort((a, b) => b.net - a.net);
  })();

  const myPreviewProfit = stake !== "" && payout !== "" ? Number(payout) - Number(stake) : null;

  return (
    <div className="space-y-6">
      {/* 记账表单 */}
      <div className="bg-gray-900 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-emerald-300">✍️ 记一笔</p>
          {username ? (
            <span className="text-xs text-emerald-400">{username}</span>
          ) : (
            <span className="text-xs text-red-400">未设置昵称</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">日期</p>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">备注（可选）</p>
            <input
              type="text"
              placeholder="买了啥"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">投入 ¥</p>
            <input
              type="number"
              inputMode="decimal"
              placeholder="170"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-center font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">收回 ¥（全输填0）</p>
            <input
              type="number"
              inputMode="decimal"
              placeholder="306"
              value={payout}
              onChange={(e) => setPayout(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-center font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {myPreviewProfit !== null && (
          <p className="text-center text-sm font-mono">
            本笔盈亏：
            <span className={myPreviewProfit >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
              {myPreviewProfit >= 0 ? " +" : " "}¥{myPreviewProfit}
            </span>
          </p>
        )}

        <button
          disabled={saving || !username}
          onClick={submit}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold text-sm transition-all"
        >
          {saving ? "记账中..." : "记一笔"}
        </button>
        {msg && (
          <p className={`text-center text-sm ${msg.includes("✓") ? "text-emerald-400" : "text-red-400"}`}>{msg}</p>
        )}
      </div>

      {/* 排行榜（按净盈亏） */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-300">💰 盈亏榜</p>
          <p className="text-xs text-gray-600">世界杯累计</p>
        </div>
        {summaries.length === 0 ? (
          <p className="text-center py-8 text-gray-500 text-sm">还没有记录，记第一笔吧！</p>
        ) : (
          summaries.map((s, i) => (
            <div key={s.username} className={`flex items-center gap-3 px-5 py-3.5 border-b border-gray-800/50 last:border-0 ${i === 0 && s.net > 0 ? "bg-yellow-400/5" : ""}`}>
              <span className="w-7 text-center text-lg">
                {i === 0 && s.net > 0 ? "👑" : i === summaries.length - 1 && s.net < 0 ? "🤡" : `${i + 1}`}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{s.username}</p>
                <p className="text-xs text-gray-500">投 ¥{s.totalStake} · 回 ¥{s.totalPayout} · {s.days}天</p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-black font-mono ${s.net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {s.net >= 0 ? "+" : ""}¥{s.net}
                </p>
                <p className={`text-xs font-mono ${s.roi >= 0 ? "text-emerald-500/70" : "text-red-500/70"}`}>
                  ROI {s.roi >= 0 ? "+" : ""}{s.roi}%
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 流水明细 */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <p className="text-sm font-semibold text-gray-300">📜 流水明细</p>
        </div>
        {!loaded ? (
          <p className="text-center py-8 text-gray-600 text-sm">加载中...</p>
        ) : entries.length === 0 ? (
          <p className="text-center py-8 text-gray-500 text-sm">暂无记录</p>
        ) : (
          entries.map((e) => {
            const profit = Number(e.payout) - Number(e.stake);
            const mine = e.username === username;
            return (
              <div key={e.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-800/50 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white text-sm">{e.username}</span>
                    <span className="text-xs text-gray-600">{e.entry_date.slice(5)}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    投¥{e.stake} → 回¥{e.payout}{e.note ? ` · ${e.note}` : ""}
                  </p>
                </div>
                <span className={`text-sm font-black font-mono ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {profit >= 0 ? "+" : ""}¥{profit}
                </span>
                {mine && (
                  <button onClick={() => remove(e.id)} className="text-gray-700 hover:text-red-400 text-xs">删</button>
                )}
              </div>
            );
          })
        )}
      </div>

      <p className="text-center text-xs text-gray-700 font-mono">// 如实记账 · 愿赌服输 · 世界杯结束见真章</p>
    </div>
  );
}
