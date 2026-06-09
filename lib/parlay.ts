/**
 * 串关策略算法
 * 使用 Kelly 准则计算最优投注比例，生成三种风格策略
 */

export interface ParlaySelection {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  utcDate: string;
  outcome: "HOME" | "DRAW" | "AWAY";
  outcomeLabel: string;
  teamLabel: string; // "巴西" 或 "平局"
  odds: number;
  estimatedProb: number; // 我们估计的胜率
  impliedProb: number;   // 庄家隐含概率（去水）
  edge: number;          // 正值 = 有价值
  confidence: number;    // 0-100
}

export interface ParlayBet {
  id: string;
  legs: number;
  label: string; // "单关" | "2串1" | "3串1" | "4串1"
  selections: ParlaySelection[];
  combinedOdds: number;
  jointProb: number;
  expectedValue: number; // EV per unit, e.g. 0.15 = 15% 正期望
  kellyFraction: number; // raw kelly 比例
  risk: "safe" | "medium" | "bold";
}

export type StrategyMode = "conservative" | "balanced" | "aggressive";

export interface StrategyAllocation {
  bet: ParlayBet;
  fraction: number;    // 占预算比例
  amount: number;      // 实际金额
  maxReturn: number;   // 全中最大收益
}

export interface DailyStrategy {
  mode: StrategyMode;
  modeLabel: string;
  budget: number;
  allocations: StrategyAllocation[];
  totalBet: number;
  reserved: number;    // 未投出的预算（防守资金）
  bestCaseReturn: number;
  worstCaseReturn: number;
  expectedValue: number; // 数学期望净收益
}

// ---- 工具函数 ----

/** 小数赔率 → 隐含概率（去除水分后） */
function fairImplied(home: number, draw: number, away: number, target: number): number {
  const total = 1 / home + 1 / draw + 1 / away;
  return (1 / target) / total;
}

/** Kelly 公式 */
function kelly(odds: number, prob: number): number {
  // f* = (b*p - q) / b, b = odds - 1
  const b = odds - 1;
  const f = (b * prob - (1 - prob)) / b;
  return Math.max(0, f);
}

/** 串关 Kelly：联合赔率 × 联合概率 */
function parlayKelly(combinedOdds: number, jointProb: number): number {
  return kelly(combinedOdds, jointProb);
}

// ---- 主算法 ----

/**
 * 从今日比赛数据构建可用于串关的候选场次
 */
export function buildSelections(matches: {
  id: string;
  homeTeam: string;
  awayTeam: string;
  utcDate: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  communityHome: number; // 0-100
  communityDraw: number;
  communityAway: number;
  totalPredictions: number;
}[]): ParlaySelection[] {
  const results: ParlaySelection[] = [];

  for (const m of matches) {
    const { homeOdds: h, drawOdds: d, awayOdds: a } = m;
    if (h <= 1 || d <= 1 || a <= 1) continue; // 赔率无效

    const outcomes: Array<{
      key: "HOME" | "DRAW" | "AWAY";
      label: string;
      teamLabel: string;
      odds: number;
      communityPct: number;
    }> = [
      { key: "HOME", label: "主胜", teamLabel: m.homeTeam, odds: h, communityPct: m.communityHome },
      { key: "DRAW", label: "平局", teamLabel: "平局", odds: d, communityPct: m.communityDraw },
      { key: "AWAY", label: "客胜", teamLabel: m.awayTeam, odds: a, communityPct: m.communityAway },
    ];

    // 找社区最看好的结果
    const best = outcomes.sort((x, y) => y.communityPct - x.communityPct)[0];
    const communityPct = best.communityPct;

    // 估计概率：以社区预测为主，投票太少时向庄家隐含概率收缩
    const impliedProb = fairImplied(h, d, a, best.odds);
    let estimatedProb: number;
    if (m.totalPredictions >= 5) {
      // 有足够投票：用社区概率，但做温和校准（防止极端值）
      estimatedProb = 0.7 * (communityPct / 100) + 0.3 * impliedProb;
    } else {
      // 投票太少：主要依赖庄家隐含概率，略微上浮（因为我们选了最高概率结果）
      estimatedProb = impliedProb * 1.03;
    }

    const edge = estimatedProb - impliedProb;

    // 置信度
    const baseConf = Math.round(estimatedProb * 100);
    let confidence = baseConf;
    if (edge > 0.05) confidence = Math.min(confidence + 10, 95);
    else if (edge < -0.05) confidence = Math.max(confidence - 10, 20);
    if (m.totalPredictions < 5) confidence = Math.round(confidence * 0.8);

    // 只保留正期望场次
    if (edge > 0 && confidence >= 40) {
      results.push({
        matchId: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        utcDate: m.utcDate,
        outcome: best.key,
        outcomeLabel: best.label,
        teamLabel: best.teamLabel,
        odds: best.odds,
        estimatedProb,
        impliedProb,
        edge,
        confidence,
      });
    }
  }

  // 按 edge 降序
  return results.sort((a, b) => b.edge - a.edge);
}

/**
 * 根据候选场次生成所有值得考虑的串关注单
 */
export function generateBets(selections: ParlaySelection[]): ParlayBet[] {
  const bets: ParlayBet[] = [];
  const top = selections.slice(0, 6); // 只取前6

  // 单关
  for (const s of top.slice(0, 4)) {
    const kf = kelly(s.odds, s.estimatedProb);
    if (kf <= 0) continue;
    bets.push({
      id: `single-${s.matchId}`,
      legs: 1,
      label: "单关",
      selections: [s],
      combinedOdds: s.odds,
      jointProb: s.estimatedProb,
      expectedValue: s.odds * s.estimatedProb - 1,
      kellyFraction: kf,
      risk: "safe",
    });
  }

  // 2串1：top4中所有组合
  for (let i = 0; i < Math.min(top.length, 4); i++) {
    for (let j = i + 1; j < Math.min(top.length, 4); j++) {
      const s1 = top[i], s2 = top[j];
      const combinedOdds = +(s1.odds * s2.odds).toFixed(2);
      const jointProb = s1.estimatedProb * s2.estimatedProb;
      const ev = combinedOdds * jointProb - 1;
      const kf = parlayKelly(combinedOdds, jointProb);
      if (ev <= 0 || kf <= 0) continue;
      bets.push({
        id: `parlay2-${s1.matchId}-${s2.matchId}`,
        legs: 2,
        label: "2串1",
        selections: [s1, s2],
        combinedOdds,
        jointProb,
        expectedValue: ev,
        kellyFraction: kf,
        risk: "medium",
      });
    }
  }

  // 3串1：top4中所有组合
  for (let i = 0; i < Math.min(top.length, 4); i++) {
    for (let j = i + 1; j < Math.min(top.length, 4); j++) {
      for (let k = j + 1; k < Math.min(top.length, 4); k++) {
        const s1 = top[i], s2 = top[j], s3 = top[k];
        const combinedOdds = +(s1.odds * s2.odds * s3.odds).toFixed(2);
        const jointProb = s1.estimatedProb * s2.estimatedProb * s3.estimatedProb;
        const ev = combinedOdds * jointProb - 1;
        const kf = parlayKelly(combinedOdds, jointProb);
        if (ev <= 0 || kf <= 0) continue;
        bets.push({
          id: `parlay3-${s1.matchId}-${s2.matchId}-${s3.matchId}`,
          legs: 3,
          label: "3串1",
          selections: [s1, s2, s3],
          combinedOdds,
          jointProb,
          expectedValue: ev,
          kellyFraction: kf,
          risk: "bold",
        });
      }
    }
  }

  // 4串1：top4全部
  if (top.length >= 4) {
    const ss = top.slice(0, 4);
    const combinedOdds = +ss.reduce((acc, s) => acc * s.odds, 1).toFixed(2);
    const jointProb = ss.reduce((acc, s) => acc * s.estimatedProb, 1);
    const ev = combinedOdds * jointProb - 1;
    const kf = parlayKelly(combinedOdds, jointProb);
    if (ev > 0 && kf > 0) {
      bets.push({
        id: `parlay4-${ss.map(s => s.matchId).join("-")}`,
        legs: 4,
        label: "4串1",
        selections: ss,
        combinedOdds,
        jointProb,
        expectedValue: ev,
        kellyFraction: kf,
        risk: "bold",
      });
    }
  }

  return bets;
}

/**
 * 给定预算和策略模式，生成资金分配方案
 */
export function allocateBudget(
  bets: ParlayBet[],
  budget: number,
  mode: StrategyMode,
): DailyStrategy {
  const modeLabels: Record<StrategyMode, string> = {
    conservative: "保守",
    balanced: "均衡",
    aggressive: "激进",
  };

  // 按模式过滤注单
  let candidates: ParlayBet[];
  let kellyMultiplier: number;
  let maxBetFraction: number; // 单注最高占预算比例

  if (mode === "conservative") {
    candidates = bets.filter(b => b.legs <= 2 && b.risk !== "bold")
      .sort((a, b) => b.expectedValue - a.expectedValue)
      .slice(0, 3);
    kellyMultiplier = 0.25;
    maxBetFraction = 0.40;
  } else if (mode === "balanced") {
    candidates = bets.filter(b => b.legs <= 3)
      .sort((a, b) => b.expectedValue - a.expectedValue)
      .slice(0, 5);
    kellyMultiplier = 0.50;
    maxBetFraction = 0.35;
  } else {
    candidates = bets
      .sort((a, b) => b.expectedValue - a.expectedValue)
      .slice(0, 6);
    kellyMultiplier = 1.0;
    maxBetFraction = 0.30;
  }

  if (candidates.length === 0) {
    return {
      mode, modeLabel: modeLabels[mode], budget,
      allocations: [], totalBet: 0, reserved: budget,
      bestCaseReturn: 0, worstCaseReturn: -budget,
      expectedValue: 0,
    };
  }

  // 计算每注的调整后 kelly 分数
  const rawFractions = candidates.map(b =>
    Math.min(b.kellyFraction * kellyMultiplier, maxBetFraction)
  );

  // 归一化：总投注不超过 70% 预算
  const rawSum = rawFractions.reduce((a, b) => a + b, 0);
  const maxTotalFraction = mode === "conservative" ? 0.60 : mode === "balanced" ? 0.70 : 0.80;
  const scale = rawSum > maxTotalFraction ? maxTotalFraction / rawSum : 1;
  const finalFractions = rawFractions.map(f => f * scale);

  const allocations: StrategyAllocation[] = candidates.map((bet, i) => {
    const fraction = finalFractions[i];
    const amount = Math.max(1, Math.round(budget * fraction));
    return {
      bet,
      fraction,
      amount,
      maxReturn: Math.round(amount * bet.combinedOdds),
    };
  });

  const totalBet = allocations.reduce((sum, a) => sum + a.amount, 0);
  const reserved = budget - totalBet;
  const bestCaseReturn = Math.max(...allocations.map(a => a.maxReturn));
  const expectedValue = allocations.reduce(
    (sum, a) => sum + a.amount * a.bet.expectedValue, 0
  );

  return {
    mode, modeLabel: modeLabels[mode], budget,
    allocations,
    totalBet,
    reserved,
    bestCaseReturn,
    worstCaseReturn: -totalBet,
    expectedValue: Math.round(expectedValue),
  };
}
