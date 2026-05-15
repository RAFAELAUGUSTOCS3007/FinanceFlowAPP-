/**
 * lib/store/budget-slice.ts
 * Orçamento por categoria — Envelope Method
 *
 * O usuário define um limite mensal por categoria.
 * O app mostra em tempo real quanto sobrou de cada envelope.
 */

import { StateCreator } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { TransactionCategory } from "./finance-slice";

export interface BudgetEnvelope {
  category: TransactionCategory;
  limitAmount: number;   // quanto o usuário quer gastar no mês
  month: number;
  year: number;
}

export interface BudgetSlice {
  budgets: BudgetEnvelope[];

  setBudget: (category: TransactionCategory, limit: number, month: number, year: number) => void;
  removeBudget: (category: TransactionCategory, month: number, year: number) => void;
  copyBudgetsFromPrevMonth: (targetMonth: number, targetYear: number) => void;
  getBudgetsForMonth: (month: number, year: number) => BudgetEnvelope[];
  loadBudgets: () => Promise<void>;
  saveBudgets: () => Promise<void>;
}

const BUDGET_STORAGE_KEY = "@financeflow_budgets_v1";

export const createBudgetSlice: StateCreator<BudgetSlice, [], [], BudgetSlice> = (set, get) => ({
  budgets: [],

  setBudget: (category, limitAmount, month, year) =>
    set((s) => {
      const filtered = s.budgets.filter(
        (b) => !(b.category === category && b.month === month && b.year === year)
      );
      if (limitAmount <= 0) return { budgets: filtered };
      return { budgets: [...filtered, { category, limitAmount, month, year }] };
    }),

  removeBudget: (category, month, year) =>
    set((s) => ({
      budgets: s.budgets.filter(
        (b) => !(b.category === category && b.month === month && b.year === year)
      ),
    })),

  copyBudgetsFromPrevMonth: (targetMonth, targetYear) => {
    let prevMonth = targetMonth - 1;
    let prevYear = targetYear;
    if (prevMonth === 0) { prevMonth = 12; prevYear = targetYear - 1; }

    const prev = get().budgets.filter((b) => b.month === prevMonth && b.year === prevYear);
    if (prev.length === 0) return;

    set((s) => {
      // Remove existing for target month
      const withoutTarget = s.budgets.filter(
        (b) => !(b.month === targetMonth && b.year === targetYear)
      );
      const copied = prev.map((b) => ({ ...b, month: targetMonth, year: targetYear }));
      return { budgets: [...withoutTarget, ...copied] };
    });
  },

  getBudgetsForMonth: (month, year) =>
    get().budgets.filter((b) => b.month === month && b.year === year),

  loadBudgets: async () => {
    try {
      const raw = await AsyncStorage.getItem(BUDGET_STORAGE_KEY);
      if (raw) set({ budgets: JSON.parse(raw) });
    } catch {}
  },

  saveBudgets: async () => {
    try {
      await AsyncStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(get().budgets));
    } catch {}
  },
});
