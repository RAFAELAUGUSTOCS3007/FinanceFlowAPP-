/**
 * lib/score.ts
 * Score Financeiro Dinâmico — 6 dimensões
 *
 * Diferente do score estático atual (baseado só na razão despesa/renda),
 * este engine avalia 6 dimensões independentes com pesos diferentes.
 * Cada dimensão tem feedback personalizado e dicas de melhoria.
 */

import type { MonthData, UserSettings } from "./store/finance-slice";

export interface ScoreDimension {
  key: string;
  label: string;
  icon: string;
  score: number;      // 0–100
  weight: number;     // contribution to total (sum = 1.0)
  status: "great" | "good" | "warning" | "critical";
  tip: string;        // personalised advice
  value: string;      // human-readable current value
}

export interface FinancialScore {
  total: number;                    // 0–100 weighted average
  dimensions: ScoreDimension[];
  label: string;                    // "Excelente" | "Bom" | "Atenção" | "Crítico"
  trend: "up" | "stable" | "down"; // vs previous month
  color: string;
  prevTotal: number | null;
}

// ─── Status thresholds ────────────────────────────────────────────────────────

function getStatus(score: number): ScoreDimension["status"] {
  if (score >= 75) return "great";
  if (score >= 50) return "good";
  if (score >= 25) return "warning";
  return "critical";
}

function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Dimension 1: Expense ratio (30%) ────────────────────────────────────────
// How much of income goes to expenses. Lower = better.

function scoreDim_expenseRatio(month: MonthData | undefined): ScoreDimension {
  const income = (month?.incomes ?? []).reduce((s, i) => s + i.value, 0);
  const expenses = [
    ...(month?.variableExpenses ?? []).map((e) => e.value),
    ...(month?.fixedExpenses ?? []).filter((f) => f.isPaid).map((f) => f.actualValue ?? f.plannedValue),
  ].reduce((s, v) => s + v, 0);

  const ratio = income > 0 ? expenses / income : 1;
  // Score: 0% → 100pts, 50% → 70pts, 80% → 30pts, 100%+ → 0pts
  const score = Math.max(0, Math.round(100 - ratio * 100));
  const pct = Math.round(ratio * 100);

  return {
    key: "expense_ratio",
    label: "Controle de Gastos",
    icon: "📊",
    score,
    weight: 0.30,
    status: getStatus(score),
    value: `${pct}% da renda`,
    tip: ratio < 0.5
      ? "Excelente! Você gasta menos da metade da sua renda."
      : ratio < 0.7
      ? "Bom controle. Tente reduzir gastos não essenciais para poupar mais."
      : ratio < 0.9
      ? "Gastos altos. Revise categorias de lazer e compras."
      : "Gastos acima da renda. Corte despesas com urgência.",
  };
}

// ─── Dimension 2: Savings regularity (25%) ───────────────────────────────────
// Did the user save money in reservations this month?

function scoreDim_savings(
  months: MonthData[],
  currentMonth: number,
  currentYear: number
): ScoreDimension {
  // Check last 3 months including current
  const recentMonths = months
    .filter((m) => {
      const monthDiff = (currentYear - m.year) * 12 + (currentMonth - m.month);
      return monthDiff >= 0 && monthDiff < 3;
    });

  const monthsWithSavings = recentMonths.filter(
    (m) => m.reservations.reduce((s, r) => s + r.value, 0) > 0
  ).length;

  const totalMonths = Math.max(recentMonths.length, 1);
  const ratio = monthsWithSavings / totalMonths;
  const score = Math.round(ratio * 100);

  const currentSaved = (months.find((m) => m.month === currentMonth && m.year === currentYear)
    ?.reservations ?? []).reduce((s, r) => s + r.value, 0);

  return {
    key: "savings",
    label: "Regularidade de Poupança",
    icon: "💰",
    score,
    weight: 0.25,
    status: getStatus(score),
    value: currentSaved > 0 ? `${formatBRL(currentSaved)} este mês` : "Nada este mês",
    tip: monthsWithSavings === totalMonths
      ? "Parabéns! Você está poupando todo mês. Continue assim!"
      : monthsWithSavings > 0
      ? `Você poupou em ${monthsWithSavings} de ${totalMonths} meses. Tente guardar algo todo mês.`
      : "Você não poupou nos últimos meses. Comece com qualquer valor nas Metas.",
  };
}

// ─── Dimension 3: Emergency fund coverage (20%) ───────────────────────────────
// Months of expenses covered by emergency fund.

function scoreDim_emergency(
  months: MonthData[],
  emergencyTarget: number
): ScoreDimension {
  const totalEmergency = months
    .flatMap((m) => m.reservations)
    .filter((r) => r.type === "emergency")
    .reduce((s, r) => s + r.value, 0);

  // Average monthly expenses (last 3 months)
  const recent = months.slice(-3);
  const avgExpenses = recent.length > 0
    ? recent.reduce((s, m) => {
        const v = m.variableExpenses.reduce((a, e) => a + e.value, 0)
          + m.fixedExpenses.filter((f) => f.isPaid).reduce((a, f) => a + (f.actualValue ?? f.plannedValue), 0);
        return s + v;
      }, 0) / recent.length
    : 0;

  const monthsCovered = avgExpenses > 0 ? totalEmergency / avgExpenses : 0;
  // Target: 6 months of expenses. Score scales linearly.
  const score = Math.min(100, Math.round((monthsCovered / 6) * 100));
  const coverage = Math.round(monthsCovered * 10) / 10;

  return {
    key: "emergency",
    label: "Reserva de Emergência",
    icon: "🛡️",
    score,
    weight: 0.20,
    status: getStatus(score),
    value: `${coverage} meses cobertos`,
    tip: monthsCovered >= 6
      ? "Reserva de emergência completa! Você tem 6+ meses cobertos."
      : monthsCovered >= 3
      ? `${coverage} meses cobertos. Meta recomendada: 6 meses.`
      : monthsCovered >= 1
      ? `Apenas ${coverage} meses. Priorize aumentar sua reserva de emergência.`
      : "Sem reserva de emergência. Este deve ser seu primeiro objetivo.",
  };
}

// ─── Dimension 4: Income diversification (15%) ───────────────────────────────
// Multiple income sources = lower risk.

function scoreDim_incomeDiversification(month: MonthData | undefined): ScoreDimension {
  const incomes = month?.incomes ?? [];
  const sourceCount = incomes.length;
  const total = incomes.reduce((s, i) => s + i.value, 0);

  // Check concentration: if one source > 80% of total, low diversification
  const maxSource = incomes.reduce((max, i) => Math.max(max, i.value), 0);
  const concentration = total > 0 ? maxSource / total : 1;

  let score: number;
  if (sourceCount >= 3 && concentration < 0.6) score = 100;
  else if (sourceCount >= 2 && concentration < 0.75) score = 75;
  else if (sourceCount >= 2) score = 55;
  else score = 25;

  return {
    key: "income_diversification",
    label: "Diversificação de Renda",
    icon: "🌱",
    score,
    weight: 0.15,
    status: getStatus(score),
    value: `${sourceCount} fonte${sourceCount !== 1 ? "s" : ""}`,
    tip: sourceCount >= 3 && concentration < 0.6
      ? "Excelente diversificação! Múltiplas fontes de renda reduzem seu risco."
      : sourceCount >= 2
      ? "Boa diversificação. Considere desenvolver mais fontes de renda extra."
      : "Renda concentrada em uma fonte. Explore renda extra: freela, investimentos.",
  };
}

// ─── Dimension 5: Bill payment rate (10%) ────────────────────────────────────
// Percentage of fixed expenses paid on time.

function scoreDim_billPayment(month: MonthData | undefined): ScoreDimension {
  const fixed = month?.fixedExpenses ?? [];
  if (fixed.length === 0) {
    return {
      key: "bills",
      label: "Adimplência",
      icon: "✅",
      score: 100,
      weight: 0.10,
      status: "great",
      value: "Sem fixas",
      tip: "Adicione suas despesas fixas para monitorar adimplência.",
    };
  }

  const paid = fixed.filter((f) => f.isPaid).length;
  const ratio = paid / fixed.length;
  const score = Math.round(ratio * 100);

  return {
    key: "bills",
    label: "Adimplência",
    icon: "✅",
    score,
    weight: 0.10,
    status: getStatus(score),
    value: `${paid}/${fixed.length} pagas`,
    tip: ratio === 1
      ? "Todas as contas pagas em dia! Ótima gestão."
      : ratio >= 0.8
      ? `${fixed.length - paid} conta(s) pendente(s). Quite em breve para evitar juros.`
      : `Várias contas pendentes. Priorize o pagamento das despesas fixas.`,
  };
}

// ─── Main function ────────────────────────────────────────────────────────────

export function calculateScore(
  months: MonthData[],
  currentMonth: number,
  currentYear: number,
  settings: UserSettings,
  prevMonth?: number,
  prevYear?: number
): FinancialScore {
  const current = months.find((m) => m.month === currentMonth && m.year === currentYear);
  const previous = prevMonth != null && prevYear != null
    ? months.find((m) => m.month === prevMonth && m.year === prevYear)
    : undefined;

  const dimensions: ScoreDimension[] = [
    scoreDim_expenseRatio(current),
    scoreDim_savings(months, currentMonth, currentYear),
    scoreDim_emergency(months, settings.emergencyFundTarget),
    scoreDim_incomeDiversification(current),
    scoreDim_billPayment(current),
  ];

  const total = Math.round(
    dimensions.reduce((sum, d) => sum + d.score * d.weight, 0)
  );

  // Previous total for trend
  let prevTotal: number | null = null;
  if (previous) {
    const prevDims: ScoreDimension[] = [
      scoreDim_expenseRatio(previous),
      scoreDim_savings(months, prevMonth!, prevYear!),
      scoreDim_emergency(months, settings.emergencyFundTarget),
      scoreDim_incomeDiversification(previous),
      scoreDim_billPayment(previous),
    ];
    prevTotal = Math.round(prevDims.reduce((sum, d) => sum + d.score * d.weight, 0));
  }

  const trend: FinancialScore["trend"] =
    prevTotal == null ? "stable"
    : total > prevTotal + 2 ? "up"
    : total < prevTotal - 2 ? "down"
    : "stable";

  const label =
    total >= 80 ? "Excelente" :
    total >= 60 ? "Bom" :
    total >= 40 ? "Atenção" : "Crítico";

  const color =
    total >= 80 ? "#AAFF00" :
    total >= 60 ? "#00E5A0" :
    total >= 40 ? "#FFBB45" : "#FF6060";

  return { total, dimensions, label, trend, color, prevTotal };
}
