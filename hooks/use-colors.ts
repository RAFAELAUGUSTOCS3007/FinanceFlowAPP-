import { Colors, type ColorScheme, type ThemeColorPalette } from "@/constants/theme";
import { useColorScheme } from "./use-color-scheme";

/**
 * FinanceFlow é DARK-FIRST.
 * Fallback sempre para "dark", nunca "light".
 * O usuário pode trocar manualmente em Settings → Aparência.
 */
export function useColors(colorSchemeOverride?: ColorScheme): ThemeColorPalette {
  const colorSchema = useColorScheme();
  const scheme = (colorSchemeOverride ?? colorSchema ?? "dark") as ColorScheme;
  return Colors[scheme];
}
