"use client";

import { useState } from "react";
import { AyxOddsForm } from "./AyxOddsForm";
import { SubjectiveForm } from "./SubjectiveForm";
import type { BookmakerOdds } from "@/lib/odds-api";
import type { RecentForm, H2HRecord } from "@/lib/team-stats";
import type { SubjectiveData } from "@/lib/recommendation";

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
  initialSubjective?: Partial<SubjectiveData>;
}

export function MatchDetailClient(props: Props) {
  const { matchId, homeTeam, awayTeam, communityHome, communityDraw, communityAway,
    initialAyxHome, initialAyxDraw, initialAyxAway, bookmakers,
    homeForm, awayForm, h2h, initialSubjective } = props;

  const [ayxHome, setAyxHome] = useState(initialAyxHome);
  const [ayxDraw, setAyxDraw] = useState(initialAyxDraw);
  const [ayxAway, setAyxAway] = useState(initialAyxAway);
  const [subjective, setSubjective] = useState<SubjectiveData | undefined>(
    initialSubjective?.subj_home_form ? (initialSubjective as SubjectiveData) : undefined
  );
  const [showCard, setShowCard] = useState(false);

  const h = ayxHome ?? (bookmakers.length > 0 ? Math.max(...bookmakers.map((b) => b.home)) : 0);
  const d = ayxDraw ?? (bookmakers.length > 0 ? Math.max(...bookmakers.map((b) => b.draw)) : 0);
  const a = ayxAway ?? (bookmakers.length > 0 ? Math.max(...bookmakers.map((b) => b.away)) : 0);
  const hasOdds = h > 1 && d > 1 && a > 1;

  return (
    <div className="space-y-4">
      {/* 录入按钮行 */}
      <div className="flex items-center justify-between">
        <SubjectiveForm
          matchId={matchId}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          initial={initialSubjective}
          onSaved={(data) => setSubjective(data)}
        />
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
      </div>

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
          hasSubjective={!!subjective}
          hasH2H={!!(h2h && h2h.played > 0)}
          subjective={subjective}
          homeForm={homeForm}
          awayForm={awayForm}
          h2h={h2h}
          bookmakers={bookmakers}
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

// ---- 内联推荐卡片，避免动态import问题 ----

function fairProbs(home: number, draw: number, away: number) {
  const h = 1 / home, d = 1 / draw, a = 1 / away;
  const t = h + d + a;
  return { home: h / t, draw: d / t, away: a / t };
}

function RecoCard({ homeTeam, awayTeam, homeOdds, drawOdds, awayOdds,
  communityHome, communityDraw, communityAway, hasSubjective, hasH2H,
  subjective, homeForm, awayForm, h2h, bookmakers }: {
  homeTeam: string; awayTeam: string;
  homeOdds: number; drawOdds: number; awayOdds: number;
  communityHome: number; communityDraw: number; communityAway: number;
  hasSubjective: boolean; hasH2H: boolean;
  subjective?: SubjectiveData;
  homeForm?: RecentForm; awayForm?: RecentForm; h2h?: H2HRecord;
  bookmakers: BookmakerOdds[];
}) {
  const ayxFair = fairProbs(homeOdds, drawOdds, awayOdds);
  const comm = { home: communityHome / 100, draw: communityDraw / 100, away: communityAway / 100 };

  let marketFair = { home: 0.33, draw: 0.33, away: 0.34 };
  if (bookmakers.length > 0) {
    const sum = bookmakers.reduce((acc, b) => {
      const f = fairProbs(b.home, b.draw, b.away);
      return { home: acc.home + f.home, draw: acc.draw + f.draw, away: acc.away + f.away };
    }, { home: 0, draw: 0, away: 0 });
    marketFair = { home: sum.home / bookmakers.length, draw: sum.draw / bookmakers.length, away: sum.away / bookmakers.length };
  }

  const edge = {
    home: comm.home - ayxFair.home,
    draw: comm.draw - ayxFair.draw,
    away: comm.away - ayxFair.away,
  };

  // 加权评分
  const scores = {
    home: comm.home * 0.4 + edge.home * 0.4 + (comm.home - marketFair.home) * 0.2,
    draw: comm.draw * 0.4 + edge.draw * 0.4 + (comm.draw - marketFair.draw) * 0.2,
    away: comm.away * 0.4 + edge.away * 0.4 + (comm.away - marketFair.away) * 0.2,
  };

  const entries = Object.entries(scores) as ["home" | "draw" | "away", number][];
  const best = entries.sort((a, b) => b[1] - a[1])[0];
  const outcomeKey = best[0];
  const outcome = outcomeKey === "home" ? "HOME" : outcomeKey === "draw" ? "DRAW" : "AWAY";
  const outcomeLabel = outcomeKey === "home" ? "主胜" : outcomeKey === "draw" ? "平局" : "客胜";
  const teamLabel = outcome === "HOME" ? homeTeam : outcome === "AWAY" ? awayTeam : "平局";
  const bestOdds = outcomeKey === "home" ? homeOdds : outcomeKey === "draw" ? drawOdds : awayOdds;
  const communityPct = outcomeKey === "home" ? communityHome : outcomeKey === "draw" ? communityDraw : communityAway;

  const rawConfidence = Math.round(communityPct > 0 ? communityPct : (1 - ayxFair[outcomeKey]) * 100);
  const edgeVal = edge[outcomeKey];
  let confidence = Math.min(95, Math.max(20,
    rawConfidence + (edgeVal > 0.05 ? 10 : edgeVal < -0.05 ? -10 : 0)
  ));

  const verdict = confidence >= 75 ? { label: "强烈推荐", icon: "🟢", color: "emerald" }
    : confidence >= 60 ? { label: "可以考虑", icon: "🟡", color: "yellow" }
    : confidence >= 45 ? { label: "谨慎观望", icon: "🟠", color: "orange" }
    : { label: "不建议投注", icon: "🔴", color: "red" };

  const borderColor = verdict.color === "emerald" ? "border-emerald-500/60"
    : verdict.color === "yellow" ? "border-yellow-500/60"
    : verdict.color === "orange" ? "border-orange-500/50"
    : "border-red-500/50";

  const textColor = verdict.color === "emerald" ? "text-emerald-400"
    : verdict.color === "yellow" ? "text-yellow-400"
    : verdict.color === "orange" ? "text-orange-400"
    : "text-red-400";

  const barColor = verdict.color === "emerald" ? "bg-emerald-500"
    : verdict.color === "yellow" ? "bg-yellow-500"
    : verdict.color === "orange" ? "bg-orange-500"
    : "bg-red-500";

  const dims = [
    { label: "社区预测", pct: communityPct, text: `${Math.round(communityPct)}%`, active: communityPct >= 40 },
    { label: "赔率价值", pct: Math.min(100, bestOdds * 30), text: `${bestOdds}`, active: bestOdds >= 1.8 },
    { label: "近期状态", pct: homeForm && homeForm.played > 0 ? 65 : 30, text: homeForm && homeForm.played > 0 ? "已分析" : "待分析", active: !!(homeForm && homeForm.played > 0) },
    { label: "历史交锋", pct: hasH2H ? 65 : 20, text: hasH2H ? "已分析" : "数据少", active: hasH2H },
    { label: "主观评估", pct: hasSubjective ? 80 : 0, text: hasSubjective ? "已录入" : "待录入", active: hasSubjective },
  ];

  return (
    <div className={`relative rounded-2xl border ${borderColor} bg-gray-950 shadow-xl overflow-hidden`}>
      {/* 网格背景 */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
      {/* 角装饰 */}
      <div className={`absolute top-2 left-2 w-3 h-3 border-t border-l ${borderColor} opacity-70`} />
      <div className={`absolute top-2 right-2 w-3 h-3 border-t border-r ${borderColor} opacity-70`} />
      <div className={`absolute bottom-2 left-2 w-3 h-3 border-b border-l ${borderColor} opacity-70`} />
      <div className={`absolute bottom-2 right-2 w-3 h-3 border-b border-r ${borderColor} opacity-70`} />

      <div className="relative p-5 space-y-4">
        {/* 系统标题 */}
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${barColor} animate-pulse`} />
          <span className="text-xs font-mono text-gray-500 tracking-widest">ANALYSIS SYSTEM · WC2026</span>
        </div>

        {/* 结论 */}
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

        {/* 置信进度条 */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono text-gray-600">
            <span>CONFIDENCE LEVEL</span><span>{confidence} / 100</span>
          </div>
          <div className="h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${confidence}%` }} />
          </div>
        </div>

        {/* 五维度 */}
        <div className="space-y-2.5 pt-2 border-t border-gray-800">
          <p className="text-xs font-mono text-gray-600 tracking-widest">DIMENSION ANALYSIS</p>
          {dims.map((d) => (
            <div key={d.label} className="grid grid-cols-[88px_1fr_52px] items-center gap-3">
              <span className="text-xs text-gray-500 font-mono uppercase tracking-wide">{d.label}</span>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${d.active ? "bg-cyan-500" : "bg-gray-600"}`}
                  style={{ width: `${Math.max(4, d.pct)}%` }} />
              </div>
              <span className={`text-xs font-bold font-mono text-right ${d.active ? "text-cyan-400" : "text-gray-500"}`}>{d.text}</span>
            </div>
          ))}
        </div>

        {/* 投注提示 */}
        <div className={`border ${borderColor} bg-black/50 rounded-xl px-4 py-3 text-center`}>
          <p className="text-xs font-mono text-gray-500 mb-1">EXECUTE ON AYX.COM</p>
          <p className={`font-black text-base ${textColor}`}>{teamLabel} {outcomeLabel} @ {bestOdds}</p>
        </div>

        <p className="text-center text-xs text-gray-700 font-mono">// 理性博彩 · 量力而行 · 仅供参考</p>
      </div>
    </div>
  );
}
