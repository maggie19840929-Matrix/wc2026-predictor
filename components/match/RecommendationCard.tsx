"use client";

import type { RecommendationResult } from "@/lib/recommendation";

interface Props {
  result: RecommendationResult;
  homeTeam: string;
  awayTeam: string;
  communityHome: number;
  communityDraw: number;
  communityAway: number;
  hasSubjective: boolean;
  hasH2H: boolean;
}

const OUTCOME_LABELS: Record<string, string> = {
  HOME: "主胜",
  DRAW: "平局",
  AWAY: "客胜",
};

interface Verdict {
  label: string;
  color: string;
  glow: string;
  border: string;
  bg: string;
  icon: string;
}

function getVerdict(confidence: number): Verdict {
  if (confidence >= 75) return {
    label: "强烈推荐",
    color: "text-emerald-400",
    glow: "shadow-emerald-500/50",
    border: "border-emerald-500/60",
    bg: "from-emerald-950/80 to-gray-950",
    icon: "🟢",
  };
  if (confidence >= 60) return {
    label: "可以考虑",
    color: "text-yellow-400",
    glow: "shadow-yellow-500/50",
    border: "border-yellow-500/60",
    bg: "from-yellow-950/80 to-gray-950",
    icon: "🟡",
  };
  if (confidence >= 45) return {
    label: "谨慎观望",
    color: "text-orange-400",
    glow: "shadow-orange-500/40",
    border: "border-orange-500/50",
    bg: "from-orange-950/60 to-gray-950",
    icon: "🟠",
  };
  return {
    label: "不建议投注",
    color: "text-red-400",
    glow: "shadow-red-500/40",
    border: "border-red-500/50",
    bg: "from-red-950/60 to-gray-950",
    icon: "🔴",
  };
}

function DimensionBar({
  label,
  value,      // 0-100
  display,
  color,
}: {
  label: string;
  value: number;
  display: string;
  color: string;
}) {
  return (
    <div className="grid grid-cols-[90px_1fr_56px] items-center gap-3">
      <span className="text-xs text-gray-500 font-mono tracking-wider uppercase">{label}</span>
      <div className="relative h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.max(4, value)}%` }}
        />
        {/* 扫描光效 */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
      </div>
      <span className={`text-xs font-bold font-mono text-right ${color.replace("bg-", "text-").replace("-500", "-400").replace("-400", "-400")}`}>
        {display}
      </span>
    </div>
  );
}

export function RecommendationCard({
  result,
  homeTeam,
  awayTeam,
  communityHome,
  communityDraw,
  communityAway,
  hasSubjective,
  hasH2H,
}: Props) {
  const verdict = getVerdict(result.confidence);
  const teamLabel =
    result.outcome === "HOME" ? homeTeam
    : result.outcome === "AWAY" ? awayTeam
    : "平局";

  // 各维度分数（可视化用）
  const communityVal = result.outcome === "HOME" ? communityHome
    : result.outcome === "DRAW" ? communityDraw : communityAway;

  // 赔率价值 edge 归一化到0-100
  const ayxEdgePct = Math.min(100, Math.max(0, 50 + (result.ayxOdds > 1 ? (1 / result.ayxOdds) * 100 : 50)));

  const dimensions = [
    {
      label: "社区预测",
      value: communityVal,
      display: `${Math.round(communityVal)}%`,
      color: communityVal >= 50 ? "bg-emerald-500" : communityVal >= 35 ? "bg-yellow-500" : "bg-red-500",
    },
    {
      label: "赔率价值",
      value: ayxEdgePct,
      display: `${result.ayxOdds}`,
      color: result.ayxOdds >= 2 ? "bg-cyan-500" : result.ayxOdds >= 1.5 ? "bg-blue-500" : "bg-gray-500",
    },
    {
      label: "近期状态",
      value: result.reasons.some(r => r.includes("状态明显")) ? 80 : 50,
      display: result.reasons.some(r => r.includes("状态明显更佳")) ? "强势" : "平均",
      color: result.reasons.some(r => r.includes("状态明显更佳")) ? "bg-violet-500" : "bg-gray-600",
    },
    {
      label: "历史交锋",
      value: hasH2H ? (result.reasons.some(r => r.includes("交锋")) ? 70 : 50) : 20,
      display: hasH2H ? "已分析" : "数据少",
      color: hasH2H ? "bg-pink-500" : "bg-gray-700",
    },
    {
      label: "主观评估",
      value: hasSubjective ? (result.reasons.some(r => r.includes("动力") || r.includes("场地") || r.includes("状态")) ? 75 : 55) : 0,
      display: hasSubjective ? "已录入" : "待录入",
      color: hasSubjective ? "bg-amber-500" : "bg-gray-700",
    },
  ];

  return (
    <div className={`relative rounded-2xl border ${verdict.border} bg-gradient-to-b ${verdict.bg} overflow-hidden shadow-xl ${verdict.glow}`}>

      {/* 顶部扫描线装饰 */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-60" />

      {/* 网格背景 */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* 角落装饰 */}
      <div className={`absolute top-2 left-2 w-3 h-3 border-t border-l ${verdict.border} opacity-80`} />
      <div className={`absolute top-2 right-2 w-3 h-3 border-t border-r ${verdict.border} opacity-80`} />
      <div className={`absolute bottom-2 left-2 w-3 h-3 border-b border-l ${verdict.border} opacity-80`} />
      <div className={`absolute bottom-2 right-2 w-3 h-3 border-b border-r ${verdict.border} opacity-80`} />

      <div className="relative p-5 space-y-5">

        {/* 顶部：系统标识 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${verdict.color.replace("text-", "bg-")} animate-pulse`} />
            <span className="text-xs font-mono text-gray-500 tracking-widest uppercase">Analysis System v2.6</span>
          </div>
          <span className="text-xs font-mono text-gray-600">WC2026</span>
        </div>

        {/* 核心结论 */}
        <div className="text-center space-y-2 py-2">
          <div className={`text-xs font-mono tracking-widest uppercase ${verdict.color} flex items-center justify-center gap-2`}>
            <span>{verdict.icon}</span>
            <span>{verdict.label}</span>
          </div>
          <div className="text-4xl font-black text-white tracking-tight">
            {teamLabel}
            <span className="text-gray-500 text-2xl ml-2">{OUTCOME_LABELS[result.outcome]}</span>
          </div>
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-600 font-mono">AYX ODDS</p>
              <p className="text-2xl font-black text-yellow-400 font-mono">{result.ayxOdds}</p>
            </div>
            <div className={`w-px h-10 ${verdict.border.replace("border-", "bg-").replace("/60", "/40")}`} />
            <div className="text-center">
              <p className="text-xs text-gray-600 font-mono">CONFIDENCE</p>
              <p className={`text-2xl font-black font-mono ${verdict.color}`}>{result.confidence}%</p>
            </div>
          </div>
        </div>

        {/* 置信度总进度条 */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono text-gray-600">
            <span>CONFIDENCE LEVEL</span>
            <span>{result.confidence}/100</span>
          </div>
          <div className="h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                result.confidence >= 75 ? "bg-gradient-to-r from-emerald-600 to-emerald-400" :
                result.confidence >= 60 ? "bg-gradient-to-r from-yellow-600 to-yellow-400" :
                result.confidence >= 45 ? "bg-gradient-to-r from-orange-600 to-orange-400" :
                "bg-gradient-to-r from-red-700 to-red-500"
              }`}
              style={{ width: `${result.confidence}%` }}
            />
          </div>
        </div>

        {/* 五维度分析 */}
        <div className="space-y-3 border-t border-gray-800/60 pt-4">
          <p className="text-xs font-mono text-gray-600 tracking-widest">DIMENSION ANALYSIS</p>
          {dimensions.map((d) => (
            <DimensionBar key={d.label} {...d} />
          ))}
        </div>

        {/* 分析理由 */}
        <div className="space-y-1.5 border-t border-gray-800/60 pt-4">
          <p className="text-xs font-mono text-gray-600 tracking-widest mb-2">SIGNAL LOG</p>
          {result.reasons.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-400 font-mono">
              <span className={`mt-0.5 shrink-0 ${verdict.color}`}>›</span>
              <span>{r}</span>
            </div>
          ))}
        </div>

        {/* 警告 */}
        {result.warning && (
          <div className="border border-red-500/30 bg-red-950/30 rounded-xl px-4 py-3 text-xs text-red-400 font-mono">
            ⚠ WARNING: {result.warning}
          </div>
        )}

        {/* 投注提示 */}
        <div className={`border ${verdict.border} bg-black/40 rounded-xl px-4 py-3 text-center`}>
          <p className="text-xs font-mono text-gray-500 mb-1">EXECUTE ON AYX.COM</p>
          <p className={`font-black text-base ${verdict.color}`}>
            {teamLabel} {OUTCOME_LABELS[result.outcome]} @ {result.ayxOdds}
          </p>
        </div>

        <p className="text-center text-xs text-gray-700 font-mono">
          // 理性博彩 · 量力而行 · 仅供参考
        </p>
      </div>
    </div>
  );
}
