"use client";

import { useState, useMemo } from "react";
import { buildSelections, generateBets, allocateBudget } from "@/lib/parlay";
import type { StrategyMode, DailyStrategy, ParlayBet, StrategyAllocation } from "@/lib/parlay";
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

  const { selections, bets, strategy } = useMemo(() => {
    const selections = buildSelections(matches);
    const bets = generateBets(selections);
    const strategy = allocateBudget(bets, budget, mode);
    return { selections, bets, strategy };
  }, [matches, budget, mode]);

  if (matches.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center space-y-3">
        <p className="text-4xl">📭</p>
        <p className="text-gray-300 font-semibold">未来3天暂无赛程数据</p>
        <p className="text-gray-500 text-sm">请先同步比赛 &amp; 录入赔率</p>
      </div>
    );
  }

  if (selections.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center space-y-3">
        <p className="text-4xl">🔍</p>
        <p className="text-gray-300 font-semibold">暂无正期望场次</p>
        <p className="text-gray-500 text-sm">
          找到 {matches.length} 场比赛，但目前没有发现明显价值盘<br />
          等待更多预测数据或赔率更新
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 候选场次概览 */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
        <p className="text-xs font-mono text-gray-500 tracking-widest">TODAY&apos;S CANDIDATES</p>
        <div className="space-y-2">
          {selections.map((s) => (
            <div key={s.matchId} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${s.edge > 0.05 ? "bg-emerald-400" : "bg-yellow-400"}`} />
                <span className="text-gray-300 font-medium">{s.homeTeam} vs {s.awayTeam}</span>
              </div>
              <div className="flex items-center gap-3 text-right">
                <span className="text-cyan-400 font-mono font-bold">{s.teamLabel} {s.outcomeLabel}</span>
                <span className="text-yellow-400 font-mono">@{s.odds}</span>
                <span className={`text-xs font-mono ${s.edge > 0.05 ? "text-emerald-400" : "text-gray-500"}`}>
                  +{(s.edge * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 预算 + 模式选择 */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-mono text-gray-500 tracking-widest">TODAY&apos;S BUDGET</p>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 font-mono text-lg">¥</span>
            <input
              type="number"
              min={10}
              max={100000}
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                const n = parseInt(e.target.value);
                if (!isNaN(n) && n >= 10) setBudget(n);
              }}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white font-mono text-xl font-bold focus:outline-none focus:border-cyan-500 text-center"
            />
          </div>
          <div className="flex gap-2">
            {[50, 100, 200, 500].map((v) => (
              <button
                key={v}
                onClick={() => { setBudget(v); setInputVal(String(v)); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  budget === v ? "bg-cyan-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                ¥{v}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 border-t border-gray-800 pt-4">
          <p className="text-xs font-mono text-gray-500 tracking-widest">STRATEGY MODE</p>
          <div className="grid grid-cols-3 gap-2">
            {(["conservative", "balanced", "aggressive"] as StrategyMode[]).map((m) => {
              const labels = { conservative: "保守", balanced: "均衡", aggressive: "激进" };
              const desc = { conservative: "低风险 稳收益", balanced: "均衡配置", aggressive: "高赔率 高收益" };
              const colors = {
                conservative: "border-emerald-500/60 text-emerald-400",
                balanced: "border-yellow-500/60 text-yellow-400",
                aggressive: "border-red-500/60 text-red-400",
              };
              const active = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`border rounded-xl p-3 text-center transition-all ${
                    active
                      ? `${colors[m]} bg-black/50`
                      : "border-gray-700 text-gray-500 hover:border-gray-600"
                  }`}
                >
                  <p className="font-bold text-sm">{labels[m]}</p>
                  <p className="text-xs mt-0.5 opacity-70">{desc[m]}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 策略卡片 */}
      {strategy.allocations.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-500 text-sm">
          当前模式下无合适注单，尝试切换到「均衡」或「激进」
        </div>
      ) : (
        <StrategyCard strategy={strategy} />
      )}
    </div>
  );
}

// ---- 策略卡片 ----

function StrategyCard({ strategy }: { strategy: DailyStrategy }) {
  const modeColors = {
    conservative: { border: "border-emerald-500/50", text: "text-emerald-400", bar: "bg-emerald-500", dot: "bg-emerald-400" },
    balanced: { border: "border-yellow-500/50", text: "text-yellow-400", bar: "bg-yellow-500", dot: "bg-yellow-400" },
    aggressive: { border: "border-red-500/50", text: "text-red-400", bar: "bg-red-500", dot: "bg-red-400" },
  };
  const c = modeColors[strategy.mode];
  const evPositive = strategy.expectedValue >= 0;

  return (
    <div className={`relative rounded-2xl border ${c.border} bg-gray-950 shadow-xl overflow-hidden`}>
      {/* 网格背景 */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
      {/* 角装饰 */}
      <div className={`absolute top-2 left-2 w-3 h-3 border-t border-l ${c.border} opacity-70`} />
      <div className={`absolute top-2 right-2 w-3 h-3 border-t border-r ${c.border} opacity-70`} />
      <div className={`absolute bottom-2 left-2 w-3 h-3 border-b border-l ${c.border} opacity-70`} />
      <div className={`absolute bottom-2 right-2 w-3 h-3 border-b border-r ${c.border} opacity-70`} />

      <div className="relative p-5 space-y-5">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-pulse`} />
            <span className="text-xs font-mono text-gray-500 tracking-widest">PARLAY STRATEGY · {strategy.modeLabel}模式</span>
          </div>
          <span className={`text-xs font-mono font-bold ${c.text}`}>预算 ¥{strategy.budget}</span>
        </div>

        {/* 注单列表 */}
        <div className="space-y-4">
          {strategy.allocations.map((alloc, idx) => (
            <BetCard key={alloc.bet.id} alloc={alloc} idx={idx} modeColor={c} />
          ))}
        </div>

        {/* 分割线 */}
        <div className="border-t border-gray-800" />

        {/* 汇总 */}
        <div className="space-y-3">
          <p className="text-xs font-mono text-gray-600 tracking-widest">PORTFOLIO SUMMARY</p>
          <div className="grid grid-cols-3 gap-3">
            <SummaryCell label="总投注" value={`¥${strategy.totalBet}`} sub={`预算 ${Math.round(strategy.totalBet / strategy.budget * 100)}%`} color="text-white" />
            <SummaryCell label="预留资金" value={`¥${strategy.reserved}`} sub="防守资金" color="text-gray-400" />
            <SummaryCell
              label="数学期望"
              value={`${evPositive ? "+" : ""}¥${strategy.expectedValue}`}
              sub={evPositive ? "正期望" : "负期望"}
              color={evPositive ? "text-emerald-400" : "text-red-400"}
            />
          </div>

          {/* 最大收益展示 */}
          <div className={`border ${c.border} bg-black/50 rounded-xl px-4 py-3`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-gray-500 mb-1">MAX SINGLE-BET RETURN</p>
                <p className={`text-2xl font-black font-mono ${c.text}`}>¥{strategy.bestCaseReturn}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono text-gray-500 mb-1">WORST CASE</p>
                <p className="text-lg font-black font-mono text-gray-600">-¥{strategy.totalBet}</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-700 font-mono">// Kelly Criterion · 理性博彩 · 量力而行</p>
      </div>
    </div>
  );
}

function BetCard({ alloc, idx, modeColor }: {
  alloc: StrategyAllocation;
  idx: number;
  modeColor: { border: string; text: string; bar: string; dot: string };
}) {
  const { bet, amount, maxReturn } = alloc;
  const riskColors = {
    safe: "text-emerald-400 border-emerald-500/30 bg-emerald-950/20",
    medium: "text-yellow-400 border-yellow-500/30 bg-yellow-950/20",
    bold: "text-red-400 border-red-500/30 bg-red-950/20",
  };
  const riskLabels = { safe: "稳", medium: "中", bold: "险" };

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-3">
      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-600">#{String(idx + 1).padStart(2, "0")}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border font-mono ${riskColors[bet.risk]}`}>
            {bet.label} · {riskLabels[bet.risk]}
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-sm">
          <span className="text-gray-500">联合赔率</span>
          <span className="text-white font-black text-base">{bet.combinedOdds}</span>
        </div>
      </div>

      {/* 选择明细 */}
      <div className="space-y-1.5">
        {bet.selections.map((s) => (
          <div key={s.matchId} className="flex items-center justify-between text-xs">
            <span className="text-gray-500 font-mono">
              {format(new Date(s.utcDate), "MM/dd HH:mm", { locale: zhCN })}
              {" · "}
              <span className="text-gray-400">{s.homeTeam} vs {s.awayTeam}</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-bold">{s.teamLabel} {s.outcomeLabel}</span>
              <span className="text-yellow-400 font-mono font-bold">@{s.odds}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 概率条 */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-mono text-gray-600">
          <span>全中概率</span>
          <span>{(bet.jointProb * 100).toFixed(1)}%</span>
        </div>
        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${modeColor.bar}`} style={{ width: `${Math.min(100, bet.jointProb * 100)}%` }} />
        </div>
      </div>

      {/* 金额行 */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-800">
        <div>
          <p className="text-xs text-gray-600 font-mono">建议投注</p>
          <p className="text-lg font-black text-white font-mono">¥{amount}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-600 font-mono">全中收益</p>
          <p className={`text-lg font-black font-mono ${modeColor.text}`}>¥{maxReturn}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-600 font-mono">期望净值</p>
          <p className={`text-sm font-bold font-mono ${bet.expectedValue > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {bet.expectedValue > 0 ? "+" : ""}{(bet.expectedValue * 100).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryCell({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-gray-900/60 rounded-xl p-3 text-center border border-gray-800">
      <p className="text-xs text-gray-600 font-mono mb-1">{label}</p>
      <p className={`text-base font-black font-mono ${color}`}>{value}</p>
      <p className="text-xs text-gray-600 mt-0.5">{sub}</p>
    </div>
  );
}
