"use client";

interface Props {
  homePct: number;
  drawPct: number;
  awayPct: number;
  total: number;
  homeTeam: string;
  awayTeam: string;
}

export function PredictionBar({ homePct, drawPct, awayPct, total, homeTeam, awayTeam }: Props) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400 font-medium">
        <span>{homeTeam} {homePct}%</span>
        <span>平 {drawPct}%</span>
        <span>{awayPct}% {awayTeam}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden">
        <div className="bg-emerald-500 transition-all" style={{ width: `${homePct}%` }} />
        <div className="bg-gray-500 transition-all" style={{ width: `${drawPct}%` }} />
        <div className="bg-blue-500 transition-all" style={{ width: `${awayPct}%` }} />
      </div>
      <p className="text-center text-xs text-gray-500">{total.toLocaleString()} 人已预测</p>
    </div>
  );
}
