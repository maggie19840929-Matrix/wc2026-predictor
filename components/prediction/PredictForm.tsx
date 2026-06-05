"use client";

import { useState, useEffect } from "react";
import { getUsername } from "@/lib/username";
import type { Outcome } from "@/types";

interface Props {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  initialOutcome?: Outcome;
  initialHome?: number;
  initialAway?: number;
}

export function PredictForm({ matchId, homeTeam, awayTeam, initialOutcome, initialHome, initialAway }: Props) {
  const [outcome, setOutcome] = useState<Outcome | null>(initialOutcome ?? null);
  const [homeScore, setHomeScore] = useState<string>(initialHome?.toString() ?? "");
  const [awayScore, setAwayScore] = useState<string>(initialAway?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [username, setUsernameState] = useState<string | null>(null);

  useEffect(() => {
    setUsernameState(getUsername());
  }, []);

  const OUTCOMES: { value: Outcome; label: string }[] = [
    { value: "HOME", label: `${homeTeam} 胜` },
    { value: "DRAW", label: "平局" },
    { value: "AWAY", label: `${awayTeam} 胜` },
  ];

  async function submit() {
    if (!outcome || !username) return;
    setLoading(true);
    setMsg("");

    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        match_id: matchId,
        outcome,
        home_score_pred: homeScore !== "" ? parseInt(homeScore) : null,
        away_score_pred: awayScore !== "" ? parseInt(awayScore) : null,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) setMsg(data.error || "提交失败，请稍后再试");
    else setMsg("预测已保存 ✓");
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">提交预测</h3>
        {username && <span className="text-xs text-emerald-400">以 {username} 的名义</span>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {OUTCOMES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setOutcome(value)}
            className={`py-3 rounded-xl text-sm font-bold transition-all ${
              outcome === value
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-2">猜比分（可选）— 答对额外加分</p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={20}
            placeholder="0"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-center text-white text-lg font-bold focus:outline-none focus:border-emerald-500"
          />
          <span className="text-gray-500 font-bold">:</span>
          <input
            type="number"
            min={0}
            max={20}
            placeholder="0"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-center text-white text-lg font-bold focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <button
        disabled={!outcome || loading}
        onClick={submit}
        className="w-full py-3 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white transition-all"
      >
        {loading ? "提交中..." : initialOutcome ? "更新预测" : "确认预测"}
      </button>

      {msg && (
        <p className={`text-center text-sm ${msg.includes("✓") ? "text-emerald-400" : "text-red-400"}`}>{msg}</p>
      )}
    </div>
  );
}
