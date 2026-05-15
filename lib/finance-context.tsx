/**
 * finance-context.tsx — REFACTORED
 *
 * This file is now a thin shim over the Zustand store.
 * All screens that import from here continue to work unchanged.
 *
 * For NEW screens: import directly from "@/lib/store/queries" or
 * "@/lib/store/index" for granular, re-render-optimised hooks.
 */

import React from "react";
import { useAppStore } from "./store/index";
import { useFinanceSummary, useGoalsSummary, useMonthData } from "./store/selectors";
import { generateId as _generateId } from "./store/finance-slice";

// ─── Re-export all types ──────────────────────────────────────────────────────
export type {
  Income,
  VariableExpense,
  FixedExpense,
  Reservation,
  UserSettings,
  MonthData,
  PaymentMethod,
  TransactionCategory,
} from "./store/finance-slice";

export { generateId } from "./store/finance-slice";

// ─── Constants ────────────────────────────────────────────────────────────────
export const CATEGORIES = [
  "🍗 Alimentação", "🔋 Saúde e Bem-estar", "💪 Academia", "🧾 Contas",
  "🚗 Transporte", "🎮 Lazer", "🛍️ Compras", "📚 Educação",
  "🏠 Moradia", "💊 Farmácia", "🐾 Pet", "Outros",
] as const;

export const PAYMENT_METHODS = [
  "Pix / Dinheiro", "Débito", "Crédito", "Transferência", "Outros",
] as const;

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

// ─── useFinance — backwards-compatible hook ───────────────────────────────────
export function useFinance() {
  const store = useAppStore();
  const monthData = useMonthData();
  const summary = useFinanceSummary();
  const goalsSummary = useGoalsSummary();

  const state = {
    settings: store.settings,
    months: store.months,
    currentMonth: store.currentMonth,
    currentYear: store.currentYear,
    isLoaded: store.isLoaded,
  };

  const dispatch = (action: { type: string; payload?: any }) => {
    switch (action.type) {
      case "LOAD_STATE":             return store.loadState(action.payload);
      case "RESET_STATE":            return store.resetState();
      case "SET_CURRENT_MONTH":      return store.setCurrentMonth(action.payload.month, action.payload.year);
      case "UPDATE_SETTINGS":        return store.updateSettings(action.payload);
      case "ADD_INCOME":             return store.addIncome(action.payload);
      case "UPDATE_INCOME":          return store.updateIncome(action.payload);
      case "DELETE_INCOME":          return store.deleteIncome(action.payload);
      case "ADD_VARIABLE_EXPENSE":   return store.addVariableExpense(action.payload);
      case "UPDATE_VARIABLE_EXPENSE":return store.updateVariableExpense(action.payload);
      case "DELETE_VARIABLE_EXPENSE":return store.deleteVariableExpense(action.payload);
      case "ADD_FIXED_EXPENSE":      return store.addFixedExpense(action.payload);
      case "UPDATE_FIXED_EXPENSE":   return store.updateFixedExpense(action.payload);
      case "DELETE_FIXED_EXPENSE":   return store.deleteFixedExpense(action.payload);
      case "TOGGLE_FIXED_EXPENSE_PAID": return store.toggleFixedPaid(action.payload.id, action.payload.actualValue);
      case "ADD_RESERVATION":        return store.addReservation(action.payload);
      case "DELETE_RESERVATION":     return store.deleteReservation(action.payload);
      case "ENSURE_MONTH_EXISTS":    return store.setCurrentMonth(action.payload.month, action.payload.year);
      case "DUPLICATE_PREV_MONTH":   return store.duplicatePrevMonth(action.payload.targetMonth, action.payload.targetYear);
    }
  };

  return {
    state,
    dispatch,
    currentMonthData: monthData,
    totalIncome: summary.totalIncome,
    totalVariableExpenses: summary.totalVariable,
    totalFixedExpenses: summary.totalFixedActual,
    totalFixedExpensesPaid: summary.totalFixedPaid,
    totalReservations: summary.totalReservations,
    availableBalance: summary.availableBalance,
    totalEmergencyFundSaved: goalsSummary.totalEmergency,
    totalGoalSaved: goalsSummary.totalGoal,
    generateId: _generateId,
  };
}

// ─── FinanceProvider shim ─────────────────────────────────────────────────────
// Zustand is global — no Provider needed. This shim keeps _layout.tsx unchanged.
export function FinanceProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
