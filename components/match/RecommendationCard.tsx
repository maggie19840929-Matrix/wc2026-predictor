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
  HOME: "主胜", DRAW: "平局", AWAY: "客胜",
};

function getVerdict(confidence: number) {
  if (confidence >= 75) return { label: "强烈推荐", icon: "🟢", cls: "border-emerald-500/60 shadow-emerald-500/30", titleCls: "text-emerald-400", barCls: "bg-emerald-500" };
  if (confidence >= 60) return { label: "可以考虑", icon: "🟡", cls: "border-yellow-500/60 shadow-yellow-500/30", titleCls: "text-yellow-400", barCls: "bg-yellow-500" };
  if (confidence >= 45) return { label: "谨慎观望", icon: "🟠", cls: "border-orange-500/50 shadow-orange-500/20", titleCls: "text-orange-400", barCls: "bg-orange-500" };
  return { label: "不建议投注", icon: "🔴", cls: "border-red-500/50 shadow-red-500/20", titleCls: "text-red-400", barCls: "bg-red-500" };
}

function DimRow({ label, pct, text, active }: { label: string; pct: number; text: string; active: boolean }) {
  return (
    <div className="grid grid-cols-[88px_1fr_52px] items-center gap-3">
      <span className="text-xs text-gray-500 font-mono uppercase tracking-wide">{label}</span>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${active ? "bg-cyan-500" : "bg-gray-600"}`}
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </div>
      <span className={`text-xs font-bold font-mono text-right ${active ? "text-cyan-400" : "text-gray-500"}`}>{text}</span>
    </div>
  );
}

export function RecommendationCard({ result, homeTeam, awayTeam, communityHome, communityDraw, communityAway, hasSubjective, hasH2H }: Props) {
  const v = getVerdict(result.confidence);
  const teamLabel = result.outcome === "HOME" ? homeTeam : result.outcome === "AWAY" ? awayTeam : "平局";
  const communityVal = result.outcome === "HOME" ? communityHome : result.outcome === "DRAW" ? communityDraw : communityAway;

  return (
    <div className={`relative rounded-2xl border ${v.cls} bg-gray-950 shadow-xl overflow-hidden`}>

      {/* 网格背景 */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "24px 24px" }}
      />

      {/* 角装饰 */}
      <div className={`absolute top-2 left-2 w-3 h-3 border-t border-l ${v.cls.split(" ")[0]} opacity-70`} />
      <div className={`absolute top-2 right-2 w-3 h-3 border-t border-r ${v.cls.split(" ")[0]} opacity-70`} />
      <div className={`absolute bottom-2 left-2 w-3 h-3 border-b border-l ${v.cls.split(" ")[0]} opacity-70`} />
      <div className={`absolute bottom-2 right-2 w-3 h-3 border-b border-r ${v.cls.split(" ")[0]} opacity-70`} />

      <div className="relative p-5 space-y-4">

        {/* 系统标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${v.barCls} animate-pulse`} />
            <span className="text-xs font-mono text-gray-500 tracking-widest">ANALYSIS SYSTEM · WC2026</span>
          </div>
        </div>

        {/* 核心结论 */}
        <div className="text-center space-y-3 py-2">
          <p className={`text-xs font-mono tracking-widest uppercase ${v.titleCls} font-bold`}>
            {v.icon} {v.label}
          </p>
          <p className="text-4xl font-black text-white">
            {teamLabel} <span className="text-gray-500 text-2xl">{OUTCOME_LABELS[result.outcome]}</span>
          </p>
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-xs text-gray-600 font-mono mb-1">AYX ODDS</p>
              <p className="text-2xl font-black text-yellow-400 font-mono">{result.ayxOdds}</p>
            </div>
            <div className="w-px h-10 bg-gray-700" />
            <div className="text-center">
              <p className="text-xs text-gray-600 font-mono mb-1">CONFIDENCE</p>
              <p className={`text-2xl font-black font-mono ${v.titleCls}`}>{result.confidence}%</p>
            </div>
          </div>
        </div>

        {/* 总置信进度条 */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono text-gray-600">
            <span>CONFIDENCE LEVEL</span>
            <span>{result.confidence} / 100</span>
          </div>
          <div className="h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
            <div className={`h-full rounded-full transition-all duration-1000 ${v.barCls}`}
              style={{ width: `${result.confidence}%` }} />
          </div>
        </div>

        {/* 五维度 */}
        <div className="space-y-2.5 pt-2 border-t border-gray-800">
          <p className="text-xs font-mono text-gray-600 tracking-widest">DIMENSION ANALYSIS</p>
          <DimRow label="社区预测" pct={communityVal} text={`${Math.round(communityVal)}%`} active={communityVal >= 40} />
          <DimRow label="赔率价值" pct={Math.min(100, (1 / result.ayxOdds) * 100 + 20)} text={`${result.ayxOdds}`} active={result.ayxOdds >= 1.8} />
          <DimRow label="近期状态" pct={result.reasons.some(r => r.includes("状态")) ? 75 : 45} text={result.reasons.some(r => r.includes("状态")) ? "有优势" : "待分析"} active={result.reasons.some(r => r.includes("状态"))} />
          <DimRow label="历史交锋" pct={hasH2H ? 65 : 20} text={hasH2H ? "已分析" : "数据少"} active={hasH2H} />
          <DimRow label="主观评估" pct={hasSubjective ? 80 : 0} text={hasSubjective ? "已录入" : "待录入"} active={hasSubjective} />
        </div>

        {/* 分析日志 */}
        <div className="space-y-1.5 pt-2 border-t border-gray-800">
          <p className="text-xs font-mono text-gray-600 tracking-widest">SIGNAL LOG</p>
          {result.reasons.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-400 font-mono">
              <span className={`shrink-0 mt-0.5 ${v.titleCls}`}>›</span>
              <span>{r}</span>
            </div>
          ))}
        </div>

        {/* 警告 */}
        {result.warning && (
          <div className="border border-red-500/30 bg-red-950/30 rounded-xl px-4 py-2 text-xs text-red-400 font-mono">
            ⚠ {result.warning}
          </div>
        )}

        {/* 投注提示 */}
        <div className={`border ${v.cls.split(" ")[0]} bg-black/50 rounded-xl px-4 py-3 text-center`}>
          <p className="text-xs font-mono text-gray-500 mb-1">EXECUTE ON AYX.COM</p>
          <p className={`font-black text-base ${v.titleCls}`}>
            {teamLabel} {OUTCOME_LABELS[result.outcome]} @ {result.ayxOdds}
          </p>
        </div>

        <p className="text-center text-xs text-gray-700 font-mono">// 理性博彩 · 量力而行 · 仅供参考</p>
      </div>
    </div>
  );
}
