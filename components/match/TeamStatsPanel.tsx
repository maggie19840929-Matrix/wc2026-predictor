import type { RecentForm, H2HRecord } from "@/lib/team-stats";

interface Props {
  homeTeam: string;
  awayTeam: string;
  homeForm: RecentForm;
  awayForm: RecentForm;
  h2h: H2HRecord;
}

function FormDot({ char }: { char: string }) {
  const color =
    char === "W" ? "bg-emerald-500" : char === "D" ? "bg-gray-500" : "bg-red-500";
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black text-white ${color}`}>
      {char === "W" ? "胜" : char === "D" ? "平" : "负"}
    </span>
  );
}

function FormBar({ form, label }: { form: RecentForm; label: string }) {
  if (form.played === 0) return null;
  const winRate = Math.round((form.wins / form.played) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{label}</span>
        <span className="text-xs text-gray-400">
          {form.wins}胜{form.draws}平{form.losses}负 · 进{form.goalsFor}失{form.goalsAgainst}
        </span>
      </div>
      <div className="flex gap-1">
        {form.formString.split("").map((c, i) => <FormDot key={i} char={c} />)}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-800 rounded-full h-1.5">
          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${winRate}%` }} />
        </div>
        <span className="text-xs text-emerald-400 w-10 text-right">胜率{winRate}%</span>
      </div>
    </div>
  );
}

export function TeamStatsPanel({ homeTeam, awayTeam, homeForm, awayForm, h2h }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800">
        <p className="text-sm font-semibold text-white">📈 客观数据分析</p>
      </div>

      <div className="px-5 py-4 space-y-6">
        {/* 近期状态 */}
        <div className="space-y-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">近期状态（最近5场）</p>
          <FormBar form={homeForm} label={homeTeam} />
          <FormBar form={awayForm} label={awayTeam} />
        </div>

        {/* 历史交锋 */}
        {h2h.played > 0 && (
          <div className="space-y-3 border-t border-gray-800 pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              历史交锋（近{h2h.played}场）
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-800 rounded-xl py-3">
                <p className="text-2xl font-black text-emerald-400">{h2h.homeWins}</p>
                <p className="text-xs text-gray-400 mt-1">{homeTeam} 胜</p>
              </div>
              <div className="bg-gray-800 rounded-xl py-3">
                <p className="text-2xl font-black text-gray-300">{h2h.draws}</p>
                <p className="text-xs text-gray-400 mt-1">平局</p>
              </div>
              <div className="bg-gray-800 rounded-xl py-3">
                <p className="text-2xl font-black text-blue-400">{h2h.awayWins}</p>
                <p className="text-xs text-gray-400 mt-1">{awayTeam} 胜</p>
              </div>
            </div>

            {/* 最近交锋记录 */}
            {h2h.recentMatches.length > 0 && (
              <div className="space-y-1.5">
                {h2h.recentMatches.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-gray-400 bg-gray-800/50 rounded-lg px-3 py-2">
                    <span className="w-16 text-gray-600">{m.date}</span>
                    <span className="flex-1 text-right">{m.homeTeam}</span>
                    <span className="mx-3 font-black text-white">{m.homeScore} : {m.awayScore}</span>
                    <span className="flex-1">{m.awayTeam}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {h2h.played === 0 && (
          <div className="border-t border-gray-800 pt-4 text-center text-gray-600 text-sm">
            暂无历史交锋数据
          </div>
        )}
      </div>
    </div>
  );
}
