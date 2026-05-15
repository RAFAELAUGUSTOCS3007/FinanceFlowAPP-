/**
 * lib/recurrence.ts
 * Sistema de recorrência automática de lançamentos
 *
 * Ao abrir o app, verifica quais despesas fixas do mês anterior
 * devem ser criadas automaticamente no mês atual.
 * Retorna uma lista de sugestões para o usuário confirmar.
 */

import type { FixedExpense } from "./store/finance-slice";
import { generateId } from "./store/finance-slice";

export type RecurrenceFrequency = "monthly" | "bimonthly" | "quarterly" | "yearly";

export interface RecurrenceSuggestion {
  id: string;
  sourceExpense: FixedExpense;    // original from previous month
  suggestedExpense: FixedExpense; // ready to add to current month
  reason: string;                 // why we're suggesting this
}

/**
 * buildRecurrenceSuggestions
 * Compares previous month's fixed expenses against the current month.
 * Returns a list of expenses that exist in prev but NOT in current.
 */
export function buildRecurrenceSuggestions(
  prevMonthFixed: FixedExpense[],
  currentMonthFixed: FixedExpense[],
  targetMonth: number,
  targetYear: number
): RecurrenceSuggestion[] {
  const suggestions: RecurrenceSuggestion[] = [];

  // Names of expenses already in current month
  const currentNames = new Set(currentMonthFixed.map((e) => e.name.toLowerCase().trim()));

  for (const prev of prevMonthFixed) {
    const normalizedName = prev.name.toLowerCase().trim();

    // Skip if already exists in current month
    if (currentNames.has(normalizedName)) continue;

    // Skip zero-value placeholders
    if (prev.plannedValue <= 0) continue;

    const suggested: FixedExpense = {
      id: generateId(),
      name: prev.name,
      plannedValue: prev.plannedValue,
      actualValue: undefined,
      paidDate: undefined,
      isPaid: false,
      month: targetMonth,
      year: targetYear,
    };

    suggestions.push({
      id: generateId(),
      sourceExpense: prev,
      suggestedExpense: suggested,
      reason: `Lançada em ${prev.month}/${prev.year} por R$ ${prev.plannedValue.toFixed(2).replace(".", ",")}`,
    });
  }

  return suggestions;
}

/**
 * shouldSuggestRecurrence
 * Returns true if the app should prompt the user about recurrence.
 * Triggers when: current month has no fixed expenses AND previous month had some.
 */
export function shouldSuggestRecurrence(
  prevMonthFixed: FixedExpense[],
  currentMonthFixed: FixedExpense[],
  currentMonth: number,
  currentYear: number
): boolean {
  if (prevMonthFixed.length === 0) return false;
  if (currentMonthFixed.length > 2) return false; // Already has enough data

  // Only suggest once per month — check if we're in a fresh month context
  const today = new Date();
  const isFreshMonth =
    today.getMonth() + 1 === currentMonth && today.getFullYear() === currentYear;

  return isFreshMonth;
}

/**
 * getPrevMonthKey
 * Returns { month, year } for the previous calendar month.
 */
export function getPrevMonthKey(month: number, year: number): { month: number; year: number } {
  if (month === 1) return { month: 12, year: year - 1 };
  return { month: month - 1, year };
}
