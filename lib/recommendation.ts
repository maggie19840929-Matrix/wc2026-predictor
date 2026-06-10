import type { BookmakerOdds } from "@/lib/odds-api";
import type { RecentForm, H2HRecord } from "@/lib/team-stats";

export type Outcome = "HOME" | "DRAW" | "AWAY";

export interface SubjectiveData {
  subj_home_form: number;   // 1-5（保留结构用于数据读取，但不参与算法）
  subj_away_form: number;
  subj_motivation: number;
  subj_venue: number;
  subj_intel: string;       // 情报文字（仅展示，不参与评分）
  subj_home_intel: number;
  subj_away_intel: number;
}

/** 让球盘近期数据 */
export interface AHData {
  homeAHWinRate: number;  // 主队近10场赢盘率 0-1，如 0.6
  awayAHWinRate: number;  // 客队近10场赢盘率 0-1
  homeOverRate?: number;  // 主队近10场大球率（可选）
  awayOverRate?: number;
}

export interface AyxOdds {
  home: number;
  draw: number;
  away: number;
}

export interface RecommendationResult {
  outcome: Outcome;
  label: string;
  confidence: number; // 0-100
  ayxOdds: number;
  reasons: string[];
  warning?: string;
}

/** 小数赔率 → 隐含概率（去除水分） */
function fairProbs(home: number, draw: number, away: number) {
  const raw = { home: 1 / home, draw: 1 / draw, away: 1 / away };
  const total = raw.home + raw.draw + raw.away;
  return {
    home: raw.home / total,
    draw: raw.draw / total,
    away: raw.away / total,
  };
}

/**
 * 综合推荐算法 v2
 *
 * 权重分配（共100%）：
 *   社区预测概率     30%
 *   AYX价值边际      25%
 *   市场共识         15%
 *   近期W/L状态      10%
 *   历史交锋 H2H      5%
 *   让球盘赢盘率     15%  ← 新增
 *   主观评估数值      0%  ← 移除（防止恶意污染）
 *
 * 情报文字仍展示，但不参与评分。
 */
export function recommend(
  communityHome: number,   // 社区预测百分比 0-100
  communityDraw: number,
  communityAway: number,
  ayx: AyxOdds,
  bookmakers: BookmakerOdds[],
  homeForm?: RecentForm,
  awayForm?: RecentForm,
  h2h?: H2HRecord,
  _subjective?: SubjectiveData,  // 保留参数兼容性，但不参与算法
  ahData?: AHData,
): RecommendationResult {
  const comm = {
    home: communityHome / 100,
    draw: communityDraw / 100,
    away: communityAway / 100,
  };

  // 爱游戏隐含概率（去水）
  const ayxFair = fairProbs(ayx.home, ayx.draw, ayx.away);

  // 各庄平均隐含概率（去水）
  let marketFair = { home: 0.33, draw: 0.33, away: 0.34 };
  if (bookmakers.length > 0) {
    const avg = bookmakers.reduce(
      (acc, b) => {
        const f = fairProbs(b.home, b.draw, b.away);
        return { home: acc.home + f.home, draw: acc.draw + f.draw, away: acc.away + f.away };
      },
      { home: 0, draw: 0, away: 0 }
    );
    marketFair = {
      home: avg.home / bookmakers.length,
      draw: avg.draw / bookmakers.length,
      away: avg.away / bookmakers.length,
    };
  }

  // AYX价值边际（正数 = AYX赔率偏高 = 有价值）
  const ayxEdge = {
    home: comm.home - ayxFair.home,
    draw: comm.draw - ayxFair.draw,
    away: comm.away - ayxFair.away,
  };

  // 市场共识边际
  const marketEdge = {
    home: comm.home - marketFair.home,
    draw: comm.draw - marketFair.draw,
    away: comm.away - marketFair.away,
  };

  // ── 近期W/L状态 (10%) ──
  let formBoost = { home: 0, draw: 0, away: 0 };
  if (homeForm && awayForm && homeForm.played > 0 && awayForm.played > 0) {
    const homeWinRate = homeForm.wins / homeForm.played;
    const awayWinRate = awayForm.wins / awayForm.played;
    const homeGoalDiff = (homeForm.goalsFor - homeForm.goalsAgainst) / homeForm.played;
    const awayGoalDiff = (awayForm.goalsFor - awayForm.goalsAgainst) / awayForm.played;
    const formDiff = (homeWinRate + homeGoalDiff * 0.05) - (awayWinRate + awayGoalDiff * 0.05);
    formBoost.home = formDiff * 0.1;
    formBoost.away = -formDiff * 0.1;
  }

  // ── 历史交锋 H2H (5%) ──
  let h2hBoost = { home: 0, draw: 0, away: 0 };
  if (h2h && h2h.played >= 3) {
    const homeH2HRate = h2h.homeWins / h2h.played;
    const awayH2HRate = h2h.awayWins / h2h.played;
    const drawH2HRate = h2h.draws / h2h.played;
    h2hBoost.home = (homeH2HRate - 0.33) * 0.08;
    h2hBoost.away = (awayH2HRate - 0.33) * 0.08;
    h2hBoost.draw = (drawH2HRate - 0.33) * 0.08;
  }

  // ── 让球盘赢盘率 (15%) ──
  // 赢盘率 > 0.5 说明球队近期表现超过庄家预期（即让球仍赢）
  // 范围：0-1，归一化到 ±0.15
  let ahBoost = { home: 0, draw: 0, away: 0 };
  if (ahData) {
    const { homeAHWinRate, awayAHWinRate } = ahData;
    // 与0.5基准的偏差，乘以0.3得到最大±0.15的加成
    ahBoost.home = (homeAHWinRate - 0.5) * 0.3;
    ahBoost.away = (awayAHWinRate - 0.5) * 0.3;
    // 双方赢盘率都高时，平局概率略升（强强对话更拉锯）
    if (homeAHWinRate >= 0.6 && awayAHWinRate >= 0.6) {
      ahBoost.draw += 0.02;
    }
  }

  // ── 综合评分 ──
  // 社区(30%) + AYX价值(25%) + 市场共识(15%) + 近期状态(10%) + H2H(5%) + AH盘路(15%)
  const score = (o: "home" | "draw" | "away") =>
    comm[o] * 0.30
    + ayxEdge[o] * 0.25
    + marketEdge[o] * 0.15
    + formBoost[o] * 0.10
    + h2hBoost[o] * 0.05
    + ahBoost[o] * 0.15;

  const scores = {
    home: score("home"),
    draw: score("draw"),
    away: score("away"),
  };

  // 找最高分
  const best = (Object.entries(scores) as [string, number][]).sort((a, b) => b[1] - a[1])[0];
  const outcomeKey = best[0] as "home" | "draw" | "away";
  const outcome: Outcome = outcomeKey === "home" ? "HOME" : outcomeKey === "draw" ? "DRAW" : "AWAY";
  const outcomeLabel = outcomeKey === "home" ? "主胜" : outcomeKey === "draw" ? "平局" : "客胜";
  const ayxOddsValue = ayx[outcomeKey];

  // 置信度
  const communityProb = comm[outcomeKey];
  const ayxEdgeVal = ayxEdge[outcomeKey];
  const marketEdgeVal = marketEdge[outcomeKey];

  let confidence = Math.round(communityProb * 100);
  if (ayxEdgeVal > 0.05) confidence = Math.min(confidence + 10, 95);
  else if (ayxEdgeVal < -0.05) confidence = Math.max(confidence - 10, 20);
  if (marketEdgeVal > 0.03) confidence = Math.min(confidence + 5, 95);

  // AH赢盘率加成置信度
  if (ahData) {
    const relevantAH = outcomeKey === "home" ? ahData.homeAHWinRate : outcomeKey === "away" ? ahData.awayAHWinRate : 0.5;
    if (relevantAH >= 0.7) confidence = Math.min(confidence + 8, 95);
    else if (relevantAH <= 0.3) confidence = Math.max(confidence - 8, 20);
  }

  const totalPreds = communityHome + communityDraw + communityAway;
  if (totalPreds < 10) confidence = Math.round(confidence * 0.8);

  // 构建理由
  const reasons: string[] = [];
  reasons.push(`社区 ${Math.round(communityProb * 100)}% 看好此结果`);

  if (ayxEdgeVal > 0.03) {
    reasons.push(`AYX赔率 ${ayxOddsValue} 存在 +${(ayxEdgeVal * 100).toFixed(1)}% 价值空间`);
  } else if (ayxEdgeVal < -0.03) {
    reasons.push(`⚠️ AYX赔率偏低，实际价值空间有限`);
  } else {
    reasons.push(`AYX赔率 ${ayxOddsValue} 与市场基本持平`);
  }

  if (bookmakers.length > 0) {
    const marketProb = Math.round(marketFair[outcomeKey] * 100);
    reasons.push(`各庄综合隐含概率 ${marketProb}%，与社区判断${Math.abs(communityProb * 100 - marketProb) < 5 ? "一致" : "存在分歧"}`);
  }

  if (ahData) {
    const homeRate = Math.round(ahData.homeAHWinRate * 100);
    const awayRate = Math.round(ahData.awayAHWinRate * 100);
    if (ahData.homeAHWinRate >= 0.6) reasons.push(`主队近期赢盘率 ${homeRate}%，超预期表现稳定`);
    else if (ahData.homeAHWinRate <= 0.4) reasons.push(`⚠️ 主队近期赢盘率仅 ${homeRate}%，覆盖能力偏弱`);
    if (ahData.awayAHWinRate >= 0.6) reasons.push(`客队近期赢盘率 ${awayRate}%，客场表现超预期`);
    else if (ahData.awayAHWinRate <= 0.4) reasons.push(`⚠️ 客队近期赢盘率仅 ${awayRate}%，客场覆盖偏弱`);
  }

  if (homeForm && awayForm && homeForm.played > 0) {
    const homeWR = Math.round(homeForm.wins / homeForm.played * 100);
    const awayWR = Math.round(awayForm.wins / awayForm.played * 100);
    if (Math.abs(homeWR - awayWR) >= 20) {
      reasons.push(`近期胜率：主队 ${homeWR}% vs 客队 ${awayWR}%，状态差距明显`);
    }
  }

  // 警告
  let warning: string | undefined;
  if (ayxEdgeVal < -0.08) warning = "AYX对此结果赔率明显偏低，谨慎投注";
  if (communityProb < 0.35) warning = "社区对此结果信心不足，风险较高";
  if (ahData && outcomeKey === "home" && ahData.homeAHWinRate <= 0.3) {
    warning = "主队近期赢盘率极低，即使胜出也可能让球失利";
  }

  return { outcome, label: outcomeLabel, confidence, ayxOdds: ayxOddsValue, reasons, warning };
}
