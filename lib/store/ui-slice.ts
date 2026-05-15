import { StateCreator } from "zustand";

export interface UISlice {
  // Theme & display
  colorScheme: "light" | "dark" | "system";
  hideBalances: boolean;

  // Modal/sheet visibility
  isAddTransactionOpen: boolean;
  isAddIncomeOpen: boolean;
  isAddFixedOpen: boolean;
  isAddReservationOpen: boolean;

  // Loading indicators
  isAppReady: boolean;

  // Toast / feedback
  toastMessage: string | null;
  toastType: "success" | "error" | "info" | null;

  // Actions
  setColorScheme: (scheme: "light" | "dark" | "system") => void;
  toggleHideBalances: () => void;
  setAddTransactionOpen: (open: boolean) => void;
  setAddIncomeOpen: (open: boolean) => void;
  setAddFixedOpen: (open: boolean) => void;
  setAddReservationOpen: (open: boolean) => void;
  setAppReady: (ready: boolean) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  hideToast: () => void;
}

export const createUISlice: StateCreator<UISlice, [], [], UISlice> = (set) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  colorScheme: "system",
  hideBalances: false,

  isAddTransactionOpen: false,
  isAddIncomeOpen: false,
  isAddFixedOpen: false,
  isAddReservationOpen: false,

  isAppReady: false,

  toastMessage: null,
  toastType: null,

  // ── Actions ────────────────────────────────────────────────────────────────
  setColorScheme: (scheme) => set({ colorScheme: scheme }),
  toggleHideBalances: () => set((s) => ({ hideBalances: !s.hideBalances })),

  setAddTransactionOpen: (open) => set({ isAddTransactionOpen: open }),
  setAddIncomeOpen: (open) => set({ isAddIncomeOpen: open }),
  setAddFixedOpen: (open) => set({ isAddFixedOpen: open }),
  setAddReservationOpen: (open) => set({ isAddReservationOpen: open }),

  setAppReady: (ready) => set({ isAppReady: ready }),

  showToast: (message, type = "info") => set({ toastMessage: message, toastType: type }),
  hideToast: () => set({ toastMessage: null, toastType: null }),
});
