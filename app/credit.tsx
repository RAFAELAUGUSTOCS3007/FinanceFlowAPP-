import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenContainer } from "@/components/screen-container";
import { ProgressBar } from "@/components/progress-bar";
import { useFinance, formatCurrency, MONTH_NAMES } from "@/lib/finance-context";
import { useColors } from "@/hooks/use-colors";
import { router } from "expo-router";

export default function CreditScreen() {
  const { state, dispatch, currentMonthData, generateId } = useFinance();
  const colors = useColors();
  const [editLimitModal, setEditLimitModal] = useState(false);
  const [newLimit, setNewLimit] = useState(state.settings.creditLimit?.toString() ?? "");

  // Credit expenses = variable expenses paid with "Crédito"
  const creditExpenses = (currentMonthData?.variableExpenses ?? []).filter(
    (e) => e.paymentMethod === "Crédito"
  );
  const fixedCreditExpenses = (currentMonthData?.fixedExpenses ?? []).filter(
    (e) => (e as any).paymentMethod === "Crédito" && e.isPaid
  );

  const totalCreditUsed = creditExpenses.reduce((s, e) => s + e.value, 0);
  const creditLimit = state.settings.creditLimit ?? 5000;
  const creditAvailable = creditLimit - totalCreditUsed;
  const usageRatio = creditLimit > 0 ? totalCreditUsed / creditLimit : 0;

  const usageColor =
    usageRatio >= 0.9 ? colors.error : usageRatio >= 0.7 ? colors.warning : "#22C55E";

  const handleSaveLimit = () => {
    const val = parseFloat(newLimit.replace(",", "."));
    if (isNaN(val) || val <= 0) {
      Alert.alert("Valor inválido", "Informe um limite válido.");
      return;
    }
    dispatch({ type: "UPDATE_SETTINGS", payload: { creditLimit: val } });
    setEditLimitModal(false);
  };

  const monthName = MONTH_NAMES[state.currentMonth - 1];

  return (
    <ScreenContainer containerClassName="bg-background" edges={["left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <LinearGradient
          colors={["#1A2E4A", "#1A3A6E", "#1A73E8"]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerTop}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={styles.backBtn}>← Voltar</Text>
            </Pressable>
            <Pressable
              onPress={() => { setNewLimit(creditLimit.toString()); setEditLimitModal(true); }}
              style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={styles.editBtnText}>✏️ Editar Limite</Text>
            </Pressable>
          </View>

          {/* Card visual */}
          <View style={styles.cardVisual}>
            <View style={styles.cardChip} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>Limite Total</Text>
              <Text style={styles.cardLimit}>{formatCurrency(creditLimit)}</Text>
            </View>
            <Text style={styles.cardBrand}>💳 Crédito</Text>
          </View>
        </LinearGradient>

        {/* Usage Summary */}
        <View style={[styles.usageCard, { backgroundColor: colors.surface }]}>
          <View style={styles.usageRow}>
            <View style={styles.usageItem}>
              <Text style={[styles.usageLabel, { color: colors.muted }]}>Utilizado</Text>
              <Text style={[styles.usageValue, { color: colors.error }]}>
                {formatCurrency(totalCreditUsed)}
              </Text>
            </View>
            <View style={[styles.usageDivider, { backgroundColor: colors.border }]} />
            <View style={styles.usageItem}>
              <Text style={[styles.usageLabel, { color: colors.muted }]}>Disponível</Text>
              <Text style={[styles.usageValue, { color: "#22C55E" }]}>
                {formatCurrency(Math.max(0, creditAvailable))}
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 16 }}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: colors.muted }]}>
                {Math.round(usageRatio * 100)}% do limite utilizado
              </Text>
              {usageRatio >= 0.7 && (
                <Text style={{ fontSize: 12, color: usageColor }}>
                  {usageRatio >= 0.9 ? "⚠️ Limite crítico!" : "⚠️ Atenção"}
                </Text>
              )}
            </View>
            <ProgressBar
              progress={Math.min(usageRatio, 1)}
              color={usageColor}
              backgroundColor={colors.border}
              height={12}
            />
          </View>
        </View>

        {/* Month label */}
        <View style={[styles.sectionHeader, { paddingHorizontal: 20, marginTop: 20 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Gastos no Crédito — {monthName}
          </Text>
          <Text style={[styles.sectionCount, { color: colors.muted }]}>
            {creditExpenses.length} transações
          </Text>
        </View>

        {/* Credit transactions */}
        {creditExpenses.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: 32 }}>💳</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Nenhum gasto no crédito este mês
            </Text>
          </View>
        ) : (
          <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
            {creditExpenses
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((expense, index) => (
                <View
                  key={expense.id}
                  style={[
                    styles.expenseItem,
                    { borderColor: colors.border },
                    index === creditExpenses.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={styles.expenseLeft}>
                    <Text style={styles.expenseEmoji}>{expense.category.split(" ")[0]}</Text>
                    <View>
                      <Text style={[styles.expenseCategory, { color: colors.foreground }]}>
                        {expense.category}
                      </Text>
                      <Text style={[styles.expenseDate, { color: colors.muted }]}>
                        {expense.date.split("-").reverse().join("/")}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.expenseValue, { color: colors.error }]}>
                    -{formatCurrency(expense.value)}
                  </Text>
                </View>
              ))}
          </View>
        )}

        {/* Monthly history */}
        <View style={[styles.sectionHeader, { paddingHorizontal: 20, marginTop: 20 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Histórico Mensal</Text>
        </View>
        <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
          {state.months
            .slice()
            .sort((a, b) => {
              if (a.year !== b.year) return b.year - a.year;
              return b.month - a.month;
            })
            .slice(0, 6)
            .map((m, index, arr) => {
              const mCredit = m.variableExpenses
                .filter((e) => e.paymentMethod === "Crédito")
                .reduce((s, e) => s + e.value, 0);
              const isCurrentMonth = m.month === state.currentMonth && m.year === state.currentYear;
              return (
                <View
                  key={`${m.year}-${m.month}`}
                  style={[
                    styles.historyItem,
                    { borderColor: colors.border },
                    index === arr.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={styles.historyLeft}>
                    <Text style={[styles.historyMonth, { color: colors.foreground }]}>
                      {MONTH_NAMES[m.month - 1].substring(0, 3)} {m.year}
                    </Text>
                    {isCurrentMonth && (
                      <View style={[styles.currentBadge, { backgroundColor: colors.primary + "20" }]}>
                        <Text style={[styles.currentBadgeText, { color: colors.primary }]}>atual</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={[styles.historyValue, { color: mCredit > 0 ? colors.error : colors.muted }]}>
                      {mCredit > 0 ? `-${formatCurrency(mCredit)}` : "R$ 0,00"}
                    </Text>
                    {creditLimit > 0 && mCredit > 0 && (
                      <Text style={[styles.historyPct, { color: colors.muted }]}>
                        {Math.round((mCredit / creditLimit) * 100)}% do limite
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
        </View>
      </ScrollView>

      {/* Edit Limit Modal */}
      <Modal visible={editLimitModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Editar Limite de Crédito</Text>
            <TextInput
              value={newLimit}
              onChangeText={setNewLimit}
              keyboardType="decimal-pad"
              placeholder="Ex: 5000"
              placeholderTextColor={colors.muted}
              style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
            />
            <View style={styles.modalBtns}>
              <Pressable
                onPress={() => setEditLimitModal(false)}
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
              >
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveLimit}
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Salvar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 20,
    gap: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    fontWeight: "600",
  },
  editBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  cardVisual: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    gap: 12,
  },
  cardChip: {
    width: 36,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#FFBB45",
  },
  cardInfo: {
    gap: 4,
  },
  cardLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  cardLimit: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  cardBrand: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    textAlign: "right",
  },
  usageCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
  },
  usageRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  usageItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  usageDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 16,
  },
  usageLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  usageValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionCount: {
    fontSize: 13,
  },
  emptyCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
  listCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: "hidden",
  },
  expenseItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  expenseLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  expenseEmoji: {
    fontSize: 24,
  },
  expenseCategory: {
    fontSize: 14,
    fontWeight: "500",
  },
  expenseDate: {
    fontSize: 12,
    marginTop: 2,
  },
  expenseValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyMonth: {
    fontSize: 14,
    fontWeight: "600",
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  historyRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  historyValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  historyPct: {
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalBtns: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
});
