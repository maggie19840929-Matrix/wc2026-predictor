"use client";

import { useEffect, useState, useCallback } from "react";
import { getUsername } from "@/lib/username";

interface Entry {
  username: string;
  stake: number;
  payout: number;
}

const LS_INITIAL = "wc26_bankroll_initial";
const LS_BETPCT = "wc26_bankroll_betpct";
const LS_STOPPCT = "wc26_bankroll_stoppct";

export function BankrollPanel() {
  const [username, setUsername] = useState<string | null>(null);
  const [initial, setInitial] = useState<number>(0);
  const [betPct, setBetPct] = useState<number>(8);   // 单注占当前余额比例
  const [stopPct, setStopPct] = useState<number>(40); // 跌破初始的X%即止损
  const [net, setNet] = useState<number>(0);
  const [betCount, setBetCount] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);

  // 读取本地设置
  useEffect(() => {
    setUsername(getUsername());
    const i = Number(localStorage.getItem(LS_INITIAL));
    const b = Number(localStorage.getItem(LS_BETPCT));
    const s = Number(localStorage.getItem(LS_STOPPCT));
    if (i > 0) setInitial(i);
    if (b > 0) setBetPct(b);
    if (s > 0) setStopPct(s);
    if (!(i > 0)) setEditing(true); // 没设过预算就直接进编辑
  }, []);

  // 拉账本算净盈亏
  const load = useCallback(async () => {
    const u = getUsername();
    if (!u) { setLoaded(true); return; }
    try {
      const res = await fetch("/api/ledger");
      const data: Entry[] = await res.json();
      if (Array.isArray(data)) {
        const mine = data.filter((e) => e.username === u);
        setNet(mine.reduce((s, e) => s + (Number(e.payout) - Number(e.stake)), 0));
        setBetCount(mine.length);
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  function save() {
    localStorage.setItem(LS_INITIAL, String(initial));
    localStorage.setItem(LS_BETPCT, String(betPct));
    localStorage.setItem(LS_STOPPCT, String(stopPct));
    setEditing(false);
  }

  const currentBalance = initial + net;
  const stopLine = Math.round(initial * (1 - stopPct / 100));
  const suggestedBet = Math.max(1, Math.round(currentBalance * betPct / 100));
  const distanceToStop = currentBalance - stopLine;
  const triggered = initial > 0 && currentBalance <= stopLine;
  // 余额相对初始的百分比（用于进度条，0~150%映射）
  const balancePct = initial > 0 ? Math.max(0, Math.min(150, currentBalance / initial * 100)) : 0;
  const stopMarkerPct = (100 - stopPct) / 150 * 100; // 止损线在0~150轴上的位置

  const balanceColor = currentBalance >= initial ? "text-emerald-400"
    : triggered ? "text-red-400" : "text-yellow-400";
  const barColor = currentBalance >= initial ? "bg-emerald-500"
    : triggered ? "bg-red-500" : "bg-yellow-500";

  if (!username) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center text-sm text-gray-500">
        请先在首页设置昵称，再使用资金管理
      </div>
    );
  }

  // 编辑态
  if (editing) {
    return (
      <div className="bg-gray-900 border border-cyan-500/30 rounded-2xl p-5 space-y-4">
        <p className="text-sm font-semibold text-cyan-300">⚙️ 资金管理设置</p>
        <div className="space-y-3">
          <Field label="本届总预算 ¥" hint="整个世界杯打算投入的总额，输光即止">
            <input type="number" inputMode="decimal" value={initial || ""} placeholder="1000"
              onChange={(e) => setInitial(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-center font-bold focus:outline-none focus:border-cyan-500" />
          </Field>
          <Field label="单注比例 %" hint="每注占当前余额的比例，建议 5~10%，越小越稳">
            <input type="number" inputMode="decimal" value={betPct || ""} placeholder="8"
              onChange={(e) => setBetPct(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-center font-bold focus:outline-none focus:border-cyan-500" />
          </Field>
          <Field label="止损线 %" hint="亏掉初始预算的百分之多少就收手，建议 30~50%">
            <input type="number" inputMode="decimal" value={stopPct || ""} placeholder="40"
              onChange={(e) => setStopPct(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-center font-bold focus:outline-none focus:border-cyan-500" />
          </Field>
        </div>
        <button onClick={save} disabled={!(initial > 0)}
          className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white font-bold text-sm">
          保存
        </button>
      </div>
    );
  }

  return (
    <div className={`relative rounded-2xl border ${triggered ? "border-red-500/50" : "border-cyan-500/30"} bg-gray-950 overflow-hidden`}>
      <div className="relative p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${barColor} animate-pulse`} />
            <span className="text-xs font-mono text-gray-500 tracking-widest">BANKROLL · 资金管理</span>
          </div>
          <button onClick={() => setEditing(true)} className="text-xs text-gray-600 hover:text-cyan-400">⚙️ 设置</button>
        </div>

        {/* 核心数字 */}
        <div className="grid grid-cols-3 gap-3">
          <Cell label="当前余额" value={`¥${currentBalance}`} color={balanceColor} />
          <Cell label="净盈亏" value={`${net >= 0 ? "+" : ""}¥${net}`} color={net >= 0 ? "text-emerald-400" : "text-red-400"} sub={`${betCount}次`} />
          <Cell label="建议单注" value={`¥${suggestedBet}`} color="text-white" sub={`余额${betPct}%`} />
        </div>

        {/* 资金条：止损线 → 初始 → 盈利 */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono text-gray-600">
            <span>止损 ¥{stopLine}</span>
            <span>初始 ¥{initial}</span>
          </div>
          <div className="relative h-2.5 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
            <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${balancePct / 150 * 100}%` }} />
            {/* 初始预算100%位置标线 */}
            <div className="absolute top-0 bottom-0 w-px bg-gray-500" style={{ left: `${100 / 150 * 100}%` }} />
            {/* 止损线标记 */}
            <div className="absolute top-0 bottom-0 w-px bg-red-500/70" style={{ left: `${stopMarkerPct}%` }} />
          </div>
        </div>

        {/* 状态提示 */}
        {triggered ? (
          <div className="border border-red-500/40 bg-red-950/30 rounded-xl px-4 py-3 text-center">
            <p className="text-red-400 font-bold text-sm">🛑 已触及止损线，建议本届收手</p>
            <p className="text-gray-500 text-xs mt-1">愿赌服输，及时离场也是赢</p>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-gray-900/60 border border-gray-800 rounded-xl px-4 py-2.5">
            <span className="text-xs text-gray-500 font-mono">距止损线</span>
            <span className="text-sm font-bold font-mono text-gray-300">还有 ¥{distanceToStop}</span>
          </div>
        )}

        <p className="text-center text-xs text-gray-700 font-mono">
          {loaded ? "// 余额随账本自动更新 · 固定比例 · 严守止损" : "加载中..."}
        </p>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-400">{label}</p>
      {children}
      <p className="text-xs text-gray-600">{hint}</p>
    </div>
  );
}

function Cell({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="bg-gray-900/60 rounded-xl p-3 text-center border border-gray-800">
      <p className="text-xs text-gray-600 font-mono mb-1">{label}</p>
      <p className={`text-base font-black font-mono ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}
