/**
 * app/score.tsx
 * Tela de Score Financeiro Dinâmico — 6 dimensões
 * Acessível via modal do Dashboard
 */

import React, { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { router } from "expo-router";
import { useAppStore } from "@/lib/store/index";
import { calculateScore, type ScoreDimension } from "@/lib/score";

const NEON = "#AAFF00";

// ─── Radial score ring ────────────────────────────────────────────────────────

function ScoreRing({ score, color, size = 140 }: { score: number; color: string; size?: number }) {
  const r = size / 2 - 12;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke="#1A1A22" strokeWidth={10}
        />
        {/* Fill */}
        <Circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${filled} ${circ}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
        />
      </Svg>
      <View style={StyleSheet.absoluteFillObject as any}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 38, fontWeight: "900", color, letterSpacing: -2 }}>{score}</Text>
          <Text style={{ fontSize: 11, color: "#7A7A96", fontWeight: "600", letterSpacing: 0.5 }}>/ 100</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Dimension bar ────────────────────────────────────────────────────────────

function DimBar({ dim, colors }: { dim: ScoreDimension; colors: any }) {
  const statusColors = {
    great: "#AAFF00",
    good: "#00E5A0",
    warning: "#FFBB45",
    critical: "#FF6060",
  };
  const barColor = statusColors[dim.status];

  return (
    <View style={[styles.dimCard, { backgroundColor: colors.surface }]}>
      <View style={styles.dimTop}>
        <Text style={styles.dimIcon}>{dim.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.dimLabel, { color: colors.foreground }]}>{dim.label}</Text>
          <Text style={[styles.dimValue, { color: colors.muted }]}>{dim.value}</Text>
        </View>
        <View style={[styles.dimScoreBadge, { backgroundColor: `${barColor}18` }]}>
          <Text style={[styles.dimScoreText, { color: barColor }]}>{dim.score}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.dimBarBg}>
        <View style={[styles.dimBarFill, { width: `${dim.score}%`, backgroundColor: barColor }]} />
      </View>

      {/* Tip */}
      <Text style={[styles.dimTip, { color: colors.muted }]}>{dim.tip}</Text>

      {/* Weight pill */}
      <Text style={[styles.dimWeight, { color: "#4A4A62" }]}>
        Peso: {Math.round(dim.weight * 100)}%
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ScoreScreen() {
  const colors = useColors();
  const { months, currentMonth, currentYear, settings } = useAppStore();

  const prevMonthKey = useMemo(() => {
    let pm = currentMonth - 1, py = currentYear;
    if (pm === 0) { pm = 12; py -= 1; }
    return { month: pm, year: py };
  }, [currentMonth, currentYear]);

  const scoreData = useMemo(
    () => calculateScore(months, currentMonth, currentYear, settings, prevMonthKey.month, prevMonthKey.year),
    [months, currentMonth, currentYear, settings, prevMonthKey]
  );

  const trendIcon = scoreData.trend === "up" ? "↑" : scoreData.trend === "down" ? "↓" : "→";
  const trendColor = scoreData.trend === "up" ? "#00E5A0" : scoreData.trend === "down" ? "#FF6060" : "#7A7A96";

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: NEON, fontSize: 15 }}>← Voltar</Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Score Financeiro</Text>
          <Text style={[styles.sub, { color: colors.muted }]}>
            Análise em 6 dimensões do seu perfil financeiro
          </Text>
        </View>

        {/* Main score circle */}
        <View style={[styles.scoreCard, { backgroundColor: colors.surface }]}>
          <ScoreRing score={scoreData.total} color={scoreData.color} />

          <View style={styles.scoreInfo}>
            <View style={[styles.labelBadge, { backgroundColor: `${scoreData.color}18` }]}>
              <Text style={[styles.labelText, { color: scoreData.color }]}>{scoreData.label}</Text>
            </View>

            {scoreData.prevTotal != null && (
              <View style={styles.trendRow}>
                <Text style={[styles.trendText, { color: trendColor }]}>
                  {trendIcon} {Math.abs(scoreData.total - scoreData.prevTotal)} pts vs mês anterior
                </Text>
              </View>
            )}

            <Text style={[styles.scoreDesc, { color: colors.muted }]}>
              {scoreData.total >= 80
                ? "Sua saúde financeira está excelente. Continue assim!"
                : scoreData.total >= 60
                ? "Bom progresso. Foque nas dimensões com menor pontuação."
                : scoreData.total >= 40
                ? "Atenção necessária. Revise suas finanças nas áreas críticas."
                : "Situação crítica. Tome ação imediata nas áreas vermelhas."}
            </Text>
          </View>
        </View>

        {/* Dimensions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>DETALHAMENTO POR DIMENSÃO</Text>
          {scoreData.dimensions.map((dim) => (
            <DimBar key={dim.key} dim={dim} colors={colors} />
          ))}
        </View>

        {/* How score is calculated */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>Como é calculado?</Text>
          <Text style={[styles.infoText, { color: colors.muted }]}>
            O score combina 5 dimensões com pesos diferentes:{"\n\n"}
            📊 Controle de Gastos (30%) — razão despesa/renda{"\n"}
            💰 Poupança Regular (25%) — frequência de reservas{"\n"}
            🛡️ Fundo de Emergência (20%) — meses cobertos{"\n"}
            🌱 Diversificação (15%) — fontes de renda{"\n"}
            ✅ Adimplência (10%) — fixas pagas em dia
          </Text>
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: "900", letterSpacing: -1, marginTop: 12 },
  sub: { fontSize: 13, marginTop: 4 },
  scoreCard: { marginHorizontal: 16, marginBottom: 20, borderRadius: 20, padding: 24, alignItems: "center", gap: 16 },
  scoreInfo: { alignItems: "center", gap: 10 },
  labelBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  labelText: { fontSize: 16, fontWeight: "900", letterSpacing: 0.5 },
  trendRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  trendText: { fontSize: 13, fontWeight: "700" },
  scoreDesc: { fontSize: 13, textAlign: "center", lineHeight: 19, maxWidth: 280 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 10, fontWeight: "700", letterSpacing: 2, paddingHorizontal: 20, marginBottom: 10 },
  dimCard: { marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 14 },
  dimTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  dimIcon: { fontSize: 22 },
  dimLabel: { fontSize: 14, fontWeight: "700", marginBottom: 1 },
  dimValue: { fontSize: 12 },
  dimScoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, minWidth: 42, alignItems: "center" },
  dimScoreText: { fontSize: 16, fontWeight: "900" },
  dimBarBg: { height: 5, backgroundColor: "#1A1A22", borderRadius: 3, overflow: "hidden", marginBottom: 10 },
  dimBarFill: { height: 5, borderRadius: 3 },
  dimTip: { fontSize: 12, lineHeight: 17, marginBottom: 6 },
  dimWeight: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },
  infoCard: { marginHorizontal: 16, borderRadius: 14, padding: 16, marginBottom: 16 },
  infoTitle: { fontSize: 14, fontWeight: "700", marginBottom: 10 },
  infoText: { fontSize: 12, lineHeight: 20 },
});
