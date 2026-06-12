"use client";

import { useState } from "react";
import { INTEL_CATEGORIES, type IntelFactors, type IntelKey, intelDiff } from "@/lib/intel";

interface Props {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  initial?: IntelFactors | null;
  onSaved?: (data: IntelFactors) => void;
}

function FiveToggle({ value, onChange, homeTeam, awayTeam }: {
  value: number;
  onChange: (v: number) => void;
  homeTeam: string;
  awayTeam: string;
}) {
  const opts = [
    { v: -2, label: `${awayTeam}++`, cls: "bg-blue-600" },
    { v: -1, label: `${awayTeam}+`, cls: "bg-blue-500/70" },
    { v: 0, label: "无", cls: "bg-gray-600" },
    { v: 1, label: `${homeTeam}+`, cls: "bg-emerald-500/70" },
    { v: 2, label: `${homeTeam}++`, cls: "bg-emerald-600" },
  ];
  return (
    <div className="flex gap-1">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all truncate ${
            value === o.v ? `${o.cls} text-white` : "bg-gray-800 text-gray-500 hover:bg-gray-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function IntelForm({ matchId, homeTeam, awayTeam, initial, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Partial<Record<IntelKey, number>>>(initial?.values ?? {});
  const [note, setNote] = useState(initial?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const diff = intelDiff({ values, note });

  function setCat(key: IntelKey, v: number) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function save() {
    setSaving(true);
    setMsg("");
    const data: IntelFactors = { values, note };
    const res = await fetch("/api/intel", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match_id: matchId, secret: "my-secret-key-123", intel_factors: data }),
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

  const hasData = initial && (Object.values(initial.values ?? {}).some((v) => v) || initial.note);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`text-xs underline transition-colors ${
          hasData ? "text-orange-400 hover:text-orange-300" : "text-gray-600 hover:text-orange-400"
        }`}
      >
        📡 {hasData ? "修改情报" : "录入情报"}
      </button>
    );
  }

  return (
    <div className="bg-gray-900 border border-orange-400/30 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-orange-300">📡 事实情报录入</p>
        <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white text-lg">×</button>
      </div>
      <p className="text-xs text-gray-500">只填可核实的事实（到场/伤停/赛程），不是主观打分。正=利好主队。</p>

      <div className="space-y-3">
        {INTEL_CATEGORIES.map((cat) => (
          <div key={cat.key} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm">{cat.icon}</span>
              <span className="text-sm text-gray-300 font-medium">{cat.key}</span>
              <span className="text-xs text-gray-600 truncate">{cat.desc}</span>
            </div>
            <FiveToggle
              value={values[cat.key] ?? 0}
              onChange={(v) => setCat(cat.key, v)}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
            />
          </div>
        ))}
      </div>

      <div className="border-t border-gray-800 pt-3 space-y-2">
        <p className="text-xs text-gray-500">情报说明（来源/细节）</p>
        <textarea
          placeholder="如：韩国提前1月到场适应；捷克附加赛后2天才到，疲劳+时差明显"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-orange-400 resize-none"
        />
      </div>

      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-gray-500">情报净倾向</span>
        <span className={diff > 0 ? "text-emerald-400 font-bold" : diff < 0 ? "text-blue-400 font-bold" : "text-gray-500"}>
          {diff > 0 ? `利好${homeTeam} +${diff}` : diff < 0 ? `利好${awayTeam} ${diff}` : "中性"}
        </span>
      </div>

      <button
        disabled={saving}
        onClick={save}
        className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 text-white font-bold text-sm"
      >
        {saving ? "保存中..." : "保存情报"}
      </button>
      {msg && (
        <p className={`text-center text-sm ${msg.includes("✓") ? "text-emerald-400" : "text-red-400"}`}>{msg}</p>
      )}
    </div>
  );
}
