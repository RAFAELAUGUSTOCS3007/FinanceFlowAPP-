/**
 * lib/store/theme-slice.ts
 * Zustand slice para persistência da preferência de tema.
 * Complementa o ThemeProvider existente adicionando persistência
 * no AsyncStorage e integração com o store global.
 */

import { StateCreator } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemePreference = "light" | "dark" | "system";

export interface ThemeSlice {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  loadThemePreference: () => Promise<ThemePreference>;
}

const THEME_KEY = "@financeflow_theme_v1";

export const createThemeSlice: StateCreator<ThemeSlice, [], [], ThemeSlice> = (set, get) => ({
  themePreference: "dark",

  setThemePreference: (pref) => {
    set({ themePreference: pref });
    AsyncStorage.setItem(THEME_KEY, pref).catch(() => {});
  },

  loadThemePreference: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      const pref = (saved as ThemePreference) ?? "dark";
      set({ themePreference: pref });
      return pref;
    } catch {
      return "dark";
    }
  },
});
