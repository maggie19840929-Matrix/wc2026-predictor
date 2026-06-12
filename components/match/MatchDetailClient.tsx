"use client";

import { useState } from "react";
import { AyxOddsForm } from "./AyxOddsForm";
import { IntelForm } from "./IntelForm";
import type { BookmakerOdds } from "@/lib/odds-api";
import type { RecentForm, H2HRecord } from "@/lib/team-stats";
import type { AHData } from "@/lib/recommendation";
import { type IntelFactors, intelDiff, intelBoost, hasIntel } from "@/lib/intel";

interface Props {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  communityHome: number;
  communityDraw: number;
  communityAway: number;
  totalPredictions: number;
  initialAyxHome?: number;
  initialAyxDraw?: number;
  initialAyxAway?: number;
  bookmakers: BookmakerOdds[];
  homeForm?: RecentForm;
  awayForm?: RecentForm;
  h2h?: H2HRecord;
  initialAH?: Partial<AHData>;
  initialIntel?: IntelFactors | null;
}

export function MatchDetailClient(props: Props) {
  const { matchId, homeTeam, awayTeam, communityHome, communityDraw, communityAway,
    totalPredictions, initialAyxHome, initialAyxDraw, initialAyxAway, bookmakers,
    homeForm, awayForm, h2h, initialAH, initialIntel } = props;

  const [ayxHome, setAyxHome] = useState(initialAyxHome);
  const [ayxDraw, setAyxDraw] = useState(initialAyxDraw);
  const [ayxAway, setAyxAway] = useState(initialAyxAway);
  const [ahData, setAhData] = useState<AHData | undefined>(
    initialAH?.homeAHWinRate != null ? (initialAH as AHData) : undefined
  );
  const [intel, setIntel] = useState<IntelFactors | null>(initialIntel ?? null);

  const h = ayxHome ?? (bookmakers.length > 0 ? Math.max(...bookmakers.map((b) => b.home)) : 0);
  const d = ayxDraw ?? (bookmakers.length > 0 ? Math.max(...bookmakers.map((b) => b.draw)) : 0);
  const a = ayxAway ?? (bookmakers.length > 0 ? Math.max(...bookmakers.map((b) => b.away)) : 0);
  const hasOdds = h > 1 && d > 1 && a > 1;

  return (
    <div className="space-y-4">
      {/* 录入按钮行 */}
      <div className="flex items-center gap-3 flex-wrap">
        <AyxOddsForm
          matchId={matchId}
          initialHome={ayxHome}
          initialDraw={ayxDraw}
          initialAway={ayxAway}
          onSaved={(nh, nd, na) => {
            setAyxHome(nh);
            setAyxDraw(nd);
            setAyxAway(na);
          }}
        />
        <span className="text-gray-700">·</span>
        <IntelForm
          matchId={matchId}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          initial={intel}
          onSaved={(data) => setIntel(data)}
        />
      </div>

      {/* 情报展示 */}
      {intel?.note && (
        <div className="bg-gray-900/60 border border-orange-500/20 rounded-xl px-4 py-3">
          <p className="text-xs text-orange-400 font-mono mb-1">📡 INTEL</p>
          <p className="text-sm text-gray-300">{intel.note}</p>
        </div>
      )}

      {/* 推荐卡片 */}
      {hasOdds ? (
        <RecoCard
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homeOdds={h}
          drawOdds={d}
          awayOdds={a}
          communityHome={communityHome}
          communityDraw={communityDraw}
          communityAway={communityAway}
          totalPredictions={totalPredictions}
          hasH2H={!!(h2h && h2h.played > 0)}
          ahData={ahData}
          homeForm={homeForm}
          awayForm={awayForm}
          h2h={h2h}
          bookmakers={bookmakers}
          intel={intel}
        />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-6 text-center space-y-2">
          <p className="text-2xl">🎯</p>
          <p className="text-gray-300 font-semibold">综合推荐待生成</p>
          <p className="text-gray-500 text-sm">请先录入爱游戏赔率</p>
        </div>
      )}
    </div>
  );
}

// ---- 内联推荐卡片 ----

function fairProbs(home: number, draw: number, away: number) {
  const h = 1 / home, d = 1 / draw, a = 1 / away;
  const t = h + d + a;
  return { home: h / t, draw: d / t, away: a / t };
}

function RecoCard({ homeTeam, awayTeam, homeOdds, drawOdds, awayOdds,
  communityHome, communityDraw, communityAway, totalPredictions, hasH2H,
  ahData, homeForm, awayForm, h2h, bookmakers, intel }: {
  homeTeam: string; awayTeam: string;
  homeOdds: number; drawOdds: number; awayOdds: number;
  communityHome: number; communityDraw: number; communityAway: number;
  totalPredictions: number;
  hasH2H: boolean;
  ahData?: AHData;
  homeForm?: RecentForm; awayForm?: RecentForm; h2h?: H2HRecord;
  bookmakers: BookmakerOdds[];
  intel?: IntelFactors | null;
}) {
  const ayxFair = fairProbs(homeOdds, drawOdds, awayOdds);
  const rawComm = { home: communityHome / 100, draw: communityDraw / 100, away: communityAway / 100 };

  let marketFair = { home: 0.33, draw: 0.33, away: 0.34 };
  if (bookmakers.length > 0) {
    const sum = bookmakers.reduce((acc, b) => {
      const f = fairProbs(b.home, b.draw, b.away);
      return { home: acc.home + f.home, draw: acc.draw + f.draw, away: acc.away + f.away };
    }, { home: 0, draw: 0, away: 0 });
    marketFair = { home: sum.home / bookmakers.length, draw: sum.draw / bookmakers.length, away: sum.away / bookmakers.length };
  }

  // 小样本打折：投票<5人时，社区概率向庄家共识收缩（避免2票=100%这种噪音带歪）
  const smallSample = totalPredictions < 5;
  const shrinkTarget = bookmakers.length > 0 ? marketFair : ayxFair;
  const comm = smallSample
    ? {
        home: 0.3 * rawComm.home + 0.7 * shrinkTarget.home,
        draw: 0.3 * rawComm.draw + 0.7 * shrinkTarget.draw,
        away: 0.3 * rawComm.away + 0.7 * shrinkTarget.away,
      }
    : rawComm;

  const edge = {
    home: comm.home - ayxFair.home,
    draw: comm.draw - ayxFair.draw,
    away: comm.away - ayxFair.away,
  };

  // AH盘路加成
  let ahBoost = { home: 0, draw: 0, away: 0 };
  if (ahData) {
    ahBoost.home = (ahData.homeAHWinRate - 0.5) * 0.3;
    ahBoost.away = (ahData.awayAHWinRate - 0.5) * 0.3;
    if (ahData.homeAHWinRate >= 0.6 && ahData.awayAHWinRate >= 0.6) ahBoost.draw += 0.02;
  }

  // 近期W/L状态加成
  let formBoost = { home: 0, draw: 0, away: 0 };
  if (homeForm && awayForm && homeForm.played > 0 && awayForm.played > 0) {
    const formDiff = (homeForm.wins / homeForm.played) - (awayForm.wins / awayForm.played);
    formBoost.home = formDiff * 0.1;
    formBoost.away = -formDiff * 0.1;
  }

  // H2H加成
  let h2hBoost = { home: 0, draw: 0, away: 0 };
  if (h2h && h2h.played >= 3) {
    h2hBoost.home = (h2h.homeWins / h2h.played - 0.33) * 0.08;
    h2hBoost.away = (h2h.awayWins / h2h.played - 0.33) * 0.08;
    h2hBoost.draw = (h2h.draws / h2h.played - 0.33) * 0.08;
  }

  // 情报加成（零和：利好主队=不利客队，封顶）
  const iDiff = intelDiff(intel);
  const iBoost = intelBoost(intel); // {home,away} ∈ [-1,1]
  const intelActive = hasIntel(intel);

  // 综合评分：社区25% + AYX价值25% + 市场15% + 状态10% + H2H5% + 盘路10% + 情报(±0.03)
  const scores = {
    home: comm.home * 0.25 + edge.home * 0.25 + (comm.home - marketFair.home) * 0.15 + formBoost.home * 0.10 + h2hBoost.home * 0.05 + ahBoost.home * 0.10 + iBoost.home * 0.03,
    draw: comm.draw * 0.25 + edge.draw * 0.25 + (comm.draw - marketFair.draw) * 0.15 + formBoost.draw * 0.10 + h2hBoost.draw * 0.05 + ahBoost.draw * 0.10,
    away: comm.away * 0.25 + edge.away * 0.25 + (comm.away - marketFair.away) * 0.15 + formBoost.away * 0.10 + h2hBoost.away * 0.05 + ahBoost.away * 0.10 + iBoost.away * 0.03,
  };

  const entries = Object.entries(scores) as ["home" | "draw" | "away", number][];
  const best = entries.sort((a, b) => b[1] - a[1])[0];
  const outcomeKey = best[0];
  const outcomeLabel = outcomeKey === "home" ? "主胜" : outcomeKey === "draw" ? "平局" : "客胜";
  const teamLabel = outcomeKey === "home" ? homeTeam : outcomeKey === "away" ? awayTeam : "平局";
  const bestOdds = outcomeKey === "home" ? homeOdds : outcomeKey === "draw" ? drawOdds : awayOdds;
  const communityPct = outcomeKey === "home" ? communityHome : outcomeKey === "draw" ? communityDraw : communityAway;

  let confidence = Math.round(communityPct > 0 ? communityPct : (1 - ayxFair[outcomeKey]) * 100);
  const edgeVal = edge[outcomeKey];
  if (edgeVal > 0.05) confidence = Math.min(confidence + 10, 95);
  else if (edgeVal < -0.05) confidence = Math.max(confidence - 10, 20);
  if (ahData) {
    const relevantAH = outcomeKey === "home" ? ahData.homeAHWinRate : outcomeKey === "away" ? ahData.awayAHWinRate : 0.5;
    if (relevantAH >= 0.7) confidence = Math.min(confidence + 8, 95);
    else if (relevantAH <= 0.3) confidence = Math.max(confidence - 8, 20);
  }

  // 情报对置信度的影响（仅主/客胜方向，平局不适用）
  let intelWarning: string | undefined;
  if (intelActive && outcomeKey !== "draw" && iDiff !== 0) {
    const supports = (outcomeKey === "home" && iDiff > 0) || (outcomeKey === "away" && iDiff < 0);
    const strong = Math.abs(iDiff) >= 3;
    if (supports) {
      confidence = Math.min(confidence + (strong ? 8 : 4), 95);
    } else {
      confidence = Math.max(confidence - (strong ? 10 : 5), 20);
      if (strong) {
        const favored = iDiff > 0 ? homeTeam : awayTeam;
        intelWarning = `情报面明显利好${favored}，与该推荐方向相左，需谨慎`;
      }
    }
  }

  // 小样本：置信度打8折
  if (smallSample) confidence = Math.round(confidence * 0.8);

  const verdict = confidence >= 75 ? { label: "强烈推荐", icon: "🟢", color: "emerald" }
    : confidence >= 60 ? { label: "可以考虑", icon: "🟡", color: "yellow" }
    : confidence >= 45 ? { label: "谨慎观望", icon: "🟠", color: "orange" }
    : { label: "不建议投注", icon: "🔴", color: "red" };

  const borderColor = verdict.color === "emerald" ? "border-emerald-500/60" : verdict.color === "yellow" ? "border-yellow-500/60" : verdict.color === "orange" ? "border-orange-500/50" : "border-red-500/50";
  const textColor = verdict.color === "emerald" ? "text-emerald-400" : verdict.color === "yellow" ? "text-yellow-400" : verdict.color === "orange" ? "text-orange-400" : "text-red-400";
  const barColor = verdict.color === "emerald" ? "bg-emerald-500" : verdict.color === "yellow" ? "bg-yellow-500" : verdict.color === "orange" ? "bg-orange-500" : "bg-red-500";

  const hasAH = !!ahData;
  // 情报维度文案
  const intelText = !intelActive ? "无情报"
    : iDiff > 0 ? `利好${homeTeam} +${iDiff}`
    : iDiff < 0 ? `利好${awayTeam} ${iDiff}`
    : "中性";
  const intelPct = intelActive ? Math.min(100, Math.abs(iDiff) / 6 * 100) : 0;

  const dims = [
    { label: "社区预测", pct: communityPct, text: smallSample ? `${totalPredictions}票·参考低` : `${Math.round(communityPct)}%`, active: !smallSample && communityPct >= 40 },
    { label: "赔率价值", pct: Math.min(100, bestOdds * 30), text: `${bestOdds}`, active: bestOdds >= 1.8 },
    { label: "近期状态", pct: homeForm && homeForm.played > 0 ? 65 : 30, text: homeForm && homeForm.played > 0 ? "已分析" : "待分析", active: !!(homeForm && homeForm.played > 0) },
    {
      label: "让球盘路",
      pct: hasAH ? Math.round((outcomeKey === "home" ? ahData!.homeAHWinRate : outcomeKey === "away" ? ahData!.awayAHWinRate : 0.5) * 100) : 0,
      text: hasAH ? `~${Math.round((outcomeKey === "home" ? ahData!.homeAHWinRate : outcomeKey === "away" ? ahData!.awayAHWinRate : 0.5) * 100)}%` : "无数据",
      active: hasAH,
    },
    { label: "事实情报", pct: intelPct, text: intelText, active: intelActive },
  ];

  return (
    <div className={`relative rounded-2xl border ${borderColor} bg-gray-950 shadow-xl overflow-hidden`}>
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
      <div className={`absolute top-2 left-2 w-3 h-3 border-t border-l ${borderColor} opacity-70`} />
      <div className={`absolute top-2 right-2 w-3 h-3 border-t border-r ${borderColor} opacity-70`} />
      <div className={`absolute bottom-2 left-2 w-3 h-3 border-b border-l ${borderColor} opacity-70`} />
      <div className={`absolute bottom-2 right-2 w-3 h-3 border-b border-r ${borderColor} opacity-70`} />

      <div className="relative p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${barColor} animate-pulse`} />
          <span className="text-xs font-mono text-gray-500 tracking-widest">ANALYSIS SYSTEM · WC2026</span>
        </div>

        <div className="text-center space-y-3 py-2">
          <p className={`text-xs font-mono tracking-widest uppercase font-bold ${textColor}`}>
            {verdict.icon} {verdict.label}
          </p>
          <p className="text-4xl font-black text-white">
            {teamLabel} <span className="text-gray-500 text-2xl">{outcomeLabel}</span>
          </p>
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-xs text-gray-600 font-mono mb-1">AYX ODDS</p>
              <p className="text-2xl font-black text-yellow-400 font-mono">{bestOdds}</p>
            </div>
            <div className="w-px h-10 bg-gray-700" />
            <div className="text-center">
              <p className="text-xs text-gray-600 font-mono mb-1">CONFIDENCE</p>
              <p className={`text-2xl font-black font-mono ${textColor}`}>{confidence}%</p>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono text-gray-600">
            <span>CONFIDENCE LEVEL</span><span>{confidence} / 100</span>
          </div>
          <div className="h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${confidence}%` }} />
          </div>
        </div>

        <div className="space-y-2.5 pt-2 border-t border-gray-800">
          <p className="text-xs font-mono text-gray-600 tracking-widest">DIMENSION ANALYSIS</p>
          {dims.map((d) => (
            <div key={d.label} className="grid grid-cols-[88px_1fr_84px] items-center gap-3">
              <span className="text-xs text-gray-500 font-mono uppercase tracking-wide">{d.label}</span>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${d.active ? "bg-cyan-500" : "bg-gray-600"}`}
                  style={{ width: `${Math.max(4, d.pct)}%` }} />
              </div>
              <span className={`text-xs font-bold font-mono text-right ${d.active ? "text-cyan-400" : "text-gray-500"}`}>{d.text}</span>
            </div>
          ))}
        </div>

        {intelWarning && (
          <div className="border border-orange-500/30 bg-orange-950/30 rounded-xl px-4 py-2 text-xs text-orange-400 font-mono">
            ⚠ {intelWarning}
          </div>
        )}

        <div className={`border ${borderColor} bg-black/50 rounded-xl px-4 py-3 text-center`}>
          <p className="text-xs font-mono text-gray-500 mb-1">EXECUTE ON AYX.COM</p>
          <p className={`font-black text-base ${textColor}`}>{teamLabel} {outcomeLabel} @ {bestOdds}</p>
        </div>

        <p className="text-center text-xs text-gray-700 font-mono">// 理性博彩 · 量力而行 · 仅供参考</p>
      </div>
    </div>
  );
}
