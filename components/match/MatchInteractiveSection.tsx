"use client";

import { useEffect, useState } from "react";
import { getUsername } from "@/lib/username";
import { MatchDetailClient } from "./MatchDetailClient";
import type { BookmakerOdds } from "@/lib/odds-api";
import type { RecentForm, H2HRecord } from "@/lib/team-stats";
import type { SubjectiveData, AHData } from "@/lib/recommendation";
import type { Outcome } from "@/types";

interface Props {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  canPredict: boolean;
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
  initialAH?: Partial<AHData>;
}

type Phase = "loading" | "locked" | "unlocking" | "revealed";

const OUTCOME_LABELS: Record<Outcome, string> = {
  HOME: "主胜", DRAW: "平局", AWAY: "客胜",
};
const OUTCOME_EMOJI: Record<Outcome, string> = {
  HOME: "🏠", DRAW: "🤝", AWAY: "✈️",
};

export function MatchInteractiveSection(props: Props) {
  const { matchId, homeTeam, awayTeam, canPredict } = props;

  const [phase, setPhase] = useState<Phase>("loading");
  const [myOutcome, setMyOutcome] = useState<Outcome | null>(null);
  const [selected, setSelected] = useState<Outcome | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [username, setUsername] = useState<string | null>(null);

  // 检查是否已预测
  useEffect(() => {
    const u = getUsername();
    setUsername(u);
    if (!u || !canPredict) {
      setPhase("revealed");
      return;
    }
    fetch(`/api/predictions?username=${encodeURIComponent(u)}&match_id=${matchId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setMyOutcome(data[0].outcome);
          setPhase("revealed");
        } else {
          setPhase("locked");
        }
      })
      .catch(() => setPhase("locked"));
  }, [matchId, canPredict]);

  async function submit() {
    if (!selected || !username) return;
    setSubmitting(true);
    setMsg("");
    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, match_id: matchId, outcome: selected }),
    });
    setSubmitting(false);
    if (!res.ok) { setMsg("提交失败，请重试"); return; }

    setMyOutcome(selected);
    setPhase("unlocking");
    // 解锁动画：等1.8秒再展示卡片
    setTimeout(() => setPhase("revealed"), 1800);
  }

  // ── 加载中 ──
  if (phase === "loading") {
    return (
      <div className="space-y-4">
        <div className="h-40 bg-gray-900 rounded-2xl animate-pulse border border-gray-800" />
        <div className="h-64 bg-gray-900 rounded-2xl animate-pulse border border-gray-800" />
      </div>
    );
  }

  // ── 解锁动画 ──
  if (phase === "unlocking") {
    return (
      <div className="rounded-2xl border border-cyan-500/40 bg-gray-950 p-10 text-center space-y-5">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        </div>
        <div className="space-y-2">
          <p className="text-cyan-400 font-mono text-sm tracking-widest">UNLOCKING ANALYSIS...</p>
          <p className="text-white font-black text-2xl">
            {OUTCOME_EMOJI[myOutcome!]} 你选了：
            {myOutcome === "HOME" ? homeTeam : myOutcome === "AWAY" ? awayTeam : "平局"}
            &nbsp;{OUTCOME_LABELS[myOutcome!]}
          </p>
          <p className="text-gray-500 text-sm">正在生成本场综合分析报告...</p>
        </div>
        {/* 伪进度条 */}
        <div className="h-1 bg-gray-800 rounded-full overflow-hidden mx-8">
          <div className="h-full bg-cyan-500 rounded-full animate-[progress_1.8s_ease-in-out_forwards]"
            style={{ animation: "width 1.8s ease-in-out forwards", width: "0%" }}
          />
        </div>
      </div>
    );
  }

  // ── 已揭晓：显示完整推荐卡 + 表单 ──
  if (phase === "revealed") {
    return (
      <div className="space-y-4 animate-[fadeSlideUp_0.5s_ease-out]">
        {/* 已预测徽章 */}
        {myOutcome && canPredict && (
          <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 text-lg">{OUTCOME_EMOJI[myOutcome]}</span>
              <div>
                <p className="text-xs text-emerald-400 font-mono">你的预测</p>
                <p className="text-white font-bold text-sm">
                  {myOutcome === "HOME" ? homeTeam : myOutcome === "AWAY" ? awayTeam : "平局"}&nbsp;
                  {OUTCOME_LABELS[myOutcome]}
                </p>
              </div>
            </div>
            <button
              onClick={() => setPhase("locked")}
              className="text-xs text-gray-600 hover:text-yellow-400 transition-colors"
            >
              修改预测
            </button>
          </div>
        )}

        <MatchDetailClient {...props} />
      </div>
    );
  }

  // ── 锁定：显示预测表单 + 锁屏卡 ──
  return (
    <div className="space-y-4">
      {/* 预测表单 */}
      <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">提交你的预测</h3>
          {username && <span className="text-xs text-emerald-400">以 {username} 的名义</span>}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {([
            { value: "HOME" as Outcome, label: `${homeTeam} 胜` },
            { value: "DRAW" as Outcome, label: "平局" },
            { value: "AWAY" as Outcome, label: `${awayTeam} 胜` },
          ]).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSelected(value)}
              className={`py-3 rounded-xl text-sm font-bold transition-all ${
                selected === value
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          disabled={!selected || submitting}
          onClick={submit}
          className="w-full py-3 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white transition-all"
        >
          {submitting ? "提交中..." : selected ? `确认：${selected === "HOME" ? homeTeam : selected === "AWAY" ? awayTeam : "平局"} ${OUTCOME_LABELS[selected!]}` : "请先选择结果"}
        </button>
        {msg && <p className="text-center text-sm text-red-400">{msg}</p>}
      </div>

      {/* 锁定的推荐卡 */}
      <div className="relative rounded-2xl border border-gray-700 bg-gray-950 overflow-hidden">
        {/* 模糊遮罩 */}
        <div className="absolute inset-0 z-10 backdrop-blur-sm bg-black/60 flex flex-col items-center justify-center gap-4">
          <div className="text-center space-y-2">
            <p className="text-4xl">🔒</p>
            <p className="text-white font-black text-lg">先提交预测</p>
            <p className="text-gray-400 text-sm">解锁本场 AI 综合分析报告</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/40 bg-cyan-950/30">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs text-cyan-400 font-mono tracking-widest">ANALYSIS READY · LOCKED</span>
          </div>
        </div>
        {/* 虚假卡片内容（模糊背景用） */}
        <div className="p-5 space-y-4 select-none pointer-events-none">
          <div className="h-4 bg-gray-800 rounded w-48" />
          <div className="text-center space-y-3 py-4">
            <div className="h-6 bg-gray-800 rounded w-24 mx-auto" />
            <div className="h-10 bg-gray-800 rounded w-40 mx-auto" />
            <div className="flex justify-center gap-6">
              <div className="space-y-1"><div className="h-3 bg-gray-800 rounded w-16" /><div className="h-7 bg-gray-800 rounded w-16" /></div>
              <div className="w-px bg-gray-800 h-10" />
              <div className="space-y-1"><div className="h-3 bg-gray-800 rounded w-16" /><div className="h-7 bg-gray-800 rounded w-16" /></div>
            </div>
          </div>
          <div className="space-y-2 pt-2 border-t border-gray-800">
            {[80, 60, 70, 45, 55].map((w, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-3 bg-gray-800 rounded w-16" />
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full">
                  <div className="h-full bg-gray-700 rounded-full" style={{ width: `${w}%` }} />
                </div>
                <div className="h-3 bg-gray-800 rounded w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
