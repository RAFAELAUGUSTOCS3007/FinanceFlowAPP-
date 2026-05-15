/**
 * app/budgets.tsx
 * Tela de Orçamento por Categoria — Envelope Method
 * Acessível via modal ou aba futura
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { ProgressBar } from "@/components/progress-bar";
import { useAppStore } from "@/lib/store/index";
import { useMonthData, useFinanceSummary } from "@/lib/store/selectors";
import { useColors } from "@/hooks/use-colors";
import { formatCurrency, CATEGORIES, type TransactionCategory } from "@/lib/finance-context";
import { router } from "expo-router";

const NEON = "#AAFF00";
const NEON_DIM = "rgba(170,255,0,0.12)";

// ─── Envelope Card ────────────────────────────────────────────────────────────

const EnvelopeCard = React.memo(function EnvelopeCard({
  category, limit, spent, onEdit, colors,
}: {
  category: TransactionCategory;
  limit: number;
  spent: number;
  onEdit: () => void;
  colors: any;
}) {
  const progress = limit > 0 ? Math.min(spent / limit, 1) : 0;
  const remaining = Math.max(0, limit - spent);
  const isOver = spent > limit;
  const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;

  const barColor = isOver ? "#FF6060" : pct >= 80 ? "#FFBB45" : NEON;

  return (
    <Pressable
      onPress={onEdit}
      style={({ pressed }) => [styles.envelopeCard, { backgroundColor: colors.surface, opacity: pressed ? 0.88 : 1 }]}
    >
      <View style={styles.envelopeTop}>
        <Text style={styles.envelopeIcon}>{category.split(" ")[0]}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.envelopeName, { color: colors.foreground }]}>
            {category.replace(/^\p{Emoji}\s*/u, "")}
          </Text>
          <Text style={[styles.envelopeLimit, { color: colors.muted }]}>
            Limite: {formatCurrency(limit)}
          </Text>
        </View>
        <View style={[styles.pctBadge, { backgroundColor: isOver ? "rgba(255,96,96,0.15)" : pct >= 80 ? "rgba(255,187,69,0.15)" : NEON_DIM }]}>
          <Text style={[styles.pctText, { color: barColor }]}>{pct}%</Text>
        </View>
      </View>

      <ProgressBar progress={progress} color={barColor} backgroundColor={colors.border} height={6} />

      <View style={styles.envelopeBottom}>
        <Text style={[styles.envelopeSpent, { color: colors.muted }]}>
          Gasto: <Text style={{ color: isOver ? "#FF6060" : colors.foreground, fontWeight: "700" }}>
            {formatCurrency(spent)}
          </Text>
        </Text>
        <Text style={[styles.envelopeRemain, { color: isOver ? "#FF6060" : "#00E5A0" }]}>
          {isOver ? `Excedeu: ${formatCurrency(spent - limit)}` : `Restam: ${formatCurrency(remaining)}`}
        </Text>
      </View>
    </Pressable>
  );
});

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────

function BudgetModal({
  visible,
  category,
  currentLimit,
  onSave,
  onRemove,
  onClose,
}: {
  visible: boolean;
  category: TransactionCategory | null;
  currentLimit: number;
  onSave: (limit: number) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const [value, setValue] = useState(currentLimit > 0 ? currentLimit.toFixed(2).replace(".", ",") : "");

  const handleSave = () => {
    const num = parseFloat(value.replace(",", "."));
    if (isNaN(num) || num <= 0) return;
    onSave(num);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalIcon}>{category?.split(" ")[0] ?? "📊"}</Text>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            {category?.replace(/^\p{Emoji}\s*/u, "") ?? ""}
          </Text>
          <Text style={[styles.modalSub, { color: colors.muted }]}>
            Defina o limite mensal para esta categoria
          </Text>

          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="0,00"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            autoFocus
            style={[styles.input, {
              backgroundColor: colors.background,
              color: colors.foreground,
              borderColor: colors.border,
            }]}
          />

          <View style={styles.modalActions}>
            {currentLimit > 0 && (
              <Pressable onPress={onRemove} style={[styles.removeBtn, { borderColor: "#FF6060" }]}>
                <Text style={{ color: "#FF6060", fontWeight: "700" }}>Remover</Text>
              </Pressable>
            )}
            <Pressable onPress={onClose} style={[styles.cancelBtn, { borderColor: colors.border }]}>
              <Text style={{ color: colors.muted, fontWeight: "700" }}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={handleSave} style={styles.saveBtn}>
              <Text style={{ color: "#0A0A0F", fontWeight: "900", letterSpacing: 1 }}>SALVAR</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BudgetsScreen() {
  const colors = useColors();
  const { currentMonth, currentYear, setBudget, removeBudget, copyBudgetsFromPrevMonth, getBudgetsForMonth } = useAppStore();
  const monthData = useMonthData();
  const summary = useFinanceSummary();

  const [editCategory, setEditCategory] = useState<TransactionCategory | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const budgetsThisMonth = useMemo(
    () => getBudgetsForMonth(currentMonth, currentYear),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentMonth, currentYear, useAppStore.getState().budgets]
  );

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of monthData?.variableExpenses ?? []) {
      map[e.category] = (map[e.category] ?? 0) + e.value;
    }
    return map;
  }, [monthData]);

  const configuredCategories = useMemo(
    () => budgetsThisMonth.map((b) => b.category),
    [budgetsThisMonth]
  );

  const unconfiguredWithSpend = useMemo(
    () =>
      Object.entries(spentByCategory)
        .filter(([cat]) => !configuredCategories.includes(cat as TransactionCategory))
        .sort(([, a], [, b]) => b - a),
    [spentByCategory, configuredCategories]
  );

  const openEdit = useCallback((cat: TransactionCategory) => {
    setEditCategory(cat);
    setModalVisible(true);
  }, []);

  const handleSave = useCallback(
    (limit: number) => {
      if (!editCategory) return;
      setBudget(editCategory, limit, currentMonth, currentYear);
      setModalVisible(false);
    },
    [editCategory, setBudget, currentMonth, currentYear]
  );

  const handleRemove = useCallback(() => {
    if (!editCategory) return;
    removeBudget(editCategory, currentMonth, currentYear);
    setModalVisible(false);
  }, [editCategory, removeBudget, currentMonth, currentYear]);

  const handleCopyPrev = useCallback(() => {
    Alert.alert(
      "Copiar orçamento",
      "Copiar os limites do mês anterior para este mês?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Copiar", onPress: () => copyBudgetsFromPrevMonth(currentMonth, currentYear) },
      ]
    );
  }, [copyBudgetsFromPrevMonth, currentMonth, currentYear]);

  const totalBudgeted = useMemo(() => budgetsThisMonth.reduce((s, b) => s + b.limitAmount, 0), [budgetsThisMonth]);
  const totalOverBudget = useMemo(
    () =>
      budgetsThisMonth.reduce((s, b) => {
        const spent = spentByCategory[b.category] ?? 0;
        return s + Math.max(0, spent - b.limitAmount);
      }, 0),
    [budgetsThisMonth, spentByCategory]
  );

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={{ color: NEON, fontSize: 16 }}>← Voltar</Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Orçamento</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Envelope Method — defina limites por categoria
          </Text>
        </View>

        {/* Summary bar */}
        {budgetsThisMonth.length > 0 && (
          <View style={[styles.summaryBar, { backgroundColor: colors.surface }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Orçado</Text>
              <Text style={[styles.summaryValue, { color: NEON }]}>{formatCurrency(totalBudgeted)}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Gasto</Text>
              <Text style={[styles.summaryValue, { color: "#FF6060" }]}>{formatCurrency(summary.totalVariable)}</Text>
            </View>
            {totalOverBudget > 0 && (
              <>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: colors.muted }]}>Excesso</Text>
                  <Text style={[styles.summaryValue, { color: "#FF6060" }]}>{formatCurrency(totalOverBudget)}</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Copy from prev month */}
        <Pressable onPress={handleCopyPrev} style={[styles.copyBtn, { borderColor: colors.border }]}>
          <Text style={{ color: NEON, fontWeight: "700", fontSize: 13 }}>📋 Copiar orçamento do mês anterior</Text>
        </Pressable>

        {/* Configured envelopes */}
        {budgetsThisMonth.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.muted }]}>ENVELOPES CONFIGURADOS</Text>
            {budgetsThisMonth.map((b) => (
              <EnvelopeCard
                key={b.category}
                category={b.category}
                limit={b.limitAmount}
                spent={spentByCategory[b.category] ?? 0}
                onEdit={() => openEdit(b.category)}
                colors={colors}
              />
            ))}
          </View>
        )}

        {/* Categories with spending but no budget */}
        {unconfiguredWithSpend.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.muted }]}>SEM ORÇAMENTO DEFINIDO</Text>
            {unconfiguredWithSpend.map(([cat, spent]) => (
              <Pressable
                key={cat}
                onPress={() => openEdit(cat as TransactionCategory)}
                style={[styles.unconfiguredRow, { borderColor: colors.border }]}
              >
                <Text style={styles.envelopeIcon}>{cat.split(" ")[0]}</Text>
                <Text style={[styles.envelopeName, { color: colors.foreground, flex: 1 }]}>
                  {cat.replace(/^\p{Emoji}\s*/u, "")}
                </Text>
                <Text style={{ color: "#FF6060", fontWeight: "700", fontSize: 14 }}>
                  {formatCurrency(spent)}
                </Text>
                <Text style={{ color: NEON, fontWeight: "700", fontSize: 12, marginLeft: 8 }}>
                  + Definir →
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* All categories to add */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>ADICIONAR CATEGORIAS</Text>
          <View style={styles.categoryGrid}>
            {(CATEGORIES as unknown as TransactionCategory[])
              .filter((c) => !configuredCategories.includes(c))
              .map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => openEdit(cat)}
                  style={[styles.categoryChip, { borderColor: colors.border }]}
                >
                  <Text style={{ fontSize: 16 }}>{cat.split(" ")[0]}</Text>
                  <Text style={[styles.categoryChipText, { color: colors.muted }]}>
                    {cat.replace(/^\p{Emoji}\s*/u, "")}
                  </Text>
                </Pressable>
              ))}
          </View>
        </View>
      </ScrollView>

      <BudgetModal
        visible={modalVisible}
        category={editCategory}
        currentLimit={editCategory ? (budgetsThisMonth.find((b) => b.category === editCategory)?.limitAmount ?? 0) : 0}
        onSave={handleSave}
        onRemove={handleRemove}
        onClose={() => setModalVisible(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  backBtn: { marginBottom: 12 },
  title: { fontSize: 26, fontWeight: "900", letterSpacing: -1 },
  subtitle: { fontSize: 13, marginTop: 4 },
  summaryBar: { flexDirection: "row", marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 14 },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 },
  summaryValue: { fontSize: 16, fontWeight: "900", letterSpacing: -0.5 },
  summaryDivider: { width: 1, marginVertical: 4 },
  copyBtn: { marginHorizontal: 16, marginBottom: 16, borderWidth: 1, borderRadius: 10, padding: 12, alignItems: "center" },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 10, fontWeight: "700", letterSpacing: 2, marginHorizontal: 20, marginBottom: 8 },
  envelopeCard: { marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14 },
  envelopeTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  envelopeIcon: { fontSize: 22 },
  envelopeName: { fontSize: 14, fontWeight: "700" },
  envelopeLimit: { fontSize: 11, marginTop: 1 },
  pctBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  pctText: { fontSize: 12, fontWeight: "900" },
  envelopeBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  envelopeSpent: { fontSize: 12 },
  envelopeRemain: { fontSize: 12, fontWeight: "700" },
  unconfiguredRow: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginBottom: 6, borderWidth: 1, borderRadius: 10, padding: 12 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16 },
  categoryChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  categoryChipText: { fontSize: 12, fontWeight: "500" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modal: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 16 },
  modalIcon: { fontSize: 40, textAlign: "center", marginBottom: 6 },
  modalTitle: { fontSize: 20, fontWeight: "900", textAlign: "center" },
  modalSub: { fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: 20 },
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, fontSize: 28, textAlign: "center", fontWeight: "700", marginBottom: 4 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  removeBtn: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  saveBtn: { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: "center", backgroundColor: "#AAFF00" },
});
