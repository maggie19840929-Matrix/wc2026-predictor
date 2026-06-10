"use client";

import { useState } from "react";

interface AHData {
  homeAHWinRate: number;
  awayAHWinRate: number;
  homeOverRate?: number;
  awayOverRate?: number;
}

interface Props {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  initial?: Partial<AHData>;
  onSaved?: (data: AHData) => void;
}

export function AHForm({ matchId, homeTeam, awayTeam, initial, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [homeAH, setHomeAH] = useState(
    initial?.homeAHWinRate != null ? Math.round(initial.homeAHWinRate * 10) : 5
  );
  const [awayAH, setAwayAH] = useState(
    initial?.awayAHWinRate != null ? Math.round(initial.awayAHWinRate * 10) : 5
  );
  const [homeOver, setHomeOver] = useState(
    initial?.homeOverRate != null ? Math.round(initial.homeOverRate * 10) : 5
  );
  const [awayOver, setAwayOver] = useState(
    initial?.awayOverRate != null ? Math.round(initial.awayOverRate * 10) : 5
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setSaving(true);
    const data: AHData = {
      homeAHWinRate: homeAH / 10,
      awayAHWinRate: awayAH / 10,
      homeOverRate: homeOver / 10,
      awayOverRate: awayOver / 10,
    };
    const res = await fetch("/api/ah", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        match_id: matchId,
        secret: "my-secret-key-123",
        home_ah_win_rate: data.homeAHWinRate,
        away_ah_win_rate: data.awayAHWinRate,
        home_over_rate: data.homeOverRate,
        away_over_rate: data.awayOverRate,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("保存成功 ✓");
      onSaved?.(data);
      setTimeout(() => setOpen(false), 800);
    } else {
      setMsg("保存失败");
    }
  }

  const hasData = initial?.homeAHWinRate != null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`text-xs underline transition-colors ${
          hasData ? "text-cyan-400 hover:text-cyan-300" : "text-gray-600 hover:text-cyan-400"
        }`}
      >
        📊 {hasData ? "修改盘路数据" : "录入盘路数据"}
      </button>
    );
  }

  return (
    <div className="bg-gray-900 border border-cyan-500/30 rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-cyan-300">📊 让球盘赢盘率（近10场）</p>
        <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white text-lg">×</button>
      </div>
      <p className="text-xs text-gray-500">参考截图中的「赢盘率」，填近10场赢盘次数（0-10场）</p>

      <div className="space-y-4">
        {/* 赢盘率 */}
        <div className="space-y-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-mono">赢盘率（让球）</p>
          <RateSlider
            label={`${homeTeam} 主队`}
            value={homeAH}
            onChange={setHomeAH}
            color="emerald"
          />
          <RateSlider
            label={`${awayTeam} 客队`}
            value={awayAH}
            onChange={setAwayAH}
            color="blue"
          />
        </div>

        {/* 大球率（可选） */}
        <div className="space-y-3 border-t border-gray-800 pt-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-mono">大球率（可选）</p>
          <RateSlider label={`${homeTeam}`} value={homeOver} onChange={setHomeOver} color="yellow" />
          <RateSlider label={`${awayTeam}`} value={awayOver} onChange={setAwayOver} color="yellow" />
        </div>
      </div>

      <button
        disabled={saving}
        onClick={save}
        className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white font-bold text-sm"
      >
        {saving ? "保存中..." : "保存盘路数据"}
      </button>
      {msg && (
        <p className={`text-center text-sm ${msg.includes("✓") ? "text-emerald-400" : "text-red-400"}`}>{msg}</p>
      )}
    </div>
  );
}

function RateSlider({ label, value, onChange, color }: {
  label: string;
  value: number; // 0-10 (代表 0/10 到 10/10)
  onChange: (v: number) => void;
  color: "emerald" | "blue" | "yellow";
}) {
  const colorMap = {
    emerald: { fill: "bg-emerald-500", text: "text-emerald-400" },
    blue: { fill: "bg-blue-500", text: "text-blue-400" },
    yellow: { fill: "bg-yellow-500", text: "text-yellow-400" },
  };
  const c = colorMap[color];
  const pct = value * 10;

  const levelLabel = value >= 7 ? "强" : value >= 5 ? "中" : value >= 3 ? "弱" : "差";
  const levelColor = value >= 7 ? "text-emerald-400" : value >= 5 ? "text-gray-400" : value >= 3 ? "text-orange-400" : "text-red-400";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono font-bold ${levelColor}`}>{levelLabel}</span>
          <span className={`text-sm font-black font-mono ${c.text}`}>{value}/10</span>
          <span className="text-xs text-gray-500">({pct}%)</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={10}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-cyan-500"
        />
      </div>
      {/* 快捷按钮 */}
      <div className="flex gap-1">
        {[0, 2, 3, 4, 5, 6, 7, 8, 10].map((v) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`flex-1 py-1 rounded text-xs font-mono transition-all ${
              value === v
                ? `${c.fill} text-white font-bold`
                : "bg-gray-800 text-gray-500 hover:bg-gray-700"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
