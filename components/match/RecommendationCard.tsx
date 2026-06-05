"use client";

import type { RecommendationResult } from "@/lib/recommendation";

interface Props {
  result: RecommendationResult;
  homeTeam: string;
  awayTeam: string;
}

const OUTCOME_LABELS: Record<string, string> = {
  HOME: "主胜",
  DRAW: "平局",
  AWAY: "客胜",
};

function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 70 ? "bg-emerald-500" : value >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="w-full bg-gray-800 rounded-full h-2">
      <div
        className={`${color} h-2 rounded-full transition-all duration-500`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function RecommendationCard({ result, homeTeam, awayTeam }: Props) {
  const teamLabel =
    result.outcome === "HOME" ? homeTeam : result.outcome === "AWAY" ? awayTeam : "平局";
  const confidenceColor =
    result.confidence >= 70
      ? "text-emerald-400"
      : result.confidence >= 50
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <div className="bg-gray-900 border border-emerald-500/30 rounded-2xl overflow-hidden">
      {/* 头部 */}
      <div className="bg-emerald-500/10 px-5 py-4 border-b border-emerald-500/20">
        <div className="flex items-center justify-between">
          <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
            🎯 综合推荐
          </p>
          <span className="text-xs text-gray-500">基于社区+庄家综合分析</span>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* 推荐结论 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">推荐投注</p>
            <p className="text-3xl font-black text-white mt-1">
              {teamLabel}
              <span className="text-gray-500 text-lg ml-2">{OUTCOME_LABELS[result.outcome]}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm">爱游戏赔率</p>
            <p className="text-3xl font-black text-yellow-400 mt-1">{result.ayxOdds}</p>
          </div>
        </div>

        {/* 置信度 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">综合置信度</span>
            <span className={`font-bold ${confidenceColor}`}>{result.confidence}%</span>
          </div>
          <ConfidenceBar value={result.confidence} />
        </div>

        {/* 分析理由 */}
        <div className="space-y-2">
          {result.reasons.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="text-emerald-400 mt-0.5 shrink-0">•</span>
              <span>{r}</span>
            </div>
          ))}
        </div>

        {/* 警告 */}
        {result.warning && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
            ⚠️ {result.warning}
          </div>
        )}

        {/* 去爱游戏投注 */}
        <a
          href="https://www.ayx.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-black text-center text-sm transition-all"
        >
          去爱游戏投注 · {teamLabel} @ {result.ayxOdds} →
        </a>

        <p className="text-center text-xs text-gray-600">
          理性博彩，量力而行。以上为辅助分析，不构成投资建议。
        </p>
      </div>
    </div>
  );
}
