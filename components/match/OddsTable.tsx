"use client";

import type { BookmakerOdds } from "@/lib/odds-api";

interface Props {
  bookmakers: BookmakerOdds[];
  homeTeam: string;
  awayTeam: string;
  communityHome: number;
  communityDraw: number;
  communityAway: number;
}

function impliedProb(odds: number) {
  return (1 / odds) * 100;
}

export function OddsTable({ bookmakers, homeTeam, awayTeam, communityHome, communityDraw, communityAway }: Props) {
  if (!bookmakers || bookmakers.length === 0) return null;

  const bestHome = Math.max(...bookmakers.map((b) => b.home));
  const bestDraw = Math.max(...bookmakers.map((b) => b.draw));
  const bestAway = Math.max(...bookmakers.map((b) => b.away));

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800">
        <p className="text-sm font-semibold text-white">📊 各庄赔率对比</p>
        <p className="text-xs text-gray-500 mt-0.5">绿色 = 该结果最高赔率</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-500">
              <th className="text-left px-5 py-2 font-medium">博彩网站</th>
              <th className="text-center px-3 py-2 font-medium">{homeTeam} 胜</th>
              <th className="text-center px-3 py-2 font-medium">平局</th>
              <th className="text-center px-3 py-2 font-medium">{awayTeam} 胜</th>
            </tr>
          </thead>
          <tbody>
            {bookmakers
              .sort((a, b) => b.home - a.home)
              .map((bm) => (
                <tr key={bm.key} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30">
                  <td className="px-5 py-3 text-gray-300 font-medium">{bm.title}</td>
                  <td className={`px-3 py-3 text-center font-bold ${bm.home === bestHome ? "text-emerald-400" : "text-white"}`}>
                    {bm.home.toFixed(2)}
                    {bm.home === bestHome && <span className="ml-1 text-xs">★</span>}
                  </td>
                  <td className={`px-3 py-3 text-center font-bold ${bm.draw === bestDraw ? "text-emerald-400" : "text-white"}`}>
                    {bm.draw.toFixed(2)}
                    {bm.draw === bestDraw && <span className="ml-1 text-xs">★</span>}
                  </td>
                  <td className={`px-3 py-3 text-center font-bold ${bm.away === bestAway ? "text-emerald-400" : "text-white"}`}>
                    {bm.away.toFixed(2)}
                    {bm.away === bestAway && <span className="ml-1 text-xs">★</span>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* 社区 vs 最佳赔率对比 */}
      <div className="px-5 py-4 bg-gray-800/30 border-t border-gray-800">
        <p className="text-xs text-gray-500 mb-3">社区概率 vs 最佳赔率隐含概率</p>
        <div className="grid grid-cols-3 gap-3">
          <CompareCell
            label={`${homeTeam} 胜`}
            communityPct={communityHome}
            bestOdds={bestHome}
          />
          <CompareCell
            label="平局"
            communityPct={communityDraw}
            bestOdds={bestDraw}
          />
          <CompareCell
            label={`${awayTeam} 胜`}
            communityPct={communityAway}
            bestOdds={bestAway}
          />
        </div>
      </div>
    </div>
  );
}

function CompareCell({ label, communityPct, bestOdds }: {
  label: string;
  communityPct: number;
  bestOdds: number;
}) {
  const bookieProb = impliedProb(bestOdds);
  const edge = communityPct - bookieProb;
  const hasValue = edge > 5;

  return (
    <div className={`rounded-xl p-3 text-center border ${hasValue ? "border-yellow-400/40 bg-yellow-400/5" : "border-gray-800 bg-gray-900"}`}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-lg font-black ${hasValue ? "text-yellow-400" : "text-white"}`}>
        {bestOdds.toFixed(2)}
      </p>
      <div className="mt-1 space-y-0.5">
        <p className="text-xs text-gray-500">庄: {bookieProb.toFixed(1)}%</p>
        <p className="text-xs text-emerald-400">我们: {communityPct.toFixed(1)}%</p>
        {hasValue && (
          <p className="text-xs text-yellow-400 font-bold">+{edge.toFixed(1)}% 价值 🔥</p>
        )}
      </div>
    </div>
  );
}
