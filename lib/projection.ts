/**
 * lib/projection.ts
 * Projeção de saldo futuro — próximos 90 dias
 *
 * Algoritmo:
 * 1. Lê entradas fixas recorrentes (incomes)
 * 2. Lê despesas fixas recorrentes
 * 3. Calcula média de despesas variáveis dos últimos 3 meses
 * 4. Gera array diário de saldo projetado para os próximos 90 dias
 */

import type { MonthData } from "./store/finance-slice";

export interface ProjectionPoint {
  date: string;        // ISO date "2026-04-15"
  balance: number;     // projected balance at end of day
  isNegative: boolean;
  daysFromNow: number;
}

export interface ProjectionResult {
  points: ProjectionPoint[];         // one per day, 90 points
  minBalance: number;
  maxBalance: number;
  finalBalance: number;              // day 90
  willGoNegative: boolean;
  firstNegativeDate: string | null;
  monthlyPoints: ProjectionPoint[];  // one per month (for simplified chart)
  avgMonthlyIncome: number;
  avgMonthlyExpenses: number;
}

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getMonthYear(dateStr: string): { month: number; year: number } {
  const d = new Date(dateStr);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export function buildProjection(
  months: MonthData[],
  currentBalance: number,
  currentMonth: number,
  currentYear: number
): ProjectionResult {
  const today = new Date().toISOString().split("T")[0];

  // ── Step 1: Calculate average monthly income from last 3 months ──────────
  const recentMonths = months
    .filter((m) => {
      const isCurrentOrPast =
        m.year < currentYear || (m.year === currentYear && m.month <= currentMonth);
      return isCurrentOrPast;
    })
    .sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month))
    .slice(-3);

  const avgMonthlyIncome =
    recentMonths.length > 0
      ? recentMonths.reduce((sum, m) => sum + m.incomes.reduce((s, i) => s + i.value, 0), 0) /
        recentMonths.length
      : 0;

  // ── Step 2: Average monthly variable expenses (last 3 months) ───────────
  const avgMonthlyVariable =
    recentMonths.length > 0
      ? recentMonths.reduce(
          (sum, m) => sum + m.variableExpenses.reduce((s, e) => s + e.value, 0),
          0
        ) / recentMonths.length
      : 0;

  // ── Step 3: Average monthly fixed expenses ────────────────────────────────
  const avgMonthlyFixed =
    recentMonths.length > 0
      ? recentMonths.reduce(
          (sum, m) =>
            sum +
            m.fixedExpenses.reduce((s, e) => s + (e.actualValue ?? e.plannedValue), 0),
          0
        ) / recentMonths.length
      : 0;

  const avgMonthlyExpenses = avgMonthlyVariable + avgMonthlyFixed;

  // ── Step 4: Daily net income/expense rate ─────────────────────────────────
  const dailyNet = (avgMonthlyIncome - avgMonthlyExpenses) / 30;

  // ── Step 5: Build 90 daily points ────────────────────────────────────────
  const points: ProjectionPoint[] = [];
  let runningBalance = currentBalance;

  for (let i = 0; i < 90; i++) {
    const date = addDays(today, i + 1);
    runningBalance += dailyNet;

    points.push({
      date,
      balance: Math.round(runningBalance * 100) / 100,
      isNegative: runningBalance < 0,
      daysFromNow: i + 1,
    });
  }

  // ── Step 6: Derive summary values ────────────────────────────────────────
  const balances = points.map((p) => p.balance);
  const minBalance = Math.min(...balances);
  const maxBalance = Math.max(...balances);
  const finalBalance = points[points.length - 1].balance;
  const willGoNegative = balances.some((b) => b < 0);
  const firstNegativePoint = points.find((p) => p.isNegative);

  // Monthly summary points (day 30, 60, 90)
  const monthlyPoints = [points[29], points[59], points[89]].filter(Boolean);

  return {
    points,
    minBalance,
    maxBalance,
    finalBalance,
    willGoNegative,
    firstNegativeDate: firstNegativePoint?.date ?? null,
    monthlyPoints,
    avgMonthlyIncome,
    avgMonthlyExpenses,
  };
}

/**
 * formatProjectionDate
 * Formats "2026-05-15" → "15 Mai"
 */
export function formatProjectionDate(dateStr: string): string {
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const [, month, day] = dateStr.split("-");
  return `${parseInt(day)} ${months[parseInt(month) - 1]}`;
}
