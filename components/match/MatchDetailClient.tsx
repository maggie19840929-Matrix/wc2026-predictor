"use client";

import { useState } from "react";
import { AyxOddsForm } from "./AyxOddsForm";
import { RecommendationCard } from "./RecommendationCard";
import { recommend } from "@/lib/recommendation";
import type { BookmakerOdds } from "@/lib/odds-api";

interface Props {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  communityHome: number;
  communityDraw: number;
  communityAway: number;
  totalPredictions: number;
  initialAyxHome?: number;
  initialAyxDraw?: number;
  initialAyxAway?: number;
  bookmakers: BookmakerOdds[];
}

export function MatchDetailClient({
  matchId,
  homeTeam,
  awayTeam,
  communityHome,
  communityDraw,
  communityAway,
  totalPredictions,
  initialAyxHome,
  initialAyxDraw,
  initialAyxAway,
  bookmakers,
}: Props) {
  const [ayxHome, setAyxHome] = useState(initialAyxHome);
  const [ayxDraw, setAyxDraw] = useState(initialAyxDraw);
  const [ayxAway, setAyxAway] = useState(initialAyxAway);

  const hasAyx = ayxHome && ayxDraw && ayxAway;
  const hasCommunity = totalPredictions >= 3;

  const recommendation =
    hasAyx && hasCommunity
      ? recommend(
          communityHome,
          communityDraw,
          communityAway,
          { home: ayxHome, draw: ayxDraw, away: ayxAway },
          bookmakers
        )
      : null;

  return (
    <div className="space-y-4">
      {/* 录入爱游戏赔率 */}
      <div className="flex justify-end">
        <AyxOddsForm
          matchId={matchId}
          initialHome={ayxHome}
          initialDraw={ayxDraw}
          initialAway={ayxAway}
          onSaved={(h, d, a) => {
            setAyxHome(h);
            setAyxDraw(d);
            setAyxAway(a);
          }}
        />
      </div>

      {/* 推荐结论 */}
      {recommendation ? (
        <RecommendationCard
          result={recommendation}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-6 text-center space-y-2">
          <p className="text-2xl">🎯</p>
          <p className="text-gray-300 font-semibold">综合推荐待生成</p>
          <p className="text-gray-500 text-sm">
            {!hasAyx && "请先录入爱游戏赔率"}
            {hasAyx && !hasCommunity && "需要至少3人完成预测"}
          </p>
        </div>
      )}
    </div>
  );
}
