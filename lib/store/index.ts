import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { createFinanceSlice, FinanceSlice } from "./finance-slice";
import { createUISlice, UISlice } from "./ui-slice";
import { createBudgetSlice, BudgetSlice } from "./budget-slice";
import { createThemeSlice, ThemeSlice } from "./theme-slice";

export type AppStore = FinanceSlice & UISlice & BudgetSlice & ThemeSlice;

export const useAppStore = create<AppStore>()(
  subscribeWithSelector((...args) => ({
    ...createFinanceSlice(...args),
    ...createUISlice(...args),
    ...createBudgetSlice(...args),
    ...createThemeSlice(...args),
  }))
);

// Auto-persist debounced 800ms
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let budgetTimeout: ReturnType<typeof setTimeout> | null = null;

useAppStore.subscribe(
  (s) => ({ months: s.months, settings: s.settings }),
  () => {
    if (!useAppStore.getState().isLoaded) return;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => useAppStore.getState().saveToStorage(), 800);
  },
  { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
);

useAppStore.subscribe(
  (s) => s.budgets,
  () => {
    if (budgetTimeout) clearTimeout(budgetTimeout);
    budgetTimeout = setTimeout(() => useAppStore.getState().saveBudgets(), 800);
  },
  { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
);

export const useFinanceStore = <T>(selector: (s: FinanceSlice) => T): T => useAppStore(selector);
export const useUIStore = <T>(selector: (s: UISlice) => T): T => useAppStore(selector);
export const useBudgetStore = <T>(selector: (s: BudgetSlice) => T): T => useAppStore(selector);
export const useThemeStore = <T>(selector: (s: ThemeSlice) => T): T => useAppStore(selector);
