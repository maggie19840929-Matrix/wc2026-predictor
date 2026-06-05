import { createClient } from "@/lib/supabase/server";

export const revalidate = 120;

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("leaderboard").select("*").limit(50);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">排行榜</h1>
        <p className="text-gray-400 mt-1 text-sm">看看谁最懂球</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-5 py-3 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
          <span>#</span>
          <span>昵称</span>
          <span className="text-right">命中率</span>
          <span className="text-right">积分</span>
        </div>

        {(rows ?? []).length === 0 && (
          <p className="text-center py-10 text-gray-500">快去预测，成为第一名！</p>
        )}

        {(rows ?? []).map((row, i) => (
          <div
            key={row.username}
            className={`grid grid-cols-[auto_1fr_auto_auto] gap-4 px-5 py-4 items-center border-b border-gray-800/50 last:border-0 ${
              i < 3 ? "bg-yellow-400/5" : ""
            }`}
          >
            <span className={`text-lg font-black w-8 text-center ${
              i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-gray-600"
            }`}>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : row.rank}
            </span>

            <div>
              <p className="font-semibold text-white">{row.username}</p>
              <p className="text-xs text-gray-500">
                {row.correct_predictions}/{row.settled_predictions} 已结算场次命中
              </p>
            </div>

            <span className="text-right text-sm text-emerald-400 font-medium">
              {row.accuracy_pct}%
            </span>

            <span className="text-right text-lg font-black text-white">
              {row.total_points}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-sm space-y-2">
        <p className="font-semibold text-white">积分规则</p>
        <ul className="space-y-1 list-disc list-inside text-gray-400 text-sm">
          <li>猜中胜平负 → <span className="text-white font-bold">+3分</span></li>
          <li>猜中净胜球差 → <span className="text-white font-bold">+5分</span></li>
          <li>猜中精确比分 → <span className="text-white font-bold">+8分</span></li>
        </ul>
      </div>
    </div>
  );
}
