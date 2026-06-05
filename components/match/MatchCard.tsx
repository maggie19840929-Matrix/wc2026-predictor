"use client";

import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { PredictionBar } from "@/components/ui/PredictionBar";
import { ValueBadge } from "@/components/ui/ValueBadge";
import { detectValueBets } from "@/lib/value-bet";
import type { Match } from "@/types";

interface Props {
  match: Match;
  userOutcome?: string;
}

const STATUS_LABEL: Record<string, string> = {
  TIMED: "",
  IN_PLAY: "🔴 进行中",
  PAUSED: "⏸ 中场",
  FINISHED: "已结束",
  POSTPONED: "延期",
};

export function MatchCard({ match, userOutcome }: Props) {
  const valueBets = detectValueBets(match);
  const isFinished = match.status === "FINISHED";
  const isLive = match.status === "IN_PLAY" || match.status === "PAUSED";

  return (
    <Link href={`/matches/${match.id}`}>
      <div className="group relative bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-emerald-500/50 hover:bg-gray-800/80 transition-all cursor-pointer">
        {/* Stage badge */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs text-gray-500 uppercase tracking-wider">{match.stage}</span>
          <span className={`text-xs font-medium ${isLive ? "text-red-400 animate-pulse" : "text-gray-400"}`}>
            {isLive ? STATUS_LABEL[match.status] : format(new Date(match.utc_date), "MM/dd HH:mm", { locale: zhCN })}
          </span>
        </div>

        {/* Teams and score */}
        <div className="flex items-center justify-between gap-3">
          <TeamBlock name={match.home_team.shortName} crest={match.home_team.crest} align="left" />

          <div className="text-center min-w-[80px]">
            {isFinished || isLive ? (
              <div className="text-3xl font-black text-white">
                {match.home_score ?? 0} : {match.away_score ?? 0}
              </div>
            ) : (
              <div className="text-lg font-bold text-gray-500">VS</div>
            )}
            {userOutcome && (
              <span className="text-xs mt-1 inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                已预测: {userOutcome === "HOME" ? "主胜" : userOutcome === "DRAW" ? "平" : "客胜"}
              </span>
            )}
          </div>

          <TeamBlock name={match.away_team.shortName} crest={match.away_team.crest} align="right" />
        </div>

        {/* Prediction bar */}
        {match.total_predictions > 0 && (
          <div className="mt-4">
            <PredictionBar
              homePct={match.home_pct}
              drawPct={match.draw_pct}
              awayPct={match.away_pct}
              total={match.total_predictions}
              homeTeam={match.home_team.shortName}
              awayTeam={match.away_team.shortName}
            />
          </div>
        )}

        {/* Value bets */}
        {valueBets.length > 0 && (
          <div className="mt-3">
            <ValueBadge bets={valueBets} />
          </div>
        )}

        {/* Odds row */}
        {match.home_odds && (
          <div className="mt-3 flex justify-between text-xs text-gray-400 border-t border-gray-800 pt-3">
            <span>主胜 <strong className="text-white">{match.home_odds}</strong></span>
            <span>平 <strong className="text-white">{match.draw_odds}</strong></span>
            <span>客胜 <strong className="text-white">{match.away_odds}</strong></span>
          </div>
        )}
      </div>
    </Link>
  );
}

function TeamBlock({ name, crest, align }: { name: string; crest: string; align: "left" | "right" }) {
  return (
    <div className={`flex flex-col items-center gap-1.5 w-24 ${align === "right" ? "items-end" : "items-start"}`}>
      <Image
        src={crest}
        alt={name}
        width={40}
        height={40}
        className="object-contain"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <span className="text-sm font-semibold text-white text-center leading-tight">{name}</span>
    </div>
  );
}
