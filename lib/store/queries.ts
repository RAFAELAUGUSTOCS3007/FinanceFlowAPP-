/**
 * useFinanceQueries
 * TanStack Query hooks that wrap the Zustand store for cache-aware data access.
 *
 * WHY both Zustand + TanStack Query?
 * - Zustand = source of truth for mutations and local state
 * - TanStack Query = cache layer, background refetch, stale detection,
 *   and the bridge to future server-side queries (when a backend is added)
 *
 * For now all queryFns read from the Zustand store synchronously.
 * When a server is available, swap the queryFn to a tRPC/fetch call —
 * the cache invalidation and UI behaviour stay identical.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "./index";
import {
  useMonthData,
  useFinanceSummary,
  useGoalsSummary,
  useExpensesByCategory,
  useIncomeBreakdown,
} from "./selectors";
import type { Income, VariableExpense, FixedExpense, Reservation } from "./finance-slice";
import { generateId } from "./finance-slice";

// ─── Query keys factory ───────────────────────────────────────────────────────
// Centralised key factory prevents typos and makes invalidation predictable.

export const qk = {
  all: ["finance"] as const,
  month: (month: number, year: number) => ["finance", "month", month, year] as const,
  transactions: (month: number, year: number) => ["finance", "transactions", month, year] as const,
  income: (month: number, year: number) => ["finance", "income", month, year] as const,
  fixed: (month: number, year: number) => ["finance", "fixed", month, year] as const,
  goals: () => ["finance", "goals"] as const,
  summary: (month: number, year: number) => ["finance", "summary", month, year] as const,
  settings: () => ["finance", "settings"] as const,
};

// ─── Shared cache config ──────────────────────────────────────────────────────

const CACHE = {
  /** Data that rarely changes mid-session (settings, goals). */
  stable: { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 },
  /** Data the user actively edits (transactions, income, fixed). */
  active: { staleTime: 30 * 1000, gcTime: 5 * 60 * 1000 },
  /** Summary/computed values — cheap to recompute. */
  computed: { staleTime: 15 * 1000, gcTime: 2 * 60 * 1000 },
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * useTransactionsQuery
 * Returns variable expenses for the current month with smart caching.
 */
export function useTransactionsQuery() {
  const { currentMonth: month, currentYear: year } = useAppStore((s) => ({
    currentMonth: s.currentMonth,
    currentYear: s.currentYear,
  }));
  const monthData = useMonthData();

  return useQuery({
    queryKey: qk.transactions(month, year),
    queryFn: () => monthData?.variableExpenses ?? [],
    initialData: monthData?.variableExpenses ?? [],
    ...CACHE.active,
  });
}

/**
 * useIncomeQuery
 * Returns income entries for the current month.
 */
export function useIncomeQuery() {
  const { currentMonth: month, currentYear: year } = useAppStore((s) => ({
    currentMonth: s.currentMonth,
    currentYear: s.currentYear,
  }));
  const monthData = useMonthData();

  return useQuery({
    queryKey: qk.income(month, year),
    queryFn: () => monthData?.incomes ?? [],
    initialData: monthData?.incomes ?? [],
    ...CACHE.active,
  });
}

/**
 * useFixedExpensesQuery
 * Returns fixed expenses for the current month.
 */
export function useFixedExpensesQuery() {
  const { currentMonth: month, currentYear: year } = useAppStore((s) => ({
    currentMonth: s.currentMonth,
    currentYear: s.currentYear,
  }));
  const monthData = useMonthData();

  return useQuery({
    queryKey: qk.fixed(month, year),
    queryFn: () => monthData?.fixedExpenses ?? [],
    initialData: monthData?.fixedExpenses ?? [],
    ...CACHE.active,
  });
}

/**
 * useGoalsQuery
 * Returns goals summary across all months.
 */
export function useGoalsQuery() {
  const summary = useGoalsSummary();

  return useQuery({
    queryKey: qk.goals(),
    queryFn: () => summary,
    initialData: summary,
    ...CACHE.stable,
  });
}

/**
 * useSummaryQuery
 * Returns computed financial summary for the current month.
 */
export function useSummaryQuery() {
  const { currentMonth: month, currentYear: year } = useAppStore((s) => ({
    currentMonth: s.currentMonth,
    currentYear: s.currentYear,
  }));
  const summary = useFinanceSummary();

  return useQuery({
    queryKey: qk.summary(month, year),
    queryFn: () => summary,
    initialData: summary,
    ...CACHE.computed,
  });
}

/**
 * useSettingsQuery
 * Returns user settings with stable cache.
 */
export function useSettingsQuery() {
  const settings = useAppStore((s) => s.settings);

  return useQuery({
    queryKey: qk.settings(),
    queryFn: () => settings,
    initialData: settings,
    ...CACHE.stable,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────
// Each mutation updates Zustand immediately (optimistic) then invalidates
// the relevant TanStack Query cache to trigger any dependent components.

/**
 * useAddTransactionMutation
 */
export function useAddTransactionMutation() {
  const qc = useQueryClient();
  const addVariableExpense = useAppStore((s) => s.addVariableExpense);
  const { currentMonth, currentYear } = useAppStore((s) => ({
    currentMonth: s.currentMonth,
    currentYear: s.currentYear,
  }));

  return useMutation({
    mutationFn: async (data: Omit<VariableExpense, "id">) => {
      const expense: VariableExpense = { ...data, id: generateId() };
      addVariableExpense(expense);
      return expense;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.transactions(currentMonth, currentYear) });
      qc.invalidateQueries({ queryKey: qk.summary(currentMonth, currentYear) });
    },
  });
}

/**
 * useDeleteTransactionMutation
 */
export function useDeleteTransactionMutation() {
  const qc = useQueryClient();
  const deleteVariableExpense = useAppStore((s) => s.deleteVariableExpense);
  const { currentMonth, currentYear } = useAppStore((s) => ({
    currentMonth: s.currentMonth,
    currentYear: s.currentYear,
  }));

  return useMutation({
    mutationFn: async (id: string) => {
      deleteVariableExpense(id);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.transactions(currentMonth, currentYear) });
      qc.invalidateQueries({ queryKey: qk.summary(currentMonth, currentYear) });
    },
  });
}

/**
 * useAddIncomeMutation
 */
export function useAddIncomeMutation() {
  const qc = useQueryClient();
  const addIncome = useAppStore((s) => s.addIncome);
  const { currentMonth, currentYear } = useAppStore((s) => ({
    currentMonth: s.currentMonth,
    currentYear: s.currentYear,
  }));

  return useMutation({
    mutationFn: async (data: Omit<Income, "id">) => {
      const income: Income = { ...data, id: generateId() };
      addIncome(income);
      return income;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.income(currentMonth, currentYear) });
      qc.invalidateQueries({ queryKey: qk.summary(currentMonth, currentYear) });
    },
  });
}

/**
 * useDeleteIncomeMutation
 */
export function useDeleteIncomeMutation() {
  const qc = useQueryClient();
  const deleteIncome = useAppStore((s) => s.deleteIncome);
  const { currentMonth, currentYear } = useAppStore((s) => ({
    currentMonth: s.currentMonth,
    currentYear: s.currentYear,
  }));

  return useMutation({
    mutationFn: async (id: string) => {
      deleteIncome(id);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.income(currentMonth, currentYear) });
      qc.invalidateQueries({ queryKey: qk.summary(currentMonth, currentYear) });
    },
  });
}

/**
 * useToggleFixedPaidMutation
 */
export function useToggleFixedPaidMutation() {
  const qc = useQueryClient();
  const toggleFixedPaid = useAppStore((s) => s.toggleFixedPaid);
  const { currentMonth, currentYear } = useAppStore((s) => ({
    currentMonth: s.currentMonth,
    currentYear: s.currentYear,
  }));

  return useMutation({
    mutationFn: async ({ id, actualValue }: { id: string; actualValue?: number }) => {
      toggleFixedPaid(id, actualValue);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.fixed(currentMonth, currentYear) });
      qc.invalidateQueries({ queryKey: qk.summary(currentMonth, currentYear) });
    },
  });
}

/**
 * useAddReservationMutation
 */
export function useAddReservationMutation() {
  const qc = useQueryClient();
  const addReservation = useAppStore((s) => s.addReservation);

  return useMutation({
    mutationFn: async (data: Omit<Reservation, "id">) => {
      const reservation: Reservation = { ...data, id: generateId() };
      addReservation(reservation);
      return reservation;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.goals() });
    },
  });
}

// ─── Re-export selectors for convenience ─────────────────────────────────────
export { useMonthData, useFinanceSummary, useGoalsSummary, useExpensesByCategory, useIncomeBreakdown };
