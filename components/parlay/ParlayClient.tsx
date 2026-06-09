"use client";

import { useState, useMemo } from "react";
import { buildMatchCandidates, buildStrategy } from "@/lib/parlay";
import type { StrategyMode, DailyStrategy, BetPool, PoolBetAllocation } from "@/lib/parlay";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface MatchInput {
  id: string;
  homeTeam: string;
  awayTeam: string;
  utcDate: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  communityHome: number;
  communityDraw: number;
  communityAway: number;
  totalPredictions: number;
}

export function ParlayClient({ matches }: { matches: MatchInput[] }) {
  const [budget, setBudget] = useState(100);
  const [inputVal, setInputVal] = useState("100");
  const [mode, setMode] = useState<StrategyMode>("balanced");

  const { candidates, strategy } = useMemo(() => {
    const candidates = buildMatchCandidates(matches);
    const strategy = buildStrategy(candidates, budget, mode);
    return { candidates, strategy };
  }, [matches, budget, mode]);

  if (matches.length === 0) {
    return (
      <EmptyState icon="📭" title="未来3天暂无赛程" desc="请先同步比赛 & 录入赔率" />
    );
  }
  if (candidates.length === 0) {
    return (
      <EmptyState icon="🔍" title="暂无正期望场次"
        desc={`找到 ${matches.length} 场比赛，目前未发现明显价值盘，等待更多预测数据或赔率更新`} />
    );
  }

  return (
    <div className="space-y-5">
      {/* 候选场次 */}
      <CandidatePanel candidates={candidates} />

      {/* 预算 + 模式 */}
      <ControlPanel
        budget={budget} inputVal={inputVal} mode={mode}
        onBudget={(v, s) => { setBudget(v); setInputVal(s); }}
        onMode={setMode}
      />

      {/* 策略卡片 */}
      {strategy.pools.length === 0 ? (
        <EmptyState icon="💡" title="当前模式无合适注单" desc="尝试切换到「均衡」或「激进」模式" />
      ) : (
        <StrategyCard strategy={strategy} />
      )}
    </div>
  );
}

// ── 候选场次 ───────────────────────────────────────────────

function CandidatePanel({ candidates }: { candidates: ReturnType<typeof buildMatchCandidates> }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
      <p className="text-xs font-mono text-gray-500 tracking-widest">TODAY&apos;S CANDIDATES · {candidates.length} 场</p>
      <div className="space-y-2">
        {candidates.map((c) => (
          <div key={c.matchId} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{c.homeTeam} <span className="text-gray-600">vs</span> {c.awayTeam}</span>
              <span className="text-gray-600 text-xs font-mono">
                {format(new Date(c.utcDate), "MM/dd HH:mm", { locale: zhCN })}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {c.outcomes.map((o) => (
                <span key={o.outcome}
                  className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold border ${
                    o.isPrimary
                      ? "bg-cyan-950/50 border-cyan-500/40 text-cyan-400"
                      : "bg-gray-800/60 border-gray-700 text-gray-400"
                  }`}>
                  {o.teamLabel} {o.outcomeLabel} @{o.odds}
                  <span className="text-emerald-400 ml-1">+{(o.edge * 100).toFixed(1)}%</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 控制面板 ───────────────────────────────────────────────

function ControlPanel({ budget, inputVal, mode, onBudget, onMode }: {
  budget: number;
  inputVal: string;
  mode: StrategyMode;
  onBudget: (v: number, s: string) => void;
  onMode: (m: StrategyMode) => void;
}) {
  const presets = [50, 100, 200, 500];
  const modes: { key: StrategyMode; label: string; desc: string; color: string }[] = [
    { key: "conservative", label: "保守", desc: "单关+2串1", color: "border-emerald-500/60 text-emerald-400" },
    { key: "balanced",     label: "均衡", desc: "2串1+3串1", color: "border-yellow-500/60 text-yellow-400" },
    { key: "aggressive",   label: "激进", desc: "全类型覆盖", color: "border-red-500/60 text-red-400" },
  ];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
      {/* 预算 */}
      <div className="space-y-2">
        <p className="text-xs font-mono text-gray-500 tracking-widest">TODAY&apos;S BUDGET</p>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-mono text-xl">¥</span>
          <input
            type="number" min={10} max={100000} value={inputVal}
            onChange={(e) => {
              onBudget(isNaN(parseInt(e.target.value)) ? budget : Math.max(10, parseInt(e.target.value)), e.target.value);
            }}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white font-mono text-xl font-bold focus:outline-none focus:border-cyan-500 text-center"
          />
        </div>
        <div className="flex gap-2">
          {presets.map((v) => (
            <button key={v} onClick={() => onBudget(v, String(v))}
              className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all ${
                budget === v ? "bg-cyan-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}>¥{v}</button>
          ))}
        </div>
      </div>

      {/* 模式 */}
      <div className="space-y-2 border-t border-gray-800 pt-4">
        <p className="text-xs font-mono text-gray-500 tracking-widest">STRATEGY MODE</p>
        <div className="grid grid-cols-3 gap-2">
          {modes.map(({ key, label, desc, color }) => (
            <button key={key} onClick={() => onMode(key)}
              className={`border rounded-xl p-3 text-center transition-all ${
                mode === key ? `${color} bg-black/50` : "border-gray-700 text-gray-500 hover:border-gray-600"
              }`}>
              <p className="font-bold text-sm">{label}</p>
              <p className="text-xs mt-0.5 opacity-70">{desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 策略卡片 ───────────────────────────────────────────────

function StrategyCard({ strategy }: { strategy: DailyStrategy }) {
  const c = {
    conservative: { border: "border-emerald-500/50", text: "text-emerald-400", bar: "bg-emerald-500", dot: "bg-emerald-400" },
    balanced:     { border: "border-yellow-500/50",  text: "text-yellow-400",  bar: "bg-yellow-500",  dot: "bg-yellow-400"  },
    aggressive:   { border: "border-red-500/50",     text: "text-red-400",     bar: "bg-red-500",     dot: "bg-red-400"     },
  }[strategy.mode];

  const evPositive = strategy.expectedValue >= 0;

  return (
    <div className={`relative rounded-2xl border ${c.border} bg-gray-950 shadow-xl overflow-hidden`}>
      {/* 网格背景 */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
      <div className={`absolute top-2 left-2 w-3 h-3 border-t border-l ${c.border} opacity-70`} />
      <div className={`absolute top-2 right-2 w-3 h-3 border-t border-r ${c.border} opacity-70`} />
      <div className={`absolute bottom-2 left-2 w-3 h-3 border-b border-l ${c.border} opacity-70`} />
      <div className={`absolute bottom-2 right-2 w-3 h-3 border-b border-r ${c.border} opacity-70`} />

      <div className="relative p-5 space-y-5">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-pulse`} />
            <span className="text-xs font-mono text-gray-500 tracking-widest">
              COVERAGE PARLAY · {strategy.modeLabel}模式
            </span>
          </div>
          <span className={`text-xs font-mono font-bold ${c.text}`}>预算 ¥{strategy.budget}</span>
        </div>

        {/* 各池 */}
        {strategy.pools.map((pool) => (
          <PoolSection key={pool.legs} pool={pool} modeColor={c} />
        ))}

        {/* 汇总 */}
        <div className="border-t border-gray-800 pt-4 space-y-3">
          <p className="text-xs font-mono text-gray-600 tracking-widest">PORTFOLIO SUMMARY</p>
          <div className="grid grid-cols-3 gap-3">
            <SummaryCell label="总投注" value={`¥${strategy.totalBet}`}
              sub={`预算 ${Math.round(strategy.totalBet / strategy.budget * 100)}%`} color="text-white" />
            <SummaryCell label="预留资金" value={`¥${strategy.reserved}`} sub="防守资金" color="text-gray-400" />
            <SummaryCell label="数学期望"
              value={`${evPositive ? "+" : ""}¥${strategy.expectedValue}`}
              sub={evPositive ? "正期望 ✓" : "负期望"}
              color={evPositive ? "text-emerald-400" : "text-red-400"} />
          </div>
          <div className={`border ${c.border} bg-black/50 rounded-xl px-4 py-3 flex items-center justify-between`}>
            <div>
              <p className="text-xs font-mono text-gray-500">BEST SINGLE RETURN</p>
              <p className={`text-2xl font-black font-mono ${c.text}`}>¥{strategy.bestCaseReturn}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-mono text-gray-500">MAX LOSS</p>
              <p className="text-xl font-black font-mono text-gray-600">-¥{strategy.totalBet}</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-700 font-mono">// Kelly Coverage · 理性博彩 · 量力而行</p>
      </div>
    </div>
  );
}

// ── 单池展示 ───────────────────────────────────────────────

function PoolSection({ pool, modeColor }: { pool: BetPool; modeColor: { border: string; text: string; bar: string } }) {
  const hasMultiple = pool.allocations.length > 1;

  return (
    <div className="space-y-2">
      {/* 池标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full border ${modeColor.border} ${modeColor.text} bg-black/40`}>
            {pool.label}
          </span>
          {hasMultiple && (
            <span className="text-xs text-gray-600 font-mono">{pool.allocations.length}注覆盖</span>
          )}
        </div>
        <span className="text-xs font-mono text-gray-400">总 ¥{pool.totalAmount}</span>
      </div>

      {/* 注单列表 */}
      <div className="space-y-2">
        {pool.allocations.map((alloc, idx) => (
          <BetRow key={alloc.bet.id} alloc={alloc} idx={idx} isPrimary={alloc.bet.isPrimaryCombo} modeColor={modeColor} />
        ))}
      </div>
    </div>
  );
}

function BetRow({ alloc, idx, isPrimary, modeColor }: {
  alloc: PoolBetAllocation;
  idx: number;
  isPrimary: boolean;
  modeColor: { border: string; text: string; bar: string };
}) {
  const { bet, amount, maxReturn } = alloc;

  return (
    <div className={`rounded-xl border p-3 space-y-2 ${
      isPrimary
        ? `border-gray-700 bg-gray-900/70`
        : `border-gray-800/60 bg-gray-900/30`
    }`}>
      {/* 选择明细 */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 flex-1 min-w-0">
          {bet.selections.map((s) => (
            <div key={`${s.matchId}:${s.outcome}`} className="flex items-center gap-2 text-xs">
              <span className="text-gray-600 font-mono shrink-0">
                {format(new Date(s.utcDate), "MM/dd", { locale: zhCN })}
              </span>
              <span className="text-gray-400 truncate">{s.homeTeam} vs {s.awayTeam}</span>
              <span className={`shrink-0 font-bold ${s.isPrimary ? "text-cyan-400" : "text-gray-400"}`}>
                {s.teamLabel} {s.outcomeLabel}
              </span>
              <span className="text-yellow-400 font-mono font-bold shrink-0">@{s.odds}</span>
            </div>
          ))}
        </div>
        <div className="text-right shrink-0 space-y-0.5">
          <div className="flex items-center gap-1 justify-end">
            <span className="text-xs text-gray-600 font-mono">联合</span>
            <span className="text-sm font-black text-white font-mono">{bet.combinedOdds}</span>
          </div>
          <div className="text-xs text-gray-600 font-mono">
            全中 {(bet.jointProb * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* 概率条 */}
      <div className="h-0.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${isPrimary ? modeColor.bar : "bg-gray-600"}`}
          style={{ width: `${Math.max(2, bet.jointProb * 100)}%` }} />
      </div>

      {/* 金额行 */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-gray-600 font-mono">投注 </span>
          <span className={`text-base font-black font-mono ${isPrimary ? "text-white" : "text-gray-400"}`}>¥{amount}</span>
        </div>
        <div>
          <span className="text-xs text-gray-600 font-mono">全中→ </span>
          <span className={`text-base font-black font-mono ${modeColor.text}`}>¥{maxReturn}</span>
        </div>
        <div>
          <span className={`text-xs font-bold font-mono ${bet.expectedValue > 0 ? "text-emerald-400" : "text-gray-600"}`}>
            EV {bet.expectedValue > 0 ? "+" : ""}{(bet.expectedValue * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function SummaryCell({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-gray-900/60 rounded-xl p-3 text-center border border-gray-800">
      <p className="text-xs text-gray-600 font-mono mb-1">{label}</p>
      <p className={`text-sm font-black font-mono ${color}`}>{value}</p>
      <p className="text-xs text-gray-600 mt-0.5">{sub}</p>
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center space-y-3">
      <p className="text-4xl">{icon}</p>
      <p className="text-gray-300 font-semibold">{title}</p>
      <p className="text-gray-500 text-sm">{desc}</p>
    </div>
  );
}
