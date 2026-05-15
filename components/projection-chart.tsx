/**
 * components/projection-chart.tsx
 * Gráfico de projeção de saldo futuro (90 dias)
 * Usa react-native-svg para renderizar linha de projeção
 */

import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Line, Path, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";
import { formatCurrency, formatProjectionDate } from "@/lib/projection";
import type { ProjectionResult } from "@/lib/projection";
import { router } from "expo-router";

const NEON = "#AAFF00";
const RED = "#FF6060";

interface ProjectionChartProps {
  projection: ProjectionResult;
  width?: number;
}

export const ProjectionChart = React.memo(function ProjectionChart({
  projection,
  width = 340,
}: ProjectionChartProps) {
  const colors = useColors();
  const HEIGHT = 120;
  const PADDING = { top: 16, bottom: 28, left: 16, right: 16 };

  const chartW = width - PADDING.left - PADDING.right;
  const chartH = HEIGHT - PADDING.top - PADDING.bottom;

  const { points, minBalance, maxBalance, willGoNegative } = projection;

  // Sample every 3 days for performance (30 points instead of 90)
  const sampled = useMemo(
    () => points.filter((_, i) => i % 3 === 0),
    [points]
  );

  const range = maxBalance - minBalance || 1;
  const padded = range * 0.15;
  const yMin = minBalance - padded;
  const yMax = maxBalance + padded;
  const yRange = yMax - yMin;

  const toX = (i: number) => PADDING.left + (i / (sampled.length - 1)) * chartW;
  const toY = (val: number) => PADDING.top + ((yMax - val) / yRange) * chartH;

  // Build SVG path
  const pathD = useMemo(() => {
    if (sampled.length === 0) return "";
    return sampled.reduce((acc, p, i) => {
      const x = toX(i);
      const y = toY(p.balance);
      return acc + (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
    }, "");
  }, [sampled, toX, toY]);

  // Zero line Y position
  const zeroY = toY(0);
  const showZeroLine = yMin < 0 && yMax > 0;

  const lineColor = willGoNegative ? RED : NEON;
  const gradId = willGoNegative ? "projGradRed" : "projGradGreen";

  // Milestone labels: 30, 60, 90 days
  const milestones = [
    { label: "30d", point: projection.monthlyPoints[0] },
    { label: "60d", point: projection.monthlyPoints[1] },
    { label: "90d", point: projection.monthlyPoints[2] },
  ].filter((m) => m.point);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Projeção de Saldo</Text>
          <Text style={[styles.sub, { color: colors.muted }]}>Próximos 90 dias</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: willGoNegative ? "rgba(255,96,96,0.12)" : "rgba(170,255,0,0.1)" }]}>
          <Text style={[styles.badgeText, { color: willGoNegative ? RED : NEON }]}>
            {willGoNegative ? "⚠️ Risco" : "✓ Positivo"}
          </Text>
        </View>
      </View>

      {/* Chart */}
      <Svg width={width} height={HEIGHT}>
        <Defs>
          <LinearGradient id="projGradGreen" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={NEON} stopOpacity="0.20" />
            <Stop offset="100%" stopColor={NEON} stopOpacity="0.00" />
          </LinearGradient>
          <LinearGradient id="projGradRed" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={RED} stopOpacity="0.15" />
            <Stop offset="100%" stopColor={RED} stopOpacity="0.00" />
          </LinearGradient>
        </Defs>

        {/* Zero line */}
        {showZeroLine && (
          <Line
            x1={PADDING.left} y1={zeroY}
            x2={width - PADDING.right} y2={zeroY}
            stroke={RED} strokeWidth={0.8} strokeDasharray="4 4" opacity={0.5}
          />
        )}

        {/* Area fill */}
        {pathD !== "" && (
          <Path
            d={`${pathD} L ${toX(sampled.length - 1)} ${HEIGHT - PADDING.bottom} L ${PADDING.left} ${HEIGHT - PADDING.bottom} Z`}
            fill={`url(#${gradId})`}
          />
        )}

        {/* Line */}
        {pathD !== "" && (
          <Path d={pathD} stroke={lineColor} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Milestone dots */}
        {milestones.map((m, i) => {
          if (!m.point) return null;
          const idx = sampled.findIndex((p) => p.date >= m.point.date);
          if (idx < 0) return null;
          const x = toX(idx);
          const y = toY(m.point.balance);
          return (
            <React.Fragment key={i}>
              <Rect x={x - 0.5} y={PADDING.top} width={1} height={chartH} fill="rgba(255,255,255,0.06)" />
              <Path d={`M ${x} ${y - 5} L ${x} ${y + 5}`} stroke={lineColor} strokeWidth={1.5} />
            </React.Fragment>
          );
        })}
      </Svg>

      {/* Milestone labels */}
      <View style={styles.milestones}>
        {milestones.map((m, i) =>
          m.point ? (
            <View key={i} style={styles.milestone}>
              <Text style={[styles.milestoneLabel, { color: colors.muted }]}>{m.label}</Text>
              <Text style={[styles.milestoneVal, { color: m.point.isNegative ? RED : colors.foreground }]}>
                {formatCurrency(m.point.balance)}
              </Text>
            </View>
          ) : null
        )}
      </View>

      {/* Averages */}
      <View style={[styles.avgRow, { borderTopColor: colors.border }]}>
        <View style={styles.avgItem}>
          <Text style={[styles.avgLabel, { color: colors.muted }]}>Renda média/mês</Text>
          <Text style={[styles.avgVal, { color: "#00E5A0" }]}>{formatCurrency(projection.avgMonthlyIncome)}</Text>
        </View>
        <View style={[styles.avgDivider, { backgroundColor: colors.border }]} />
        <View style={styles.avgItem}>
          <Text style={[styles.avgLabel, { color: colors.muted }]}>Gasto médio/mês</Text>
          <Text style={[styles.avgVal, { color: RED }]}>{formatCurrency(projection.avgMonthlyExpenses)}</Text>
        </View>
        <View style={[styles.avgDivider, { backgroundColor: colors.border }]} />
        <View style={styles.avgItem}>
          <Text style={[styles.avgLabel, { color: colors.muted }]}>Sobra média/mês</Text>
          <Text style={[styles.avgVal, { color: NEON }]}>
            {formatCurrency(projection.avgMonthlyIncome - projection.avgMonthlyExpenses)}
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 16, borderRadius: 18, paddingTop: 16, overflow: "hidden" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 16, marginBottom: 12 },
  title: { fontSize: 15, fontWeight: "700" },
  sub: { fontSize: 11, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  milestones: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 16, marginTop: -4, marginBottom: 10 },
  milestone: { alignItems: "center" },
  milestoneLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, marginBottom: 2 },
  milestoneVal: { fontSize: 12, fontWeight: "700" },
  avgRow: { flexDirection: "row", borderTopWidth: 1, paddingVertical: 12 },
  avgItem: { flex: 1, alignItems: "center" },
  avgLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 3 },
  avgVal: { fontSize: 12, fontWeight: "900" },
  avgDivider: { width: 1, marginVertical: 4 },
});
