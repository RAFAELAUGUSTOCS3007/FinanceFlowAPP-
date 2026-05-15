import { StateCreator } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@financeflow_data_v2";

export type PaymentMethod = "Pix / Dinheiro" | "Débito" | "Crédito" | "Boleto" | "Outro";
export type TransactionCategory =
  | "🍗 Alimentação"
  | "🔋 Saúde e Bem-estar"
  | "💪 Academia"
  | "🧾 Contas"
  | "🚗 Transporte"
  | "🎮 Lazer"
  | "🛍️ Compras"
  | "📚 Educação"
  | "🏠 Moradia"
  | "💊 Farmácia"
  | "🐾 Pet"
  | "Outros";

export interface Income {
  id: string; name: string; value: number; month: number; year: number;
}
export interface VariableExpense {
  id: string; category: TransactionCategory; paymentMethod: PaymentMethod;
  value: number; date: string; isEssential: boolean; month: number; year: number; description?: string;
}
export interface FixedExpense {
  id: string; name: string; plannedValue: number; actualValue?: number;
  paidDate?: string; isPaid: boolean; month: number; year: number;
}
export interface Reservation {
  id: string; type: "emergency" | "goal"; value: number; month: number; year: number;
}
export interface UserSettings {
  name: string; pronouns: string; goalName: string; goalTarget: number;
  emergencyFundTarget: number; theme: "light" | "dark" | "system"; creditLimit?: number;
}
export interface MonthData {
  month: number; year: number;
  incomes: Income[]; variableExpenses: VariableExpense[];
  fixedExpenses: FixedExpense[]; reservations: Reservation[];
}

const defaultSettings: UserSettings = {
  name: "", pronouns: "", goalName: "Minha Meta",
  goalTarget: 10000, emergencyFundTarget: 30000, theme: "dark", creditLimit: 5000,
};

function genId() { return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

export interface FinanceSlice {
  months: MonthData[];
  settings: UserSettings;
  currentMonth: number;
  currentYear: number;
  isLoaded: boolean;

  getOrCreateMonth: (month: number, year: number) => MonthData;
  addIncome: (income: Omit<Income, "id">) => void;
  removeIncome: (id: string) => void;
  addVariableExpense: (expense: Omit<VariableExpense, "id">) => void;
  removeVariableExpense: (id: string) => void;
  addFixedExpense: (expense: Omit<FixedExpense, "id">) => void;
  removeFixedExpense: (id: string) => void;
  toggleFixedExpensePaid: (id: string, actualValue?: number) => void;
  addReservation: (reservation: Omit<Reservation, "id">) => void;
  removeReservation: (id: string) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  setCurrentMonth: (month: number, year: number) => void;
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
}

export const createFinanceSlice: StateCreator<FinanceSlice, [], [], FinanceSlice> = (set, get) => ({
  months: [],
  settings: defaultSettings,
  currentMonth: new Date().getMonth() + 1,
  currentYear: new Date().getFullYear(),
  isLoaded: false,

  getOrCreateMonth: (month, year) => {
    const existing = get().months.find((m) => m.month === month && m.year === year);
    if (existing) return existing;
    const newMonth: MonthData = { month, year, incomes: [], variableExpenses: [], fixedExpenses: [], reservations: [] };
    set((s) => ({ months: [...s.months, newMonth] }));
    return newMonth;
  },

  addIncome: (income) => {
    get().getOrCreateMonth(income.month, income.year);
    set((s) => ({ months: s.months.map((m) => m.month === income.month && m.year === income.year ? { ...m, incomes: [...m.incomes, { ...income, id: genId() }] } : m) }));
    get().saveToStorage();
  },
  removeIncome: (id) => {
    set((s) => ({ months: s.months.map((m) => ({ ...m, incomes: m.incomes.filter((i) => i.id !== id) })) }));
    get().saveToStorage();
  },

  addVariableExpense: (expense) => {
    get().getOrCreateMonth(expense.month, expense.year);
    set((s) => ({ months: s.months.map((m) => m.month === expense.month && m.year === expense.year ? { ...m, variableExpenses: [...m.variableExpenses, { ...expense, id: genId() }] } : m) }));
    get().saveToStorage();
  },
  removeVariableExpense: (id) => {
    set((s) => ({ months: s.months.map((m) => ({ ...m, variableExpenses: m.variableExpenses.filter((e) => e.id !== id) })) }));
    get().saveToStorage();
  },

  addFixedExpense: (expense) => {
    get().getOrCreateMonth(expense.month, expense.year);
    set((s) => ({ months: s.months.map((m) => m.month === expense.month && m.year === expense.year ? { ...m, fixedExpenses: [...m.fixedExpenses, { ...expense, id: genId() }] } : m) }));
    get().saveToStorage();
  },
  removeFixedExpense: (id) => {
    set((s) => ({ months: s.months.map((m) => ({ ...m, fixedExpenses: m.fixedExpenses.filter((e) => e.id !== id) })) }));
    get().saveToStorage();
  },
  toggleFixedExpensePaid: (id, actualValue) => {
    set((s) => ({ months: s.months.map((m) => ({ ...m, fixedExpenses: m.fixedExpenses.map((f) => f.id === id ? { ...f, isPaid: !f.isPaid, actualValue: actualValue ?? f.actualValue, paidDate: !f.isPaid ? new Date().toISOString().split("T")[0] : undefined } : f) })) }));
    get().saveToStorage();
  },

  addReservation: (reservation) => {
    get().getOrCreateMonth(reservation.month, reservation.year);
    set((s) => ({ months: s.months.map((m) => m.month === reservation.month && m.year === reservation.year ? { ...m, reservations: [...m.reservations, { ...reservation, id: genId() }] } : m) }));
    get().saveToStorage();
  },
  removeReservation: (id) => {
    set((s) => ({ months: s.months.map((m) => ({ ...m, reservations: m.reservations.filter((r) => r.id !== id) })) }));
    get().saveToStorage();
  },

  updateSettings: (settings) => {
    set((s) => ({ settings: { ...s.settings, ...settings } }));
    get().saveToStorage();
  },
  setCurrentMonth: (month, year) => set({ currentMonth: month, currentYear: year }),

  loadFromStorage: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        set({ ...saved, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  saveToStorage: async () => {
    const { settings, months, currentMonth, currentYear } = get();
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, months, currentMonth, currentYear }));
    } catch {}
  },
});
