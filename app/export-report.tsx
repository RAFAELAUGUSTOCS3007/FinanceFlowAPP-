/**
 * app/export-report.tsx — Fase 3 refactor
 * Exportação nativa CSV e PDF com filtros de período e preview de dados
 */
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useFinance, MONTH_NAMES, formatCurrency } from "@/lib/finance-context";
import { useColors } from "@/hooks/use-colors";
import { router } from "expo-router";
import {
  exportToCSV,
  exportToPDF,
  filterMonths,
  periodLabel,
  getExportStats,
  type ExportPeriod,
} from "@/lib/export";

const NEON = "#AAFF00";
const NEON_DIM = "rgba(170,255,0,0.10)";

type ExportFormat = "pdf" | "csv";

const PERIODS: { key: ExportPeriod; label: string; desc: string }[] = [
  { key: "current", label: "Mês atual", desc: "Apenas o mês selecionado" },
  { key: "quarter", label: "Trimestre", desc: "3 meses do trimestre atual" },
  { key: "year", label: "Ano inteiro", desc: `Todos os meses do ano` },
  { key: "all", label: "Completo", desc: "Todos os dados disponíveis" },
];

const FORMATS: { key: ExportFormat; icon: string; label: string; desc: string }[] = [
  { key: "pdf", icon: "📄", label: "PDF", desc: "Relatório visual com gráficos" },
  { key: "csv", icon: "📊", label: "CSV / Excel", desc: "Planilha com todos os dados" },
];

export default function ExportReportScreen() {
  const { state, currentMonthData, totalIncome, totalVariableExpenses,
          totalFixedExpenses, totalFixedExpensesPaid, totalReservations, availableBalance } = useFinance();
  const colors = useColors();
  const [period, setPeriod] = useState<ExportPeriod>("current");
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [loading, setLoading] = useState(false);

  const selectedMonths = useMemo(
    () => filterMonths(state.months, period, state.currentMonth, state.currentYear),
    [state.months, period, state.currentMonth, state.currentYear]
  );

  const stats = useMemo(() => getExportStats(selectedMonths), [selectedMonths]);
  const label = useMemo(
    () => periodLabel(period, state.currentMonth, state.currentYear),
    [period, state.currentMonth, state.currentYear]
  );

  // Summary totals for preview
  const preview = useMemo(() => {
    const income = selectedMonths.reduce((s, m) => s + m.incomes.reduce((a, i) => a + i.value, 0), 0);
    const variable = selectedMonths.reduce((s, m) => s + m.variableExpenses.reduce((a, e) => a + e.value, 0), 0);
    const fixed = selectedMonths.reduce((s, m) => s + m.fixedExpenses.filter((f) => f.isPaid).reduce((a, f) => a + (f.actualValue ?? f.plannedValue), 0), 0);
    const reservations = selectedMonths.reduce((s, m) => s + m.reservations.reduce((a, r) => a + r.value, 0), 0);
    return { income, expenses: variable + fixed, reservations, balance: income - variable - fixed - reservations };
  }, [selectedMonths]);

  const handleExport = async () => {
    if (selectedMonths.length === 0) {
      Alert.alert("Sem dados", "Não há dados no período selecionado.");
      return;
    }
    setLoading(true);
    try {
      if (format === "csv") {
        await exportToCSV(selectedMonths, label);
      } else {
        await exportToPDF(selectedMonths, label, state.settings.name, {
          emergencyFundTarget: state.settings.emergencyFundTarget,
          goalTarget: state.settings.goalTarget,
          goalName: state.settings.goalName,
        });
      }
    } catch (e: any) {
      Alert.alert("Erro ao exportar", e?.message ?? "Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: NEON, fontSize: 15 }}>← Voltar</Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Exportar Dados</Text>
          <Text style={[styles.sub, { color: colors.muted }]}>
            Salve seus dados como PDF ou planilha CSV
          </Text>
        </View>

        {/* Period selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>PERÍODO</Text>
          <View style={styles.optionGrid}>
            {PERIODS.map((p) => {
              const active = period === p.key;
              return (
                <Pressable
                  key={p.key}
                  onPress={() => setPeriod(p.key)}
                  style={[
                    styles.optionCard,
                    { backgroundColor: active ? NEON_DIM : colors.surface,
                      borderColor: active ? NEON : colors.border },
                  ]}
                >
                  <Text style={[styles.optionLabel, { color: active ? NEON : colors.foreground }]}>
                    {p.label}
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.muted }]}>{p.desc}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Format selector */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>FORMATO</Text>
          <View style={styles.formatRow}>
            {FORMATS.map((f) => {
              const active = format === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setFormat(f.key)}
                  style={[
                    styles.formatCard,
                    { backgroundColor: active ? NEON_DIM : colors.surface,
                      borderColor: active ? NEON : colors.border },
                  ]}
                >
                  <Text style={styles.formatIcon}>{f.icon}</Text>
                  <Text style={[styles.formatLabel, { color: active ? NEON : colors.foreground }]}>
                    {f.label}
                  </Text>
                  <Text style={[styles.formatDesc, { color: colors.muted }]}>{f.desc}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Preview */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>PREVIEW — {label}</Text>
          <View style={[styles.previewCard, { backgroundColor: colors.surface }]}>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: NEON }]}>{stats.monthCount}</Text>
                <Text style={[styles.statLbl, { color: colors.muted }]}>Meses</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: "#00E5A0" }]}>{stats.incomeCount}</Text>
                <Text style={[styles.statLbl, { color: colors.muted }]}>Entradas</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: "#FF6060" }]}>{stats.transactionCount}</Text>
                <Text style={[styles.statLbl, { color: colors.muted }]}>Despesas</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statVal, { color: "#FFBB45" }]}>{stats.fixedCount}</Text>
                <Text style={[styles.statLbl, { color: colors.muted }]}>Fixas</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Financial summary */}
            <View style={styles.summaryRows}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>Total de entradas</Text>
                <Text style={[styles.summaryVal, { color: "#00E5A0" }]}>{formatCurrency(preview.income)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>Total de despesas</Text>
                <Text style={[styles.summaryVal, { color: "#FF6060" }]}>{formatCurrency(preview.expenses)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>Total reservado</Text>
                <Text style={[styles.summaryVal, { color: "#C084FC" }]}>{formatCurrency(preview.reservations)}</Text>
              </View>
              <View style={[styles.summaryRow, { marginTop: 4 }]}>
                <Text style={[styles.summaryLabel, { color: colors.foreground, fontWeight: "700" }]}>Saldo líquido</Text>
                <Text style={[styles.summaryVal, { color: preview.balance >= 0 ? NEON : "#FF6060", fontSize: 16 }]}>
                  {formatCurrency(preview.balance)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* What's included note */}
        <View style={[styles.noteCard, { backgroundColor: "rgba(170,255,0,0.06)", borderColor: "rgba(170,255,0,0.15)" }]}>
          <Text style={{ color: NEON, fontWeight: "700", fontSize: 12, marginBottom: 6 }}>
            📋 O que será incluído:
          </Text>
          {format === "pdf" ? (
            <>
              <Text style={[styles.noteItem, { color: colors.muted }]}>• Resumo financeiro com KPIs</Text>
              <Text style={[styles.noteItem, { color: colors.muted }]}>• Evolução mês a mês</Text>
              <Text style={[styles.noteItem, { color: colors.muted }]}>• Top categorias de gasto</Text>
              <Text style={[styles.noteItem, { color: colors.muted }]}>• Design dark mode profissional</Text>
            </>
          ) : (
            <>
              <Text style={[styles.noteItem, { color: colors.muted }]}>• Aba: Resumo por mês</Text>
              <Text style={[styles.noteItem, { color: colors.muted }]}>• Aba: Todas as entradas</Text>
              <Text style={[styles.noteItem, { color: colors.muted }]}>• Aba: Despesas variáveis</Text>
              <Text style={[styles.noteItem, { color: colors.muted }]}>• Aba: Despesas fixas</Text>
              <Text style={[styles.noteItem, { color: colors.muted }]}>• Aba: Reservas e metas</Text>
            </>
          )}
        </View>

      </ScrollView>

      {/* Export button */}
      <View style={[styles.footer, { backgroundColor: colors.background }]}>
        <Pressable
          onPress={handleExport}
          disabled={loading}
          style={({ pressed }) => [
            styles.exportBtn,
            { opacity: pressed || loading ? 0.8 : 1 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#0A0A0F" />
          ) : (
            <Text style={styles.exportBtnText}>
              {format === "pdf" ? "📄" : "📊"} EXPORTAR {format.toUpperCase()} — {label}
            </Text>
          )}
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: "900", letterSpacing: -1, marginTop: 12 },
  sub: { fontSize: 13, marginTop: 4, marginBottom: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 10, fontWeight: "700", letterSpacing: 2, paddingHorizontal: 20, marginBottom: 10 },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16 },
  optionCard: { width: "47%", borderWidth: 1.5, borderRadius: 12, padding: 12 },
  optionLabel: { fontSize: 14, fontWeight: "700", marginBottom: 3 },
  optionDesc: { fontSize: 11 },
  formatRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16 },
  formatCard: { flex: 1, borderWidth: 1.5, borderRadius: 14, padding: 16, alignItems: "center" },
  formatIcon: { fontSize: 28, marginBottom: 6 },
  formatLabel: { fontSize: 15, fontWeight: "900", marginBottom: 3 },
  formatDesc: { fontSize: 11, textAlign: "center" },
  previewCard: { marginHorizontal: 16, borderRadius: 16, padding: 16 },
  statsRow: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center" },
  statVal: { fontSize: 22, fontWeight: "900", letterSpacing: -1 },
  statLbl: { fontSize: 10, fontWeight: "600", marginTop: 2 },
  statDivider: { width: 1, height: 36 },
  divider: { height: 1, marginVertical: 14 },
  summaryRows: { gap: 8 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 13 },
  summaryVal: { fontSize: 14, fontWeight: "700" },
  noteCard: { marginHorizontal: 16, marginBottom: 16, borderWidth: 1, borderRadius: 12, padding: 14 },
  noteItem: { fontSize: 12, marginBottom: 3, lineHeight: 18 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32 },
  exportBtn: { backgroundColor: NEON, borderRadius: 14, padding: 16, alignItems: "center" },
  exportBtnText: { color: "#0A0A0F", fontWeight: "900", fontSize: 14, letterSpacing: 1 },
});
