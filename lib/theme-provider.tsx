/**
 * ThemeProvider — força dark mode como padrão do FinanceFlow.
 * Ignora a preferência do sistema na primeira vez.
 * O usuário pode trocar em Settings → Aparência.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";
import { SchemeColors, type ColorScheme } from "@/constants/theme";

type ThemeContextValue = {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // FinanceFlow é dark-first. O padrão é sempre dark,
  // independente da preferência do sistema.
  // O Zustand theme-slice sobrescreve isso ao carregar a preferência salva.
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>("dark");

  const applyScheme = useCallback((scheme: ColorScheme) => {
    nativewindColorScheme.set(scheme);
    Appearance.setColorScheme?.(scheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.classList.toggle("dark", scheme === "dark");
      const palette = SchemeColors[scheme];
      Object.entries(palette).forEach(([token, value]) => {
        root.style.setProperty(`--color-${token}`, value);
      });
    }
  }, []);

  const setColorScheme = useCallback(
    (scheme: ColorScheme) => {
      setColorSchemeState(scheme);
      applyScheme(scheme);
    },
    [applyScheme]
  );

  // Aplica dark imediatamente ao montar
  useEffect(() => {
    applyScheme(colorScheme);
  }, [applyScheme, colorScheme]);

  const themeVariables = useMemo(
    () =>
      vars({
        "color-primary":    SchemeColors[colorScheme].primary,
        "color-background": SchemeColors[colorScheme].background,
        "color-surface":    SchemeColors[colorScheme].surface,
        "color-foreground": SchemeColors[colorScheme].foreground,
        "color-muted":      SchemeColors[colorScheme].muted,
        "color-border":     SchemeColors[colorScheme].border,
        "color-success":    SchemeColors[colorScheme].success,
        "color-warning":    SchemeColors[colorScheme].warning,
        "color-error":      SchemeColors[colorScheme].error,
        "color-income":     SchemeColors[colorScheme].income,
        "color-expense":    SchemeColors[colorScheme].expense,
        "color-savings":    SchemeColors[colorScheme].savings,
        "color-credit":     SchemeColors[colorScheme].credit,
      }),
    [colorScheme]
  );

  const value = useMemo(
    () => ({ colorScheme, setColorScheme }),
    [colorScheme, setColorScheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1, backgroundColor: "#0A0A0F" }, themeVariables]}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used within ThemeProvider");
  return ctx;
}
