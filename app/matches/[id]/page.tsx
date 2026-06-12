import { createClient } from "@/lib/supabase/server";
import { PredictionBar } from "@/components/ui/PredictionBar";
import { ValueBadge } from "@/components/ui/ValueBadge";
import { OddsTable } from "@/components/match/OddsTable";
import { MatchInteractiveSection } from "@/components/match/MatchInteractiveSection";
import { TeamStatsPanel } from "@/components/match/TeamStatsPanel";
import { detectValueBets } from "@/lib/value-bet";
import { getTeamRecentForm, getH2H } from "@/lib/team-stats";
import type { BookmakerOdds } from "@/lib/odds-api";
import type { IntelFactors } from "@/lib/intel";
import Image from "next/image";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { notFound } from "next/navigation";
import type { Match } from "@/types";

export const revalidate = 30;

function toMatch(row: Record<string, unknown>): Match {
  return {
    id: row.id as string,
    api_id: row.api_id as number,
    home_team: {
      id: row.home_team_id as number,
      name: row.home_team_name as string,
      shortName: row.home_team_short as string,
      crest: row.home_team_crest as string,
    },
    away_team: {
      id: row.away_team_id as number,
      name: row.away_team_name as string,
      shortName: row.away_team_short as string,
      crest: row.away_team_crest as string,
    },
    utc_date: row.utc_date as string,
    status: row.status as Match["status"],
    stage: row.stage as string,
    group: row.group as string | undefined,
    home_score: row.home_score as number | null,
    away_score: row.away_score as number | null,
    home_odds: row.home_odds as number | null,
    draw_odds: row.draw_odds as number | null,
    away_odds: row.away_odds as number | null,
    home_pct: Number(row.home_pct),
    draw_pct: Number(row.draw_pct),
    away_pct: Number(row.away_pct),
    total_predictions: row.total_predictions as number,
  };
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: row, error } = await supabase.from("matches").select("*").eq("id", id).single();
  if (error || !row) notFound();

  const match = toMatch(row);
  const canPredict = new Date(match.utc_date) > new Date() && match.status === "TIMED";
  const valueBets = detectValueBets(match);
  const oddsDetail: BookmakerOdds[] = (row.odds_detail as BookmakerOdds[]) ?? [];

  // 并行拉取客观数据
  const [homeForm, awayForm, h2h] = await Promise.all([
    getTeamRecentForm(match.home_team.id),
    getTeamRecentForm(match.away_team.id),
    getH2H(match.api_id, match.home_team.id, match.away_team.id),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Match header */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 text-center space-y-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider">
          {match.stage}{match.group ? ` · ${match.group}` : ""}
        </p>
        <p className="text-sm text-gray-400">
          {format(new Date(match.utc_date), "yyyy年MM月dd日 HH:mm", { locale: zhCN })}
        </p>

        <div className="flex items-center justify-around">
          <TeamDisplay team={match.home_team} />
          <div className="text-center">
            {match.status === "FINISHED" || match.status === "IN_PLAY" || match.status === "PAUSED" ? (
              <div className="text-5xl font-black text-white">
                {match.home_score} : {match.away_score}
              </div>
            ) : (
              <div className="text-2xl font-bold text-gray-500">VS</div>
            )}
            {match.status === "IN_PLAY" && (
              <span className="mt-1 inline-block text-xs text-red-400 animate-pulse">🔴 进行中</span>
            )}
          </div>
          <TeamDisplay team={match.away_team} />
        </div>
      </div>

      {/* Value bets */}
      {valueBets.length > 0 && (
        <div className="bg-yellow-400/5 border border-yellow-400/30 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-yellow-300">⚡ 价值投注分析</p>
          <ValueBadge bets={valueBets} />
          <p className="text-xs text-gray-400">
            社区预测概率显著高于庄家隐含概率时标记为价值投注。仅供参考，理性博彩。
          </p>
          {match.home_odds && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              <OddsCell label={`${match.home_team.shortName} 胜`} odds={match.home_odds} communityPct={match.home_pct} />
              <OddsCell label="平局" odds={match.draw_odds!} communityPct={match.draw_pct} />
              <OddsCell label={`${match.away_team.shortName} 胜`} odds={match.away_odds!} communityPct={match.away_pct} />
            </div>
          )}
        </div>
      )}

      {/* Community predictions */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-300">好友预测</p>
        {match.total_predictions > 0 ? (
          <PredictionBar
            homePct={match.home_pct}
            drawPct={match.draw_pct}
            awayPct={match.away_pct}
            total={match.total_predictions}
            homeTeam={match.home_team.shortName}
            awayTeam={match.away_team.shortName}
          />
        ) : (
          <p className="text-gray-500 text-sm">还没有人预测，成为第一个！</p>
        )}
      </div>

      {/* 客观数据面板 */}
      <TeamStatsPanel
        homeTeam={match.home_team.shortName}
        awayTeam={match.away_team.shortName}
        homeForm={homeForm}
        awayForm={awayForm}
        h2h={h2h}
      />

      {/* 预测解锁 + 综合推荐（先预测再解锁AI分析） */}
      <MatchInteractiveSection
        matchId={id}
        homeTeam={match.home_team.shortName}
        awayTeam={match.away_team.shortName}
        canPredict={canPredict}
        communityHome={match.home_pct}
        communityDraw={match.draw_pct}
        communityAway={match.away_pct}
        totalPredictions={match.total_predictions}
        initialAyxHome={match.home_odds ?? undefined}
        initialAyxDraw={match.draw_odds ?? undefined}
        initialAyxAway={match.away_odds ?? undefined}
        bookmakers={oddsDetail}
        homeForm={homeForm}
        awayForm={awayForm}
        h2h={h2h}
        initialAH={homeForm && awayForm && homeForm.played > 0 && awayForm.played > 0 ? {
          homeAHWinRate: homeForm.estimatedAHWinRate,
          awayAHWinRate: awayForm.estimatedAHWinRate,
        } : undefined}
        initialIntel={(row.intel_factors as IntelFactors | null) ?? null}
      />

      {/* 多平台赔率对比 */}
      {oddsDetail.length > 0 && (
        <OddsTable
          bookmakers={oddsDetail}
          homeTeam={match.home_team.shortName}
          awayTeam={match.away_team.shortName}
          communityHome={match.home_pct}
          communityDraw={match.draw_pct}
          communityAway={match.away_pct}
        />
      )}

      {/* 比赛已开始/结束提示 */}
      {!canPredict && (
        <div className="text-center py-4 text-gray-500 text-sm">
          {match.status === "FINISHED" ? "比赛已结束，预测窗口已关闭" : "比赛已开始，预测窗口已关闭"}
        </div>
      )}
    </div>
  );
}

function TeamDisplay({ team }: { team: Match["home_team"] }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Image src={team.crest} alt={team.name} width={64} height={64} className="object-contain" />
      <p className="text-white font-bold text-lg">{team.shortName}</p>
      <p className="text-gray-500 text-xs">{team.name}</p>
    </div>
  );
}

function OddsCell({ label, odds, communityPct }: { label: string; odds: number; communityPct: number }) {
  const impliedPct = Math.round((1 / odds) * 100);
  const edge = Math.round(communityPct - impliedPct);
  return (
    <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-white font-black text-xl">{odds}</p>
      <p className="text-xs text-gray-500 mt-1">庄家 {impliedPct}%</p>
      <p className="text-xs text-emerald-400">我们 {communityPct}%</p>
      {edge > 0 && <p className="text-xs text-yellow-400 font-bold">+{edge}% 价值</p>}
    </div>
  );
}
