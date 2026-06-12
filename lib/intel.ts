/**
 * 事实情报维度
 * 6个可核实的客观类别，每个对主/客队的影响 -2~+2（正=利好主队）
 * 与「主观打分」区别：这些是事实（到没到场/伤没伤），污染风险低
 */

export const INTEL_CATEGORIES = [
  { key: "到场备战", icon: "🛬", desc: "提前到场/适应训练时间" },
  { key: "赛程疲劳", icon: "😴", desc: "刚打完附加赛/连续作战" },
  { key: "伤停红牌", icon: "🏥", desc: "主力伤缺/停赛" },
  { key: "旅行时差", icon: "✈️", desc: "长途跨洲飞行/时差" },
  { key: "气候海拔", icon: "🌡️", desc: "高温/高原/极端气候适应" },
  { key: "赛事动机", icon: "🔥", desc: "必胜之战 vs 已出线划水" },
] as const;

export type IntelKey = (typeof INTEL_CATEGORIES)[number]["key"];

export interface IntelFactors {
  values: Partial<Record<IntelKey, number>>; // -2~+2，正=利好主队
  note?: string;
}

/** 计算情报净差值：正=利好主队。范围约 -12~+12，实际很少用满 */
export function intelDiff(factors?: IntelFactors | null): number {
  if (!factors?.values) return 0;
  return Object.values(factors.values).reduce<number>((sum, v) => sum + (v ?? 0), 0);
}

/** 是否录入了任何情报 */
export function hasIntel(factors?: IntelFactors | null): boolean {
  if (!factors?.values) return false;
  return Object.values(factors.values).some((v) => (v ?? 0) !== 0) || !!factors.note;
}

/**
 * 情报对评分的加成（零和：利好主队=不利客队）
 * 归一化到 ±1（diff 封顶 ±6），供算法乘权重使用
 */
export function intelBoost(factors?: IntelFactors | null): { home: number; away: number } {
  const d = Math.max(-6, Math.min(6, intelDiff(factors))) / 6; // -1~+1
  return { home: d, away: -d };
}
