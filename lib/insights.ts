/**
 * lib/insights.ts
 * Motor de insights automáticos — alertas inteligentes baseados em regras
 *
 * Detecta: spikes de gastos, orçamentos no limite, fixas vencendo,
 * metas atingindo marcos, saldo baixo, e comportamentos positivos.
 */

import type { MonthData, FixedExpense, BudgetEnvelope } from "./store/finance-slice";

export type InsightType =
  | "spending_spike"       // gasto acima de 2x a média
  | "budget_warning"       // orçamento >80% usado
  | "budget_exceeded"      // orçamento ultrapassado
  | "fixed_due_soon"       // despesa fixa vence em ≤3 dias
  | "goal_milestone"       // meta atingiu 25/50/75/100%
  | "low_balance"          // saldo disponível <10% da renda
  | "positive_month"       // gastou menos que a média
  | "savings_streak"       // guardou reservas 3 meses seguidos
  | "income_dip";          // renda caiu >20% vs mês anterior

export type InsightSeverity = "info" | "warning" | "critical" | "success";

export interface Insight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  message: string;
  actionLabel?: string;
  actionRoute?: string;   // expo-router path
  value?: number;         // contextual value (amount, %, etc.)
  category?: string;
  dismissible: boolean;
}

// ─── Individual detectors ─────────────────────────────────────────────────────

function detectSpendingSpike(
  current: MonthData,
  previous: MonthData | undefined
): Insight[] {
  if (!previous) return [];
  const insights: Insight[] = [];

  // Group by category
  const currentByCategory: Record<string, number> = {};
  const prevByCategory: Record<string, number> = {};

  for (const e of current.variableExpenses) {
    currentByCategory[e.category] = (currentByCategory[e.category] ?? 0) + e.value;
  }
  for (const e of previous.variableExpenses) {
    prevByCategory[e.category] = (prevByCategory[e.category] ?? 0) + e.value;
  }

  for (const [cat, currentTotal] of Object.entries(currentByCategory)) {
    const prevTotal = prevByCategory[cat];
    if (!prevTotal || prevTotal === 0) continue;
    const ratio = currentTotal / prevTotal;

    if (ratio >= 2.0) {
      insights.push({
        id: `spike_${cat}`,
        type: "spending_spike",
        severity: "warning",
        title: "Gasto acima do normal",
        message: `Você gastou ${Math.round((ratio - 1) * 100)}% a mais em ${cat.replace(/^\p{Emoji}\s*/u, "")} comparado ao mês passado.`,
        actionLabel: "Ver despesas",
        actionRoute: "/(tabs)/transactions",
        value: currentTotal,
        category: cat,
        dismissible: true,
      });
    }
  }
  return insights;
}

function detectBudgetWarnings(
  current: MonthData,
  budgets: BudgetEnvelope[]
): Insight[] {
  const insights: Insight[] = [];
  const monthBudgets = budgets.filter(
    (b) => b.month === current.month && b.year === current.year
  );
  if (monthBudgets.length === 0) return [];

  const spentByCategory: Record<string, number> = {};
  for (const e of current.variableExpenses) {
    spentByCategory[e.category] = (spentByCategory[e.category] ?? 0) + e.value;
  }

  for (const budget of monthBudgets) {
    const spent = spentByCategory[budget.category] ?? 0;
    const ratio = spent / budget.limitAmount;

    if (ratio >= 1.0) {
      insights.push({
        id: `budget_exceeded_${budget.category}`,
        type: "budget_exceeded",
        severity: "critical",
        title: "Orçamento ultrapassado!",
        message: `Você passou o limite de ${budget.category.replace(/^\p{Emoji}\s*/u, "")} em R$ ${(spent - budget.limitAmount).toFixed(2).replace(".", ",")}.`,
        actionLabel: "Ver orçamento",
        actionRoute: "/budgets",
        value: spent - budget.limitAmount,
        category: budget.category,
        dismissible: false,
      });
    } else if (ratio >= 0.8) {
      insights.push({
        id: `budget_warning_${budget.category}`,
        type: "budget_warning",
        severity: "warning",
        title: "Orçamento quase no limite",
        message: `${Math.round(ratio * 100)}% do orçamento de ${budget.category.replace(/^\p{Emoji}\s*/u, "")} já foi usado. Restam R$ ${(budget.limitAmount - spent).toFixed(2).replace(".", ",")}.`,
        actionLabel: "Ver orçamento",
        actionRoute: "/budgets",
        value: spent,
        category: budget.category,
        dismissible: true,
      });
    }
  }
  return insights;
}

function detectFixedDueSoon(fixed: FixedExpense[]): Insight[] {
  const insights: Insight[] = [];
  const today = new Date();
  const todayDay = today.getDate();

  for (const expense of fixed) {
    if (expense.isPaid) continue;
    // Heuristic: most bills are due between day 1-10 of the month
    // If today is within 3 days of end of month OR start of month, warn
    const daysUntilMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - todayDay;
    if (daysUntilMonthEnd <= 3 || todayDay <= 3) {
      insights.push({
        id: `fixed_due_${expense.id}`,
        type: "fixed_due_soon",
        severity: "warning",
        title: "Despesa fixa pendente",
        message: `"${expense.name}" de R$ ${expense.plannedValue.toFixed(2).replace(".", ",")} ainda não foi paga.`,
        actionLabel: "Ver fixas",
        actionRoute: "/(tabs)/fixed",
        value: expense.plannedValue,
        dismissible: true,
      });
    }
  }
  return insights;
}

function detectGoalMilestones(
  totalEmergency: number,
  totalGoal: number,
  emergencyTarget: number,
  goalTarget: number
): Insight[] {
  const insights: Insight[] = [];
  const milestones = [25, 50, 75, 100];

  const checkMilestone = (saved: number, target: number, label: string, route: string) => {
    if (target <= 0) return;
    const pct = (saved / target) * 100;
    for (const m of milestones) {
      // Trigger when within 1% of hitting a milestone
      if (pct >= m && pct < m + 1) {
        insights.push({
          id: `goal_milestone_${label}_${m}`,
          type: "goal_milestone",
          severity: m === 100 ? "success" : "info",
          title: m === 100 ? `🎉 Meta atingida!` : `Marco de ${m}% atingido!`,
          message: m === 100
            ? `Parabéns! Você completou sua ${label}.`
            : `Você chegou a ${m}% da sua ${label}. Continue assim!`,
          actionLabel: "Ver metas",
          actionRoute: route,
          value: m,
          dismissible: true,
        });
      }
    }
  };

  checkMilestone(totalEmergency, emergencyTarget, "Reserva de Emergência", "/(tabs)/goals");
  checkMilestone(totalGoal, goalTarget, "Meta Pessoal", "/(tabs)/goals");
  return insights;
}

function detectLowBalance(
  availableBalance: number,
  totalIncome: number
): Insight[] {
  if (totalIncome <= 0) return [];
  const ratio = availableBalance / totalIncome;
  if (ratio < 0.1 && availableBalance >= 0) {
    return [{
      id: "low_balance",
      type: "low_balance",
      severity: "warning",
      title: "Saldo disponível baixo",
      message: `Seu saldo disponível é apenas ${Math.round(ratio * 100)}% da sua renda mensal. Revise seus gastos.`,
      actionLabel: "Ver despesas",
      actionRoute: "/(tabs)/transactions",
      value: availableBalance,
      dismissible: true,
    }];
  }
  if (availableBalance < 0) {
    return [{
      id: "negative_balance",
      type: "low_balance",
      severity: "critical",
      title: "Saldo negativo!",
      message: `Seus gastos ultrapassaram sua renda em R$ ${Math.abs(availableBalance).toFixed(2).replace(".", ",")} este mês.`,
      actionLabel: "Ver despesas",
      actionRoute: "/(tabs)/transactions",
      value: availableBalance,
      dismissible: false,
    }];
  }
  return [];
}

function detectPositiveMonth(
  current: MonthData,
  avgMonthlyExpenses: number
): Insight[] {
  const totalCurrent =
    current.variableExpenses.reduce((s, e) => s + e.value, 0) +
    current.fixedExpenses.filter((e) => e.isPaid).reduce((s, e) => s + (e.actualValue ?? e.plannedValue), 0);

  if (avgMonthlyExpenses > 0 && totalCurrent < avgMonthlyExpenses * 0.9) {
    const saved = avgMonthlyExpenses - totalCurrent;
    return [{
      id: "positive_month",
      type: "positive_month",
      severity: "success",
      title: "Ótimo mês! 🎉",
      message: `Você gastou ${Math.round((1 - totalCurrent / avgMonthlyExpenses) * 100)}% menos que a média. Que tal guardar R$ ${saved.toFixed(2).replace(".", ",")} nas suas metas?`,
      actionLabel: "Guardar agora",
      actionRoute: "/(tabs)/goals",
      value: saved,
      dismissible: true,
    }];
  }
  return [];
}

// ─── Main function ────────────────────────────────────────────────────────────

export function generateInsights(params: {
  currentMonthData: MonthData | undefined;
  previousMonthData: MonthData | undefined;
  budgets: BudgetEnvelope[];
  totalEmergencyFundSaved: number;
  totalGoalSaved: number;
  emergencyFundTarget: number;
  goalTarget: number;
  availableBalance: number;
  totalIncome: number;
  avgMonthlyExpenses: number;
}): Insight[] {
  const {
    currentMonthData,
    previousMonthData,
    budgets,
    totalEmergencyFundSaved,
    totalGoalSaved,
    emergencyFundTarget,
    goalTarget,
    availableBalance,
    totalIncome,
    avgMonthlyExpenses,
  } = params;

  if (!currentMonthData) return [];

  const insights: Insight[] = [
    ...detectSpendingSpike(currentMonthData, previousMonthData),
    ...detectBudgetWarnings(currentMonthData, budgets),
    ...detectFixedDueSoon(currentMonthData.fixedExpenses),
    ...detectGoalMilestones(totalEmergencyFundSaved, totalGoalSaved, emergencyFundTarget, goalTarget),
    ...detectLowBalance(availableBalance, totalIncome),
    ...detectPositiveMonth(currentMonthData, avgMonthlyExpenses),
  ];

  // Sort: critical first, then warning, then success/info
  const severityOrder: Record<InsightSeverity, number> = { critical: 0, warning: 1, success: 2, info: 3 };
  return insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

export function getInsightIcon(type: InsightType): string {
  const icons: Record<InsightType, string> = {
    spending_spike:  "📈",
    budget_warning:  "⚠️",
    budget_exceeded: "🚨",
    fixed_due_soon:  "📅",
    goal_milestone:  "🏆",
    low_balance:     "💸",
    positive_month:  "🎉",
    savings_streak:  "🔥",
    income_dip:      "📉",
  };
  return icons[type] ?? "💡";
}

export function getInsightColor(severity: InsightSeverity): string {
  return { critical: "#FF6060", warning: "#FFBB45", success: "#00E5A0", info: "#AAFF00" }[severity];
}
