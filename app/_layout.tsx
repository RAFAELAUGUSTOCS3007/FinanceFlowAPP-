import "../../global.css";
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/lib/theme-provider";
import { FinanceProvider } from "@/lib/finance-context";
import { useAppStore } from "@/lib/store/index";
import { useThemeContext } from "@/lib/theme-provider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: 1 },
    mutations: { retry: false },
  },
});

function StoreBootstrap({ children }: { children: React.ReactNode }) {
  const loadFromStorage = useAppStore((s) => s.loadFromStorage);
  const loadBudgets = useAppStore((s) => s.loadBudgets);
  const loadThemePreference = useAppStore((s) => s.loadThemePreference);
  const { setColorScheme } = useThemeContext?.() ?? {};

  useEffect(() => {
    const boot = async () => {
      await loadFromStorage();
      await loadBudgets();
      const pref = await loadThemePreference();
      if (pref !== "system" && setColorScheme) setColorScheme(pref as any);
    };
    boot();
  }, []);

  return <>{children}</>;
}

function AppNavigator() {
  return (
    <StoreBootstrap>
      <FinanceProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="welcome" options={{ presentation: "fullScreenModal" }} />
          <Stack.Screen name="onboarding" options={{ presentation: "fullScreenModal" }} />
          <Stack.Screen name="add-transaction" options={{ presentation: "modal" }} />
          <Stack.Screen name="export-report" options={{ presentation: "modal" }} />
          <Stack.Screen name="budgets" options={{ presentation: "modal" }} />
          <Stack.Screen name="score" options={{ presentation: "modal" }} />
          <Stack.Screen name="credit" options={{ presentation: "modal" }} />
        </Stack>
      </FinanceProvider>
    </StoreBootstrap>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AppNavigator />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
