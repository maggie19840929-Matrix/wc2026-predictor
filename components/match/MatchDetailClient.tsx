"use client";

import { useState } from "react";
import { AyxOddsForm } from "./AyxOddsForm";
import { RecommendationCard } from "./RecommendationCard";
import { recommend } from "@/lib/recommendation";
import { SubjectiveForm } from "./SubjectiveForm";
import type { BookmakerOdds } from "@/lib/odds-api";
import type { RecentForm, H2HRecord } from "@/lib/team-stats";
import type { SubjectiveData } from "@/lib/recommendation";

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
  homeForm?: RecentForm;
  awayForm?: RecentForm;
  h2h?: H2HRecord;
  initialSubjective?: Partial<SubjectiveData>;
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
  homeForm,
  awayForm,
  h2h,
  initialSubjective,
}: Props) {
  const [ayxHome, setAyxHome] = useState(initialAyxHome);
  const [ayxDraw, setAyxDraw] = useState(initialAyxDraw);
  const [ayxAway, setAyxAway] = useState(initialAyxAway);
  const [subjective, setSubjective] = useState<SubjectiveData | undefined>(
    initialSubjective?.subj_home_form ? (initialSubjective as SubjectiveData) : undefined
  );

  const hasAyx = ayxHome && ayxDraw && ayxAway;
  const hasCommunity = totalPredictions >= 3;

  const recommendation =
    hasAyx && hasCommunity
      ? recommend(
          communityHome,
          communityDraw,
          communityAway,
          { home: ayxHome, draw: ayxDraw, away: ayxAway },
          bookmakers,
          homeForm,
          awayForm,
          h2h,
          subjective,
        )
      : null;

  return (
    <div className="space-y-4">
      {/* 主观评估录入 */}
      <SubjectiveForm
        matchId={matchId}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        initial={initialSubjective}
        onSaved={(data) => setSubjective(data)}
      />

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
          communityHome={communityHome}
          communityDraw={communityDraw}
          communityAway={communityAway}
          hasSubjective={!!subjective}
          hasH2H={!!(h2h && h2h.played > 0)}
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
