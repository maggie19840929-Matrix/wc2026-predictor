/**
 * 串关策略算法 v2 - 覆盖投注版
 * 每场比赛保留最多2个有价值的结果，对所有组合计算Kelly，按比例拆分资金
 */

export interface ParlaySelection {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  utcDate: string;
  outcome: "HOME" | "DRAW" | "AWAY";
  outcomeLabel: string;
  teamLabel: string;
  odds: number;
  estimatedProb: number;
  impliedProb: number;
  edge: number;
  confidence: number;
  isPrimary: boolean; // 是否为该场首选结果
}

export interface MatchCandidate {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  utcDate: string;
  outcomes: ParlaySelection[]; // 最多2个，按edge降序
}

export interface ParlayBet {
  id: string;
  legs: number;
  label: string;
  selections: ParlaySelection[];
  combinedOdds: number;
  jointProb: number;
  expectedValue: number; // EV per unit, 0.15 = 正期望15%
  kellyFraction: number;
  isPrimaryCombo: boolean; // 全部为首选结果
}

export interface PoolBetAllocation {
  bet: ParlayBet;
  amount: number;
  maxReturn: number;
}

export interface BetPool {
  legs: number;
  label: string; // "2串1 组合池"
  allocations: PoolBetAllocation[];
  totalAmount: number;
  bestReturn: number; // 池内最大单注收益
  poolEV: number;     // 池内加权期望净值
}

export type StrategyMode = "conservative" | "balanced" | "aggressive";

export interface DailyStrategy {
  mode: StrategyMode;
  modeLabel: string;
  budget: number;
  pools: BetPool[];
  totalBet: number;
  reserved: number;
  bestCaseReturn: number;
  expectedValue: number; // 数学期望净收益
}

// ── 工具函数 ──────────────────────────────────────────────

/** 小数赔率 → 去水隐含概率 */
function fairImplied(h: number, d: number, a: number, target: number): number {
  const total = 1 / h + 1 / d + 1 / a;
  return (1 / target) / total;
}

/** Kelly 公式，返回最优投注比例 */
function kelly(odds: number, prob: number): number {
  const b = odds - 1;
  const f = (b * prob - (1 - prob)) / b;
  return Math.max(0, f);
}

/** 从数组中选出所有 k 元子集 */
function choose<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  const [first, ...rest] = arr;
  return [
    ...choose(rest, k - 1).map((c) => [first, ...c]),
    ...choose(rest, k),
  ];
}

/** 多个数组的笛卡尔积 */
function cartesian<T>(arrays: T[][]): T[][] {
  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap((combo) => arr.map((item) => [...combo, item])),
    [[]]
  );
}

// ── 核心算法 ──────────────────────────────────────────────

/**
 * 从比赛数据构建候选：每场最多2个有价值结果
 */
export function buildMatchCandidates(matches: {
  id: string;
  homeTeam: string;
  awayTeam: string;
  utcDate: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  communityHome: number;
  communityDraw: number;
  communityAway: number;
  totalPredictions: number;
}[]): MatchCandidate[] {
  const candidates: MatchCandidate[] = [];

  for (const m of matches) {
    const { homeOdds: h, drawOdds: d, awayOdds: a } = m;
    if (h <= 1 || d <= 1 || a <= 1) continue;

    const defs = [
      { key: "HOME" as const, label: "主胜", teamLabel: m.homeTeam, odds: h, comm: m.communityHome },
      { key: "DRAW" as const, label: "平局", teamLabel: "平局",   odds: d, comm: m.communityDraw  },
      { key: "AWAY" as const, label: "客胜", teamLabel: m.awayTeam, odds: a, comm: m.communityAway },
    ];

    const viable: ParlaySelection[] = [];
    for (const def of defs) {
      const impliedProb = fairImplied(h, d, a, def.odds);
      // 估计概率：有足够社区投票时以社区为主，否则以隐含概率为基础
      const estimatedProb = m.totalPredictions >= 5
        ? 0.70 * (def.comm / 100) + 0.30 * impliedProb
        : impliedProb * 1.02;

      const edge = estimatedProb - impliedProb;
      // 正期望 = odds × estimatedProb > 1（单注层面有盈利可能）
      if (edge <= 0 || def.odds * estimatedProb <= 1.0) continue;

      let confidence = Math.round(estimatedProb * 100);
      if (edge > 0.05) confidence = Math.min(confidence + 8, 95);
      if (m.totalPredictions < 5) confidence = Math.round(confidence * 0.82);
      if (confidence < 35) continue;

      viable.push({
        matchId: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        utcDate: m.utcDate,
        outcome: def.key,
        outcomeLabel: def.label,
        teamLabel: def.teamLabel,
        odds: def.odds,
        estimatedProb,
        impliedProb,
        edge,
        confidence,
        isPrimary: false, // 待设置
      });
    }

    if (viable.length === 0) continue;

    // 按 edge 降序
    viable.sort((x, y) => y.edge - x.edge);
    viable[0].isPrimary = true;

    // 次选：edge > 0.01 且 estimatedProb > 0.15
    const selected = viable[1] && viable[1].edge > 0.01 && viable[1].estimatedProb > 0.15
      ? viable.slice(0, 2)
      : viable.slice(0, 1);

    candidates.push({
      matchId: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      utcDate: m.utcDate,
      outcomes: selected,
    });
  }

  // 按主选 edge 降序
  return candidates.sort((a, b) => b.outcomes[0].edge - a.outcomes[0].edge);
}

/**
 * 为给定 leg 数生成所有组合，返回 Kelly>0 且 EV>0 的注单
 */
function generatePool(candidates: MatchCandidate[], legs: number): ParlayBet[] {
  const top = candidates.slice(0, 6);
  const subsets = choose(top, legs);
  const bets: ParlayBet[] = [];

  for (const subset of subsets) {
    // 笛卡尔积：每场比赛的可选结果
    const outcomeArrays = subset.map((c) => c.outcomes);
    const combos = cartesian(outcomeArrays);

    for (const combo of combos) {
      const combinedOdds = +combo.reduce((acc, s) => acc * s.odds, 1).toFixed(2);
      const jointProb = combo.reduce((acc, s) => acc * s.estimatedProb, 1);
      const ev = combinedOdds * jointProb - 1;
      const kf = kelly(combinedOdds, jointProb);

      if (ev <= 0 || kf <= 0.003) continue;

      const isPrimaryCombo = combo.every((s) => s.isPrimary);

      bets.push({
        id: combo.map((s) => `${s.matchId}:${s.outcome}`).join("|"),
        legs,
        label: legs === 1 ? "单关" : `${legs}串1`,
        selections: combo,
        combinedOdds,
        jointProb,
        expectedValue: ev,
        kellyFraction: kf,
        isPrimaryCombo,
      });
    }
  }

  // 按 Kelly 降序，取前8（避免金额过于分散）
  return bets.sort((a, b) => b.kellyFraction - a.kellyFraction).slice(0, 8);
}

/**
 * 在池内按 Kelly 比例分配预算
 */
function allocatePool(
  bets: ParlayBet[],
  poolBudget: number,
  kellyMultiplier: number
): PoolBetAllocation[] {
  if (bets.length === 0 || poolBudget < 1) return [];

  const rawKellys = bets.map((b) =>
    Math.min(b.kellyFraction * kellyMultiplier, 0.40)
  );
  const totalRaw = rawKellys.reduce((a, b) => a + b, 0);
  // 让 Kelly 之和 ≤ 1 在池内，防止过度集中
  const scale = totalRaw > 1 ? 1 / totalRaw : 1;

  const allocations: PoolBetAllocation[] = [];
  let remaining = poolBudget;

  for (let i = 0; i < bets.length; i++) {
    const fraction = rawKellys[i] * scale;
    // 最后一注用剩余金额，其余四舍五入
    const amount = i === bets.length - 1
      ? Math.max(1, remaining)
      : Math.max(1, Math.round(poolBudget * fraction));
    remaining -= amount;
    if (remaining < 0) { remaining = 0; }
    allocations.push({
      bet: bets[i],
      amount,
      maxReturn: Math.round(amount * bets[i].combinedOdds),
    });
  }

  return allocations;
}

// ── 主入口 ─────────────────────────────────────────────────

/**
 * 生成完整的当日策略
 */
export function buildStrategy(
  candidates: MatchCandidate[],
  budget: number,
  mode: StrategyMode
): DailyStrategy {
  const modeLabel = { conservative: "保守", balanced: "均衡", aggressive: "激进" }[mode];

  // 各模式：pools配置 [legs, fraction][]，kellyMultiplier
  const configs: Record<StrategyMode, { pools: [number, number][]; km: number; maxTotal: number }> = {
    conservative: { pools: [[1, 0.30], [2, 0.70]],             km: 0.25, maxTotal: 0.60 },
    balanced:     { pools: [[1, 0.15], [2, 0.55], [3, 0.30]], km: 0.50, maxTotal: 0.70 },
    aggressive:   { pools: [[1, 0.10], [2, 0.35], [3, 0.35], [4, 0.20]], km: 0.80, maxTotal: 0.80 },
  };
  const { pools: poolConf, km, maxTotal } = configs[mode];

  const resultPools: BetPool[] = [];
  let totalBet = 0;

  // 单关最低投注门槛：预算的5%（至少¥5）
  const minSingleAmount = Math.max(5, Math.round(budget * 0.05));

  for (const [legs, fraction] of poolConf) {
    const bets = generatePool(candidates, legs);
    if (bets.length === 0) continue;

    const poolBudget = Math.round(budget * maxTotal * fraction);
    if (poolBudget < 1) continue;

    let allocations = allocatePool(bets, poolBudget, km);
    if (allocations.length === 0) continue;

    // 单关：过滤掉建议金额低于门槛的注单（Kelly太小=优势不显著，不建议投）
    if (legs === 1) {
      allocations = allocations.filter((a) => a.amount >= minSingleAmount);
      if (allocations.length === 0) continue;
    }

    const actualTotal = allocations.reduce((s, a) => s + a.amount, 0);
    totalBet += actualTotal;

    const bestReturn = Math.max(...allocations.map((a) => a.maxReturn));
    const poolEV = allocations.reduce((s, a) => s + a.amount * a.bet.expectedValue, 0);

    resultPools.push({
      legs,
      label: legs === 1 ? "单关" : `${legs}串1 组合池`,
      allocations,
      totalAmount: actualTotal,
      bestReturn,
      poolEV: Math.round(poolEV),
    });
  }

  const bestCaseReturn = resultPools.length > 0
    ? Math.max(...resultPools.map((p) => p.bestReturn))
    : 0;
  const expectedValue = resultPools.reduce((s, p) => s + p.poolEV, 0);

  return {
    mode,
    modeLabel,
    budget,
    pools: resultPools,
    totalBet,
    reserved: budget - totalBet,
    bestCaseReturn,
    expectedValue,
  };
}
