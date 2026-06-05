import type { ValueBet } from "@/types";

const LABELS: Record<string, string> = { HOME: "主", DRAW: "平", AWAY: "客" };

interface Props {
  bets: ValueBet[];
}

export function ValueBadge({ bets }: Props) {
  if (bets.length === 0) return null;
  return (
    <div className="flex gap-2 flex-wrap">
      {bets.map((b) => (
        <span
          key={b.outcome}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-400/20 text-yellow-300 border border-yellow-400/40"
        >
          🔥 价值投注 · {LABELS[b.outcome]}胜
          <span className="text-yellow-400">+{(b.edge * 100).toFixed(1)}%</span>
        </span>
      ))}
    </div>
  );
}
