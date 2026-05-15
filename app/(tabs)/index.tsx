import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenContainer } from "@/components/screen-container";
import { MoneyText } from "@/components/money-text";
import { SummaryCard } from "@/components/summary-card";
import { ProgressBar } from "@/components/progress-bar";
import { MonthSelector } from "@/components/month-selector";
import { CategoryBadge } from "@/components/category-badge";
import { useFinance, MONTH_NAMES, formatCurrency, formatDate } from "@/lib/finance-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/use-colors";
import type { ThemeColorPalette } from "@/constants/theme";
import { router } from "expo-router";
import { useAppStore } from "@/lib/store/index";
import { useGoalsSummary } from "@/lib/store/selectors";
import { generateInsights } from "@/lib/insights";
import { buildProjection } from "@/lib/projection";
import { calculateScore } from "@/lib/score";
import { InsightCard } from "@/components/insight-card";
import { ProjectionChart } from "@/components/projection-chart";
import Svg, { Circle, Path, Line, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";

const CHART_COLORS = [
  "#1A73E8", "#22C55E", "#F59E0B", "#8B5CF6", "#EF4444",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];

// ─── useFadeSlide ─────────────────────────────────────────────────────────────

function useFadeSlide(delay = 0) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 380, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);
  return { opacity, transform: [{ translateY }] };
}

// ─── AnimatedCard ─────────────────────────────────────────────────────────────

const AnimatedCard = React.memo(function AnimatedCard({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: object }) {
  const animStyle = useFadeSlide(delay);
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
});

// ─── HealthScore ──────────────────────────────────────────────────────────────

const HealthScore = React.memo(function HealthScore({ score }: { score: number }) {
  const colors = useColors();
  const animVal = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const id = animVal.addListener(({ value }) => setDisplay(Math.round(value)));
    Animated.timing(animVal, { toValue: score, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => {
      setDisplay(score);
      animVal.removeListener(id);
    });
    return () => animVal.removeListener(id);
  }, [score]);

  const color = score >= 70 ? "#22C55E" : score >= 40 ? "#F59E0B" : "#EF4444";
  const label = score >= 70 ? "Excelente 🟢" : score >= 40 ? "Atenção 🟡" : "Crítico 🔴";
  const tip = score >= 70 ? "Você está no caminho certo! Continue controlando seus gastos." : score >= 40 ? "Seus gastos estão altos. Revise as despesas variáveis." : "Gastos acima da renda. Reduza despesas urgentemente.";
  const r = 28, circ = 2 * Math.PI * r;

  return (
    <View style={[styles.healthCard, { backgroundColor: colors.surface }]}>
      <View style={styles.healthHeader}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Saúde Financeira</Text>
        <View style={[styles.healthBadge, { backgroundColor: color + "20" }]}>
          <Text style={{ fontSize: 11, fontWeight: "700", color }}>{label}</Text>
        </View>
      </View>
      <View style={styles.healthContent}>
        <View style={styles.healthCircle}>
          <Svg width={72} height={72} viewBox="0 0 72 72">
            <Circle cx={36} cy={36} r={r} fill="none" stroke={colors.border} strokeWidth={7} />
            <Circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={7}
              strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeDashoffset={circ * 0.25} strokeLinecap="round" />
          </Svg>
          <View style={styles.healthScoreOverlay}>
            <Text style={[styles.healthScoreText, { color }]}>{display}</Text>
          </View>
        </View>
        <Text style={[styles.healthTip, { color: colors.muted }]}>{tip}</Text>
      </View>
    </View>
  );
});

// ─── MonthlyTrendChart ────────────────────────────────────────────────────────

const MonthlyTrendChart = React.memo(function MonthlyTrendChart({ months, colors }: { months: Array<{ label: string; balance: number; income: number; expense: number }>; colors: ThemeColorPalette }) {
  if (months.length < 2) return null;
  const W = 280, H = 80, PX = 10, PY = 10;
  const values = months.map((m) => m.balance);
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const toX = (i: number) => PX + (i / (months.length - 1)) * (W - 2 * PX);
  const toY = (v: number) => PY + (1 - (v - min) / range) * (H - 2 * PY);
  const pts = months.map((m, i) => ({ x: toX(i), y: toY(m.balance) }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = linePath + ` L ${pts[pts.length - 1].x} ${H - PY} L ${pts[0].x} ${H - PY} Z`;
  const last = pts[pts.length - 1];
  const lineColor = values[values.length - 1] >= 0 ? "#22C55E" : "#EF4444";

  return (
    <View>
      <Svg width={W} height={H}>
        <Defs>
          <SvgGradient id="ag" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity="0.25" />
            <Stop offset="1" stopColor={lineColor} stopOpacity="0.01" />
          </SvgGradient>
        </Defs>
        {min < 0 && max > 0 && (
          <Line x1={PX} y1={toY(0)} x2={W - PX} y2={toY(0)} stroke={colors.border} strokeWidth={1} strokeDasharray="4 3" />
        )}
        <Path d={areaPath} fill="url(#ag)" />
        <Path d={linePath} stroke={lineColor} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={3} fill={lineColor} />)}
        <Circle cx={last.x} cy={last.y} r={5} fill={lineColor} />
        <Circle cx={last.x} cy={last.y} r={3} fill={colors.surface} />
      </Svg>
      <View style={{ flexDirection: "row" }}>
        {months.map((m, i) => (
          <Text key={i} style={{ fontSize: 9, color: colors.muted, flex: 1, textAlign: "center" }}>{m.label}</Text>
        ))}
      </View>
    </View>
  );
});

// ─── QuickAction ──────────────────────────────────────────────────────────────

const QuickAction = React.memo(function QuickAction({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable onPress={onPress} onPressIn={() => Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 50 }).start()} onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start()} style={{ flex: 1 }}>
      <Animated.View style={[styles.quickAction, { backgroundColor: color + "15", transform: [{ scale }] }]}>
        <Text style={styles.quickActionIcon}>{icon}</Text>
        <Text style={[styles.quickActionLabel, { color }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
});

// ─── FAB ──────────────────────────────────────────────────────────────────────

const FAB = React.memo(function FAB({ onPress, color }: { onPress: () => void; color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable onPress={onPress} onPressIn={() => Animated.spring(scale, { toValue: 0.9, useNativeDriver: true, speed: 50 }).start()} onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start()} style={{ position: "absolute", right: 20, bottom: 20 }}>
      <Animated.View style={[styles.fab, { backgroundColor: color, transform: [{ scale }] }]}>
        <Text style={styles.fabIcon}>+</Text>
      </Animated.View>
    </Pressable>
  );
});

// ─── DonutChart ───────────────────────────────────────────────────────────────

const DonutChart = React.memo(function DonutChart({ slices, colors }: { slices: Array<{ value: number; color: string; label: string }>; colors: ThemeColorPalette }) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  let cum = 0;
  const r = 55, inner = 32, cx = 70, cy = 70;
  const circ = 2 * Math.PI * ((r + inner) / 2);
  return (
    <View style={styles.pieContainer}>
      <Svg width={140} height={140} viewBox="0 0 140 140">
        {slices.map((slice, i) => {
          const pct = slice.value / total;
          const offset = -cum * circ;
          cum += pct;
          return (
            <Circle key={i} cx={cx} cy={cy} r={(r + inner) / 2} fill="none" stroke={slice.color}
              strokeWidth={r - inner} strokeDasharray={`${pct * circ - 2} ${circ}`} strokeDashoffset={offset} transform={`rotate(-90 ${cx} ${cy})`} />
          );
        })}
        <Circle cx={cx} cy={cy} r={inner - 2} fill={colors.surface} />
      </Svg>
      <View style={styles.pieCenterLabel}>
        <Text style={{ fontSize: 9, color: colors.muted, textAlign: "center" }}>Total</Text>
        <Text style={{ fontSize: 11, fontWeight: "700", color: colors.foreground }}>{formatCurrency(total).replace("R$", "").trim()}</Text>
      </View>
    </View>
  );
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { state, currentMonthData, totalIncome, totalVariableExpenses, totalFixedExpenses, totalFixedExpensesPaid, totalReservations, availableBalance } = useFinance();
  const colors = useColors();
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("@financeflow_onboarding_done").then((done) => {
      if (!done) {
        router.replace("/welcome" as never);
      } else {
        setCheckingOnboarding(false);
      }
    }).catch(() => setCheckingOnboarding(false));
  }, []);

  const totalExpenses = useMemo(() => totalVariableExpenses + totalFixedExpensesPaid, [totalVariableExpenses, totalFixedExpensesPaid]);
  const spendingRatio = useMemo(() => totalIncome > 0 ? totalExpenses / totalIncome : 0, [totalExpenses, totalIncome]);

  // ── Fase 4: Score dinâmico ───────────────────────────────────────────────
  const scoreData = useMemo(() => {
    let pm = state.currentMonth - 1, py = state.currentYear;
    if (pm === 0) { pm = 12; py -= 1; }
    return calculateScore(state.months, state.currentMonth, state.currentYear, state.settings, pm, py);
  }, [state.months, state.currentMonth, state.currentYear, state.settings]);

  const healthScore = scoreData.total;

  // ── Fase 2: Insights & Projeção ─────────────────────────────────────────
  const { months, settings } = state;
  const goalsSummary = useGoalsSummary();
  const budgets = useAppStore((s) => s.budgets);
  const [dismissedInsights, setDismissedInsights] = useState<string[]>([]);
  const prevMonthData = useMemo(() => {
    let pm = state.currentMonth - 1, py = state.currentYear;
    if (pm === 0) { pm = 12; py -= 1; }
    return months.find((m) => m.month === pm && m.year === py);
  }, [months, state.currentMonth, state.currentYear]);

  const avgMonthlyExpenses = useMemo(() => {
    const recent = months
      .filter((m) => m.year < state.currentYear || (m.year === state.currentYear && m.month < state.currentMonth))
      .slice(-3);
    if (recent.length === 0) return totalExpenses;
    return recent.reduce((s, m) => s + m.variableExpenses.reduce((a, e) => a + e.value, 0) + m.fixedExpenses.reduce((a, e) => a + (e.actualValue ?? e.plannedValue), 0), 0) / recent.length;
  }, [months, state.currentMonth, state.currentYear, totalExpenses]);

  const insights = useMemo(() =>
    generateInsights({
      currentMonthData,
      previousMonthData: prevMonthData,
      budgets,
      totalEmergencyFundSaved: goalsSummary.totalEmergency,
      totalGoalSaved: goalsSummary.totalGoal,
      emergencyFundTarget: settings.emergencyFundTarget,
      goalTarget: settings.goalTarget,
      availableBalance,
      totalIncome,
      avgMonthlyExpenses,
    }).filter((ins) => !dismissedInsights.includes(ins.id)),
    [currentMonthData, prevMonthData, budgets, goalsSummary, settings, availableBalance, totalIncome, avgMonthlyExpenses, dismissedInsights]
  );

  const projection = useMemo(() =>
    buildProjection(months, availableBalance, state.currentMonth, state.currentYear),
    [months, availableBalance, state.currentMonth, state.currentYear]
  );

  const handleDismissInsight = useCallback((id: string) => {
    setDismissedInsights((prev) => [...prev, id]);
  }, []);

  const chartSlices = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const e of currentMonthData?.variableExpenses ?? []) {
      acc[e.category] = (acc[e.category] ?? 0) + e.value;
    }
    return Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [currentMonthData?.variableExpenses]);

  const recentTransactions = useMemo(() =>
    [...(currentMonthData?.variableExpenses ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
    [currentMonthData?.variableExpenses]
  );

  const unpaidFixed = useMemo(() =>
    (currentMonthData?.fixedExpenses ?? []).filter((e) => !e.isPaid).slice(0, 3),
    [currentMonthData?.fixedExpenses]
  );

  const monthlyTrend = useMemo(() => {
    const result: Array<{ label: string; balance: number; income: number; expense: number }> = [];
    for (let i = 5; i >= 0; i--) {
      let m = state.currentMonth - i, y = state.currentYear;
      if (m <= 0) { m += 12; y -= 1; }
      const md = state.months.find((mo) => mo.month === m && mo.year === y);
      if (!md) continue;
      const inc = md.incomes.reduce((s, x) => s + x.value, 0);
      const varExp = md.variableExpenses.reduce((s, x) => s + x.value, 0);
      const fixPaid = md.fixedExpenses.filter((e) => e.isPaid).reduce((s, e) => s + (e.actualValue ?? e.plannedValue), 0);
      const res = md.reservations.reduce((s, r) => s + r.value, 0);
      result.push({ label: MONTH_NAMES[m - 1].substring(0, 3), balance: inc - varExp - fixPaid - res, income: inc, expense: varExp + fixPaid });
    }
    return result;
  }, [state.months, state.currentMonth, state.currentYear]);

  const toggleBalance = useCallback(() => setBalanceHidden((v) => !v), []);
  const goToSettings = useCallback(() => router.push("/(tabs)/settings"), []);
  const goToFixed = useCallback(() => router.push("/(tabs)/fixed"), []);
  const goToTransactions = useCallback(() => router.push("/(tabs)/transactions"), []);
  const goToAddTransaction = useCallback(() => router.push("/add-transaction"), []);
  const goToCredit = useCallback(() => router.push("/credit" as never), []);
  const goToGoals = useCallback(() => router.push("/(tabs)/goals"), []);
  const goToExport = useCallback(() => router.push("/export-report" as never), []);

  const monthName = MONTH_NAMES[state.currentMonth - 1];
  const gradientColors: [string, string, string] = availableBalance >= 0 ? ["#1A2A10", "#0F1A18", "#0F0F12"] : ["#1A0505", "#2A0A0A", "#3A1010"];

  if (checkingOnboarding) {
    return (
      <ScreenContainer containerClassName="bg-background" edges={["left", "right"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0F0F12" }}>
          <Text style={{ color: "#AAFF00", fontSize: 22, fontWeight: "900", letterSpacing: -0.5 }}>
            Finance<Text style={{ color: "#AAFF00" }}>Flow</Text>
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" edges={["left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }} removeClippedSubviews={Platform.OS !== "web"}>

        {/* ── Header ── */}
        <LinearGradient colors={gradientColors} style={styles.gradientHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.greetingText}>{getGreeting()}, {state.settings.name}! 👋</Text>
              <Text style={styles.monthText}>{monthName} {state.currentYear}</Text>
            </View>
            <Pressable onPress={goToSettings} style={({ pressed }) => [styles.avatarBtn, { opacity: pressed ? 0.8 : 1 }]}>
              <Text style={styles.avatarText}>{state.settings.name.charAt(0).toUpperCase()}</Text>
            </Pressable>
          </View>
          <MonthSelector light />
          <View style={styles.balanceSection}>
            <View style={styles.balanceLabelRow}>
              <Text style={styles.balanceLabel}>Saldo Disponível</Text>
              <Pressable onPress={toggleBalance} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                <Text style={styles.eyeIcon}>{balanceHidden ? "👁️" : "🙈"}</Text>
              </Pressable>
            </View>
            {balanceHidden ? (
              <Text style={styles.hiddenBalance}>••••••</Text>
            ) : (
              <MoneyText value={availableBalance} style={styles.balanceValue} />
            )}
            <View style={styles.balanceStatusRow}>
              <View style={[styles.balanceStatusBadge, { backgroundColor: availableBalance >= 0 ? "rgba(0,229,160,0.15)" : "rgba(255,96,96,0.15)" }]}>
                <Text style={[styles.balanceStatusText, { color: availableBalance >= 0 ? "#00E5A0" : "#FF6060" }]}>
                  {availableBalance >= 0 ? "✅ Saldo positivo" : "⚠️ Saldo negativo"}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* ── Summary Cards ── */}
        <AnimatedCard delay={80} style={styles.summaryGrid}>
          <View style={styles.summaryRow}>
            <SummaryCard title="ENTRADAS" value={balanceHidden ? 0 : totalIncome} icon="💰" color="#00E5A0" bgColor="rgba(0,229,160,0.12)" subtitle="Total do mês" hidden={balanceHidden} onPress={goToTransactions} />
            <View style={{ width: 10 }} />
            <SummaryCard title="SAÍDAS" value={balanceHidden ? 0 : totalExpenses} icon="💸" color="#FF6060" bgColor="rgba(255,96,96,0.12)" subtitle="Var. + Fixas" hidden={balanceHidden} onPress={goToTransactions} />
          </View>
          <View style={[styles.summaryRow, { marginTop: 10 }]}>
            <SummaryCard title="CRÉDITO" value={balanceHidden ? 0 : totalVariableExpenses} icon="💳" color="#FFBB45" bgColor="rgba(255,187,69,0.12)" subtitle="Despesas variáveis" hidden={balanceHidden} onPress={goToCredit} />
            <View style={{ width: 10 }} />
            <SummaryCard title="RESERVAS" value={balanceHidden ? 0 : totalReservations} icon="🏦" color="#C084FC" bgColor="rgba(192,132,252,0.12)" subtitle="Guardado esse mês" hidden={balanceHidden} onPress={goToGoals} />
          </View>
        </AnimatedCard>

        {/* ── Insights automáticos ── */}
        {insights.length > 0 && (
          <AnimatedCard delay={140}>
            {insights.slice(0, 3).map((ins) => (
              <InsightCard key={ins.id} insight={ins} onDismiss={handleDismissInsight} />
            ))}
          </AnimatedCard>
        )}

        {/* ── Health Score — toque para detalhes ── */}
        <AnimatedCard delay={160} style={{ marginHorizontal: 16, marginTop: 14 }}>
          <Pressable onPress={() => router.push("/score" as any)} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
            <HealthScore score={healthScore} />
          </Pressable>
        </AnimatedCard>

        {/* ── Spending Progress ── */}
        <AnimatedCard delay={220} style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Uso do Orçamento</Text>
            <View style={[styles.pctBadge, { backgroundColor: spendingRatio > 0.9 ? colors.error + "20" : spendingRatio > 0.7 ? colors.warning + "20" : colors.income + "20" }]}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: spendingRatio > 0.9 ? colors.error : spendingRatio > 0.7 ? colors.warning : colors.income }}>
                {Math.round(spendingRatio * 100)}%
              </Text>
            </View>
          </View>
          <ProgressBar progress={spendingRatio} color={spendingRatio > 0.9 ? colors.error : spendingRatio > 0.7 ? colors.warning : colors.income} backgroundColor={colors.border} height={10} />
          <View style={styles.progressLabels}>
            <Text style={[styles.progressLabel, { color: colors.muted }]}>Gasto: {formatCurrency(totalExpenses)}</Text>
            <Text style={[styles.progressLabel, { color: colors.muted }]}>Renda: {formatCurrency(totalIncome)}</Text>
          </View>
        </AnimatedCard>

        {/* ── Monthly Trend ── */}
        {monthlyTrend.length >= 2 && (
          <AnimatedCard delay={270} style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Evolução Mensal</Text>
            <View style={{ marginTop: 12, alignItems: "center" }}>
              <MonthlyTrendChart months={monthlyTrend} colors={colors} />
            </View>
          </AnimatedCard>
        )}

        {/* ── Projeção de saldo 90 dias ── */}
        <AnimatedCard delay={295} style={{ marginBottom: 4 }}>
          <ProjectionChart projection={projection} />
        </AnimatedCard>

        {/* ── Fixed Expenses ── */}
        <AnimatedCard delay={310} style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Despesas Fixas</Text>
            <Pressable onPress={goToFixed}><Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>Ver todas →</Text></Pressable>
          </View>
          {(currentMonthData?.fixedExpenses ?? []).length === 0 ? (
            <Text style={{ color: colors.muted, fontSize: 13 }}>Nenhuma despesa fixa cadastrada</Text>
          ) : (
            <>
              <ProgressBar progress={totalFixedExpenses > 0 ? totalFixedExpensesPaid / totalFixedExpenses : 0} color={colors.primary} backgroundColor={colors.border} height={8} />
              <View style={styles.progressLabels}>
                <Text style={[styles.progressLabel, { color: colors.muted }]}>Pago: {formatCurrency(totalFixedExpensesPaid)}</Text>
                <Text style={[styles.progressLabel, { color: colors.muted }]}>Total: {formatCurrency(totalFixedExpenses)}</Text>
              </View>
              {unpaidFixed.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.sectionLabel, { color: colors.muted }]}>Pendentes</Text>
                  {unpaidFixed.map((e) => (
                    <View key={e.id} style={[styles.fixedItem, { borderColor: colors.border }]}>
                      <View style={[styles.unpaidDot, { backgroundColor: colors.warning }]} />
                      <Text style={[styles.fixedItemName, { color: colors.foreground }]}>{e.name}</Text>
                      <MoneyText value={e.plannedValue} style={[styles.fixedItemValue, { color: colors.warning }]} />
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </AnimatedCard>

        {/* ── Category Chart ── */}
        {chartSlices.length > 0 && (
          <AnimatedCard delay={360} style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Categorias</Text>
            <View style={styles.chartContainer}>
              <DonutChart slices={chartSlices} colors={colors} />
              <View style={styles.legendContainer}>
                {chartSlices.map((slice, i) => (
                  <View key={i} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.legendLabel, { color: colors.foreground }]} numberOfLines={1}>{slice.label}</Text>
                      <Text style={[styles.legendValue, { color: colors.muted }]}>{formatCurrency(slice.value)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </AnimatedCard>
        )}

        {/* ── Recent Transactions ── */}
        {recentTransactions.length > 0 && (
          <AnimatedCard delay={400} style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Últimas Transações</Text>
              <Pressable onPress={goToTransactions}><Text style={{ color: colors.primary, fontSize: 13, fontWeight: "600" }}>Ver todas →</Text></Pressable>
            </View>
            {recentTransactions.map((t) => (
              <View key={t.id} style={[styles.transactionItem, { borderColor: colors.border }]}>
                <CategoryBadge category={t.category} size="sm" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  {t.description ? <Text style={[styles.transactionDescription, { color: colors.foreground }]} numberOfLines={1}>{t.description}</Text> : null}
                  <Text style={[styles.transactionDate, { color: colors.muted }]}>{formatDate(t.date)} · {t.paymentMethod}</Text>
                </View>
                <MoneyText value={-t.value} style={[styles.transactionValue, { color: colors.expense }]} />
              </View>
            ))}
          </AnimatedCard>
        )}

        {/* ── Quick Actions ── */}
        <AnimatedCard delay={440} style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Ações Rápidas</Text>
          <View style={styles.quickActionsRow}>
            <QuickAction icon="➕" label="Adicionar" color={colors.primary} onPress={goToAddTransaction} />
            <QuickAction icon="📊" label="Orçamento" color="#AAFF00" onPress={() => router.push("/budgets" as any)} />
            <QuickAction icon="🎯" label="Metas" color="#7C3AED" onPress={goToGoals} />
            <QuickAction icon="📤" label="Exportar" color="#00E5A0" onPress={goToExport} />
          </View>
        </AnimatedCard>
      </ScrollView>

      <FAB onPress={goToAddTransaction} color={colors.primary} />
    </ScreenContainer>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

const styles = StyleSheet.create({
  gradientHeader: { paddingTop: 52, paddingBottom: 28, paddingHorizontal: 18 },
  headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  greetingText: { color: "#C8C8E0", fontSize: 13, fontWeight: "500" },
  monthText: { color: "#F2F2FF", fontSize: 22, fontWeight: "900", letterSpacing: -0.5, marginTop: 2 },
  avatarBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: "#AAFF00", backgroundColor: "rgba(170,255,0,0.08)", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#AAFF00", fontSize: 14, fontWeight: "900" },
  balanceSection: { marginTop: 22, alignItems: "center" },
  balanceLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  balanceLabel: { color: "#7A7A96", fontSize: 9, fontWeight: "900", letterSpacing: 2.5, textTransform: "uppercase" },
  eyeIcon: { fontSize: 16 },
  balanceValue: { color: "#F2F2FF", fontSize: 44, fontWeight: "900", letterSpacing: -2, marginTop: 2, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", },
  hiddenBalance: { color: "#F2F2FF", fontSize: 44, fontWeight: "900", letterSpacing: 8, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", },
  balanceStatusRow: { marginTop: 10 },
  balanceStatusBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  balanceStatusText: { fontSize: 12, fontWeight: "600" },
  summaryGrid: { paddingHorizontal: 16, marginTop: 16 },
  summaryRow: { flexDirection: "row" },
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#252530" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: "700", letterSpacing: -0.2 },
  sectionLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  pctBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  progressLabel: { fontSize: 11 },
  fixedItem: { flexDirection: "row", alignItems: "center", paddingVertical: 7, borderBottomWidth: 0.5, gap: 8 },
  unpaidDot: { width: 8, height: 8, borderRadius: 4 },
  fixedItemName: { flex: 1, fontSize: 13 },
  fixedItemValue: { fontSize: 13, fontWeight: "600" },
  chartContainer: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 12 },
  pieContainer: { alignItems: "center", justifyContent: "center", position: "relative" },
  pieCenterLabel: { position: "absolute", alignItems: "center" },
  legendContainer: { flex: 1, gap: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, fontWeight: "500" },
  legendValue: { fontSize: 10, marginTop: 1 },
  transactionItem: { flexDirection: "row", alignItems: "center", paddingVertical: 9, borderBottomWidth: 0.5, gap: 4 },
  transactionDescription: { fontSize: 12, fontWeight: "500" },
  transactionDate: { fontSize: 11, marginTop: 1 },
  transactionValue: { fontSize: 14, fontWeight: "700" },
  healthCard: { borderRadius: 20, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  healthHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  healthBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  healthContent: { flexDirection: "row", alignItems: "center", gap: 16 },
  healthCircle: { position: "relative", width: 72, height: 72, alignItems: "center", justifyContent: "center" },
  healthScoreOverlay: { position: "absolute", alignItems: "center", justifyContent: "center" },
  healthScoreText: { fontSize: 18, fontWeight: "800" },
  healthTip: { flex: 1, fontSize: 13, lineHeight: 20 },
  quickActionsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  quickAction: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 13, borderRadius: 16, gap: 4 },
  quickActionIcon: { fontSize: 22 },
  quickActionLabel: { fontSize: 11, fontWeight: "700" },
  fab: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
  fabIcon: { color: "#FFFFFF", fontSize: 30, fontWeight: "300", lineHeight: 34, marginTop: -2 },
});
