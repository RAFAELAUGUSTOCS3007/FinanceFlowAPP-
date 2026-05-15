import { useMemo } from "react";
import { useAppStore } from "./index";
import type { MonthData, VariableExpense, TransactionCategory } from "./finance-slice";

/**
 * useMonthData
 * Returns the MonthData for the currently selected month.
 * Only re-renders when the specific month's data changes.
 */
export function useMonthData(): MonthData | undefined {
  return useAppStore((s) =>
    s.months.find((m) => m.month === s.currentMonth && m.year === s.currentYear)
  );
}

/**
 * useFinanceSummary
 * Core computed values for the Dashboard.
 * Memoized — only recomputes when monthData changes.
 */
export function useFinanceSummary() {
  const monthData = useMonthData();

  return useMemo(() => {
    const incomes = monthData?.incomes ?? [];
    const variable = monthData?.variableExpenses ?? [];
    const fixed = monthData?.fixedExpenses ?? [];
    const reservations = monthData?.reservations ?? [];

    const totalIncome = incomes.reduce((s, i) => s + i.value, 0);
    const totalVariable = variable.reduce((s, e) => s + e.value, 0);
    const totalFixedPlanned = fixed.reduce((s, e) => s + (e.plannedValue ?? 0), 0);
    const totalFixedPaid = fixed.filter((e) => e.isPaid).reduce((s, e) => s + (e.actualValue ?? e.plannedValue), 0);
    const totalFixedActual = fixed.reduce((s, e) => s + (e.actualValue ?? e.plannedValue), 0);
    const totalReservations = reservations.reduce((s, r) => s + r.value, 0);
    const availableBalance = totalIncome - totalVariable - totalFixedPaid - totalReservations;

    const fixedPaidCount = fixed.filter((e) => e.isPaid).length;
    const fixedTotalCount = fixed.length;
    const fixedProgress = fixedTotalCount > 0 ? fixedPaidCount / fixedTotalCount : 0;

    const essentialExpenses = variable.filter((e) => e.isEssential).reduce((s, e) => s + e.value, 0);
    const nonEssentialExpenses = variable.filter((e) => !e.isEssential).reduce((s, e) => s + e.value, 0);

    // Health score (0-100)
    const ratio = totalIncome > 0 ? (totalVariable + totalFixedActual) / totalIncome : 1;
    const healthScore = Math.max(0, Math.min(100, Math.round((1 - ratio) * 100 + 20)));

    return {
      totalIncome,
      totalVariable,
      totalFixedPlanned,
      totalFixedPaid,
      totalFixedActual,
      totalReservations,
      availableBalance,
      fixedPaidCount,
      fixedTotalCount,
      fixedProgress,
      essentialExpenses,
      nonEssentialExpenses,
      healthScore,
      hasData: incomes.length > 0 || variable.length > 0 || fixed.length > 0,
    };
  }, [monthData]);
}

/**
 * useGoalsSummary
 * Total saved across ALL months for goals and emergency fund.
 */
export function useGoalsSummary() {
  const months = useAppStore((s) => s.months);
  const settings = useAppStore((s) => s.settings);

  return useMemo(() => {
    const allReservations = months.flatMap((m) => m.reservations);
    const totalEmergency = allReservations.filter((r) => r.type === "emergency").reduce((s, r) => s + r.value, 0);
    const totalGoal = allReservations.filter((r) => r.type === "goal").reduce((s, r) => s + r.value, 0);
    const emergencyProgress = settings.emergencyFundTarget > 0 ? totalEmergency / settings.emergencyFundTarget : 0;
    const goalProgress = settings.goalTarget > 0 ? totalGoal / settings.goalTarget : 0;
    return { totalEmergency, totalGoal, totalSaved: totalEmergency + totalGoal, emergencyProgress, goalProgress };
  }, [months, settings]);
}

/**
 * useExpensesByCategory
 * Groups variable expenses by category with totals and percentages.
 */
export function useExpensesByCategory() {
  const monthData = useMonthData();

  return useMemo(() => {
    const expenses = monthData?.variableExpenses ?? [];
    const total = expenses.reduce((s, e) => s + e.value, 0);
    const byCategory: Record<TransactionCategory, { total: number; count: number; percentage: number; items: VariableExpense[] }> = {} as any;

    for (const expense of expenses) {
      if (!byCategory[expense.category]) {
        byCategory[expense.category] = { total: 0, count: 0, percentage: 0, items: [] };
      }
      byCategory[expense.category].total += expense.value;
      byCategory[expense.category].count += 1;
      byCategory[expense.category].items.push(expense);
    }

    // Compute percentages
    for (const cat of Object.keys(byCategory) as TransactionCategory[]) {
      byCategory[cat].percentage = total > 0 ? byCategory[cat].total / total : 0;
    }

    // Sort by total desc
    const sorted = Object.entries(byCategory).sort(([, a], [, b]) => b.total - a.total);
    return { byCategory, sorted, total };
  }, [monthData]);
}

/**
 * useIncomeBreakdown
 * Income sources sorted by value with percentage of total.
 */
export function useIncomeBreakdown() {
  const monthData = useMonthData();

  return useMemo(() => {
    const incomes = monthData?.incomes ?? [];
    const total = incomes.reduce((s, i) => s + i.value, 0);
    const sorted = [...incomes].sort((a, b) => b.value - a.value);
    return {
      incomes: sorted.map((i) => ({ ...i, percentage: total > 0 ? i.value / total : 0 })),
      total,
      count: incomes.length,
    };
  }, [monthData]);
}
