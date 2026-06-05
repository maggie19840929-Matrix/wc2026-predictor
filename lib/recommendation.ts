import type { BookmakerOdds } from "@/lib/odds-api";

export type Outcome = "HOME" | "DRAW" | "AWAY";

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
 * 综合推荐算法
 * 综合三个维度：
 * 1. 社区预测概率
 * 2. 爱游戏价值边际（社区概率 - 爱游戏隐含概率）
 * 3. 各庄共识（the-odds-api 平均隐含概率）
 */
export function recommend(
  communityHome: number,   // 社区预测百分比 0-100
  communityDraw: number,
  communityAway: number,
  ayx: AyxOdds,
  bookmakers: BookmakerOdds[]
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

  // 爱游戏价值边际（正数 = 爱游戏赔率偏高 = 有价值）
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

  // 综合评分：社区概率(40%) + 爱游戏价值(40%) + 市场共识(20%)
  const score = (o: "home" | "draw" | "away") =>
    comm[o] * 0.4 + ayxEdge[o] * 0.4 + marketEdge[o] * 0.2;

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

  // 置信度：基于社区概率 + 各方向一致性
  const communityProb = comm[outcomeKey];
  const ayxEdgeVal = ayxEdge[outcomeKey];
  const marketEdgeVal = marketEdge[outcomeKey];

  // 基础置信度来自社区概率
  let confidence = Math.round(communityProb * 100);

  // 爱游戏有正价值加分
  if (ayxEdgeVal > 0.05) confidence = Math.min(confidence + 10, 95);
  else if (ayxEdgeVal < -0.05) confidence = Math.max(confidence - 10, 20);

  // 市场共识一致加分
  if (marketEdgeVal > 0.03) confidence = Math.min(confidence + 5, 95);

  // 社区票数太少打折
  const totalPreds = communityHome + communityDraw + communityAway;
  if (totalPreds < 10) confidence = Math.round(confidence * 0.8);

  // 构建理由
  const reasons: string[] = [];

  reasons.push(`社区 ${Math.round(communityProb * 100)}% 看好此结果`);

  if (ayxEdgeVal > 0.03) {
    reasons.push(`爱游戏赔率 ${ayxOddsValue} 存在 +${(ayxEdgeVal * 100).toFixed(1)}% 价值空间`);
  } else if (ayxEdgeVal < -0.03) {
    reasons.push(`⚠️ 爱游戏赔率偏低，实际价值空间有限`);
  } else {
    reasons.push(`爱游戏赔率 ${ayxOddsValue} 与市场基本持平`);
  }

  if (bookmakers.length > 0) {
    const marketProb = Math.round(marketFair[outcomeKey] * 100);
    reasons.push(`各庄综合隐含概率 ${marketProb}%，与社区判断${Math.abs(communityProb * 100 - marketProb) < 5 ? "一致" : "存在分歧"}`);
  }

  // 警告
  let warning: string | undefined;
  if (ayxEdgeVal < -0.08) {
    warning = "爱游戏对此结果赔率明显偏低，谨慎投注";
  }
  if (communityProb < 0.35) {
    warning = "社区对此结果信心不足，风险较高";
  }

  return { outcome, label: outcomeLabel, confidence, ayxOdds: ayxOddsValue, reasons, warning };
}
