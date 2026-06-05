"use client";

import { useState } from "react";

interface SubjectiveData {
  subj_home_form: number;
  subj_away_form: number;
  subj_motivation: number;
  subj_venue: number;
  subj_intel: string;
  subj_home_intel: number;
  subj_away_intel: number;
}

interface Props {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  initial?: Partial<SubjectiveData>;
  onSaved?: (data: SubjectiveData) => void;
}

const ADMIN_PASSWORD = "wc2026";

function StarRating({ value, onChange, label }: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-300">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`w-7 h-7 rounded-full text-sm font-bold transition-all ${
              n <= value
                ? "bg-yellow-400 text-black"
                : "bg-gray-800 text-gray-600 hover:bg-gray-700"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function TripleToggle({ value, onChange, negLabel, posLabel }: {
  value: number;
  onChange: (v: number) => void;
  negLabel: string;
  posLabel: string;
}) {
  const options = [
    { v: -2, label: negLabel + " ++" },
    { v: -1, label: negLabel + " +" },
    { v: 0, label: "中性" },
    { v: 1, label: posLabel + " +" },
    { v: 2, label: posLabel + " ++" },
  ];
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map(({ v, label }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            value === v
              ? v > 0 ? "bg-emerald-500 text-white" : v < 0 ? "bg-red-500 text-white" : "bg-gray-500 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function SubjectiveForm({ matchId, homeTeam, awayTeam, initial, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [homeForm, setHomeForm] = useState(initial?.subj_home_form ?? 3);
  const [awayForm, setAwayForm] = useState(initial?.subj_away_form ?? 3);
  const [motivation, setMotivation] = useState(initial?.subj_motivation ?? 0);
  const [venue, setVenue] = useState(initial?.subj_venue ?? 0);
  const [intel, setIntel] = useState(initial?.subj_intel ?? "");
  const [homeIntel, setHomeIntel] = useState(initial?.subj_home_intel ?? 0);
  const [awayIntel, setAwayIntel] = useState(initial?.subj_away_intel ?? 0);

  function auth() {
    if (pwd === ADMIN_PASSWORD) { setAuthed(true); setPwdError(""); }
    else setPwdError("密码错误");
  }

  async function save() {
    setSaving(true);
    setMsg("");
    const data: SubjectiveData = {
      subj_home_form: homeForm,
      subj_away_form: awayForm,
      subj_motivation: motivation,
      subj_venue: venue,
      subj_intel: intel,
      subj_home_intel: homeIntel,
      subj_away_intel: awayIntel,
    };

    const res = await fetch("/api/subjective", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match_id: matchId, secret: "my-secret-key-123", ...data }),
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

  if (!open) {
    const hasData = initial?.subj_home_form;
    return (
      <button
        onClick={() => setOpen(true)}
        className={`text-xs underline transition-colors ${
          hasData ? "text-yellow-400 hover:text-yellow-300" : "text-gray-600 hover:text-yellow-400"
        }`}
      >
        {hasData ? "✏️ 修改主观评估" : "✏️ 录入主观评估"}
      </button>
    );
  }

  return (
    <div className="bg-gray-900 border border-purple-400/30 rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-purple-300">🧠 主观评估录入</p>
        <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white text-lg">×</button>
      </div>

      {!authed ? (
        <div className="space-y-3">
          <input
            type="password"
            placeholder="管理密码"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && auth()}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400"
          />
          <button onClick={auth} className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm">
            确认
          </button>
          {pwdError && <p className="text-red-400 text-xs text-center">{pwdError}</p>}
        </div>
      ) : (
        <div className="space-y-5">
          {/* 近期状态 */}
          <div className="space-y-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider">近期状态（1=很差 5=极佳）</p>
            <StarRating value={homeForm} onChange={setHomeForm} label={`${homeTeam} 状态`} />
            <StarRating value={awayForm} onChange={setAwayForm} label={`${awayTeam} 状态`} />
          </div>

          {/* 赛事重要性 */}
          <div className="space-y-2 border-t border-gray-800 pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">赛事重要性 / 求胜动力</p>
            <TripleToggle value={motivation} onChange={setMotivation} negLabel={awayTeam} posLabel={homeTeam} />
          </div>

          {/* 场地气候 */}
          <div className="space-y-2 border-t border-gray-800 pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">场地 / 气候 / 主场优势</p>
            <TripleToggle value={venue} onChange={setVenue} negLabel="不利主队" posLabel="有利主队" />
          </div>

          {/* 特别情报 */}
          <div className="space-y-2 border-t border-gray-800 pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">特别情报（伤停/换帅/内部消息）</p>
            <textarea
              placeholder="如：主队主力前锋因伤缺阵，客队近期换帅士气不稳..."
              value={intel}
              onChange={(e) => setIntel(e.target.value)}
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-400 resize-none"
            />
            <p className="text-xs text-gray-500">情报对比赛影响：</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-500 mb-1">{homeTeam}</p>
                <TripleToggle value={homeIntel} onChange={setHomeIntel} negLabel="利空" posLabel="利好" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">{awayTeam}</p>
                <TripleToggle value={awayIntel} onChange={setAwayIntel} negLabel="利空" posLabel="利好" />
              </div>
            </div>
          </div>

          <button
            disabled={saving}
            onClick={save}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white font-bold text-sm"
          >
            {saving ? "保存中..." : "保存评估"}
          </button>
          {msg && (
            <p className={`text-center text-sm ${msg.includes("✓") ? "text-emerald-400" : "text-red-400"}`}>{msg}</p>
          )}
        </div>
      )}
    </div>
  );
}
