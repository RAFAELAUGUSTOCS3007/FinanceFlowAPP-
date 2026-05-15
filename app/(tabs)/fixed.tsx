import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { ScreenContainer } from "@/components/screen-container";
import { MoneyText } from "@/components/money-text";
import { ProgressBar } from "@/components/progress-bar";
import { MonthSelector } from "@/components/month-selector";
import { useFinance, formatCurrency, type FixedExpense } from "@/lib/finance-context";
import { useColors } from "@/hooks/use-colors";
import type { ThemeColorPalette } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { buildRecurrenceSuggestions, shouldSuggestRecurrence, getPrevMonthKey } from "@/lib/recurrence";

// ─── Swipeable Fixed Expense Row ──────────────────────────────────────────────

const FixedRow = React.memo(function FixedRow({ item, onToggle, onEdit, onDelete, colors }: { item, onToggle, onEdit, onDelete: any; colors: ThemeColorPalette }) {
  const swipeRef = useRef<Swipeable>(null);

  const renderRightActions = useCallback((progress: Animated.AnimatedInterpolation<number>) => {
    const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
    return (
      <Animated.View style={[styles.swipeActions, { transform: [{ translateX }] }]}>
        <Pressable onPress={() => { swipeRef.current?.close(); onDelete(item.id); }} style={[styles.swipeBtn, { backgroundColor: "#EF4444" }]}>
          <Text style={styles.swipeBtnText}>🗑️</Text>
          <Text style={styles.swipeBtnLabel}>Excluir</Text>
        </Pressable>
      </Animated.View>
    );
  }, [item.id, onDelete]);

  // Color coding
  const accent = item.isPaid ? colors.income : item.plannedValue >= 500 ? colors.expense : colors.warning;

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false} friction={2}>
      <Pressable onPress={() => onEdit(item)} style={({ pressed }) => [styles.expenseCard, { backgroundColor: colors.surface, opacity: pressed ? 0.9 : 1 }]}>
        {/* Left accent */}
        <View style={[styles.cardAccent, { backgroundColor: item.isPaid ? colors.income : colors.border }]} />

        {/* Checkbox */}
        <Pressable onPress={() => onToggle(item)} style={({ pressed }) => [styles.checkbox, {
          borderColor: item.isPaid ? colors.income : colors.border,
          backgroundColor: item.isPaid ? colors.income : "transparent",
          opacity: pressed ? 0.7 : 1,
        }]}>
          {item.isPaid && <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "800" }}>✓</Text>}
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={[styles.expenseName, { color: colors.foreground, textDecorationLine: item.isPaid ? "line-through" : "none", opacity: item.isPaid ? 0.6 : 1 }]}>
            {item.name}
          </Text>
          {item.isPaid && item.paidDate && (
            <Text style={[styles.paidDate, { color: colors.income }]}>✓ Pago em {item.paidDate.split("-").reverse().join("/")}</Text>
          )}
          {!item.isPaid && (
            <Text style={[styles.paidDate, { color: colors.muted }]}>Pendente · toque para marcar</Text>
          )}
        </View>

        <View style={{ alignItems: "flex-end", minWidth: 72 }}>
          {item.isPaid && item.actualValue !== undefined && item.actualValue !== item.plannedValue ? (
            <>
              <MoneyText value={item.actualValue} style={[styles.actualValue, { color: colors.income }]} />
              <MoneyText value={item.plannedValue} style={[styles.plannedValue, { color: colors.muted }]} />
            </>
          ) : (
            <MoneyText value={item.actualValue ?? item.plannedValue} style={[styles.actualValue, { color: item.isPaid ? colors.income : colors.foreground }]} />
          )}
          {item.actualValue !== undefined && item.actualValue < item.plannedValue && item.isPaid && (
            <Text style={{ fontSize: 10, color: colors.income, marginTop: 2 }}>
              -{formatCurrency(item.plannedValue - item.actualValue)} guardado
            </Text>
          )}
        </View>
      </Pressable>
    </Swipeable>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FixedExpensesScreen() {
  const { state, currentMonthData, totalFixedExpenses, totalFixedExpensesPaid, dispatch, generateId } = useFinance();
  const colors = useColors();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<FixedExpense | null>(null);
  const [formName, setFormName] = useState("");
  const [formPlanned, setFormPlanned] = useState("");
  const [formActual, setFormActual] = useState("");
  const [showRecurrenceBanner, setShowRecurrenceBanner] = useState(true);

  const expenses = useMemo(() => currentMonthData?.fixedExpenses ?? [], [currentMonthData]);
  const unpaid = useMemo(() => expenses.filter((e) => !e.isPaid), [expenses]);
  const paid = useMemo(() => expenses.filter((e) => e.isPaid), [expenses]);
  const paidCount = paid.length;
  const pct = useMemo(() => totalFixedExpenses > 0 ? Math.round((totalFixedExpensesPaid / totalFixedExpenses) * 100) : 0, [totalFixedExpensesPaid, totalFixedExpenses]);
  const sortedExpenses = useMemo(() => [...unpaid, ...paid], [unpaid, paid]);
  const savings = useMemo(() =>
    paid.reduce((s, e) => s + (e.actualValue !== undefined ? Math.max(0, e.plannedValue - e.actualValue) : 0), 0),
    [paid]
  );

  // ── Recorrência automática ─────────────────────────────────────────────────
  const { month: prevMonth, year: prevYear } = getPrevMonthKey(state.currentMonth, state.currentYear);
  const prevMonthData = useMemo(
    () => state.months.find((m) => m.month === prevMonth && m.year === prevYear),
    [state.months, prevMonth, prevYear]
  );

  const recurrenceSuggestions = useMemo(() => {
    if (!prevMonthData || !showRecurrenceBanner) return [];
    if (!shouldSuggestRecurrence(prevMonthData.fixedExpenses, expenses, state.currentMonth, state.currentYear)) return [];
    return buildRecurrenceSuggestions(prevMonthData.fixedExpenses, expenses, state.currentMonth, state.currentYear);
  }, [prevMonthData, expenses, state.currentMonth, state.currentYear, showRecurrenceBanner]);

  const handleAcceptRecurrence = useCallback(() => {
    recurrenceSuggestions.forEach((s) => {
      dispatch({ type: "ADD_FIXED_EXPENSE", payload: s.suggestedExpense });
    });
    setShowRecurrenceBanner(false);
    Alert.alert("✅ Pronto!", `${recurrenceSuggestions.length} despesa(s) adicionada(s) automaticamente.`);
  }, [recurrenceSuggestions, dispatch]);

  const handleTogglePaid = useCallback((item: FixedExpense) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    dispatch({ type: "TOGGLE_FIXED_EXPENSE_PAID", payload: { id: item.id, paidDate: new Date().toISOString().split("T")[0] } });
  }, [dispatch]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert("Excluir despesa", "Tem certeza que deseja excluir esta despesa fixa?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => dispatch({ type: "DELETE_FIXED_EXPENSE", payload: id }) },
    ]);
  }, [dispatch]);

  const openAdd = useCallback(() => { setEditingItem(null); setFormName(""); setFormPlanned(""); setFormActual(""); setShowAddModal(true); }, []);
  const openEdit = useCallback((item: FixedExpense) => { setEditingItem(item); setFormName(item.name); setFormPlanned(item.plannedValue.toString()); setFormActual(item.actualValue?.toString() ?? ""); setShowAddModal(true); }, []);

  const handleSave = useCallback(() => {
    if (!formName.trim() || !formPlanned.trim()) return;
    const plannedValue = parseFloat(formPlanned.replace(",", "."));
    if (isNaN(plannedValue)) return;
    if (editingItem) {
      dispatch({ type: "UPDATE_FIXED_EXPENSE", payload: { ...editingItem, name: formName.trim(), plannedValue, actualValue: formActual ? parseFloat(formActual.replace(",", ".")) : undefined } });
    } else {
      dispatch({ type: "ADD_FIXED_EXPENSE", payload: { id: generateId(), name: formName.trim(), plannedValue, actualValue: formActual ? parseFloat(formActual.replace(",", ".")) : undefined, isPaid: false, month: state.currentMonth, year: state.currentYear } });
    }
    setShowAddModal(false);
  }, [formName, formPlanned, formActual, editingItem, dispatch, generateId, state.currentMonth, state.currentYear]);

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={styles.title}>Despesas Fixas</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{paidCount}/{expenses.length} pagas · {pct}%</Text>
        </View>
        <Pressable onPress={openAdd} style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}>
          <Text style={styles.addBtnText}>+ Adicionar</Text>
        </Pressable>
      </View>

      <View style={{ paddingVertical: 10 }}><MonthSelector /></View>

      {/* ── Sugestão de recorrência automática ── */}
      {recurrenceSuggestions.length > 0 && (
        <View style={[styles.recurrenceBanner, { backgroundColor: "#0A1A00", borderColor: "#AAFF00" }]}>
          <View style={styles.recurrenceHeader}>
            <Text style={{ fontSize: 18 }}>🔁</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#AAFF00", fontWeight: "800", fontSize: 13 }}>
                {recurrenceSuggestions.length} despesa(s) do mês anterior detectadas
              </Text>
              <Text style={{ color: "rgba(170,255,0,0.65)", fontSize: 11, marginTop: 2 }}>
                Quer adicionar automaticamente este mês?
              </Text>
            </View>
          </View>
          <View style={{ marginTop: 6, gap: 3 }}>
            {recurrenceSuggestions.slice(0, 4).map((s) => (
              <Text key={s.id} style={{ color: "rgba(170,255,0,0.8)", fontSize: 11 }}>
                • {s.sourceExpense.name} — {formatCurrency(s.sourceExpense.plannedValue)}
              </Text>
            ))}
            {recurrenceSuggestions.length > 4 && (
              <Text style={{ color: "rgba(170,255,0,0.5)", fontSize: 11 }}>
                + {recurrenceSuggestions.length - 4} outras...
              </Text>
            )}
          </View>
          <View style={styles.recurrenceActions}>
            <Pressable onPress={() => setShowRecurrenceBanner(false)} style={styles.recurrenceDismiss}>
              <Text style={{ color: "rgba(170,255,0,0.55)", fontWeight: "600", fontSize: 12 }}>Ignorar</Text>
            </Pressable>
            <Pressable onPress={handleAcceptRecurrence} style={styles.recurrenceAccept}>
              <Text style={{ color: "#0A0A0F", fontWeight: "900", fontSize: 12, letterSpacing: 0.5 }}>
                ✓ ADICIONAR TODAS
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Progress Card */}
      <View style={[styles.progressCard, { backgroundColor: colors.surface }]}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: colors.foreground }]}>Progresso de Pagamento</Text>
          <Text style={[styles.progressPctText, { color: colors.primary }]}>{pct}%</Text>
        </View>
        <ProgressBar progress={totalFixedExpenses > 0 ? totalFixedExpensesPaid / totalFixedExpenses : 0} color={colors.income} backgroundColor={colors.border} height={12} />
        <View style={styles.progressStats}>
          <View style={styles.progressStat}>
            <Text style={[styles.progressStatLabel, { color: colors.muted }]}>✅ Pago</Text>
            <Text style={[styles.progressStatValue, { color: colors.income }]}>{formatCurrency(totalFixedExpensesPaid)}</Text>
          </View>
          <View style={styles.progressStat}>
            <Text style={[styles.progressStatLabel, { color: colors.muted }]}>⏳ Pendente</Text>
            <Text style={[styles.progressStatValue, { color: colors.warning }]}>{formatCurrency(totalFixedExpenses - totalFixedExpensesPaid)}</Text>
          </View>
          {savings > 0 && (
            <View style={styles.progressStat}>
              <Text style={[styles.progressStatLabel, { color: colors.muted }]}>🎉 Econom.</Text>
              <Text style={[styles.progressStatValue, { color: colors.income }]}>{formatCurrency(savings)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* List */}
      <FlatList data={sortedExpenses} keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 8, paddingTop: 8 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 44 }}>📋</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>Nenhuma despesa fixa cadastrada</Text>
            <Text style={[styles.emptySubtext, { color: colors.muted }]}>Toque em "+ Adicionar" para incluir</Text>
          </View>
        }
        renderItem={({ item }) => <FixedRow item={item} onToggle={handleTogglePaid} onEdit={openEdit} onDelete={handleDelete} colors={colors} />}
      />

      {/* Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editingItem ? "Editar Despesa" : "Nova Despesa Fixa"}</Text>

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Nome da despesa</Text>
            <TextInput value={formName} onChangeText={setFormName} placeholder="Ex: Aluguel, Luz, Internet..." placeholderTextColor={colors.muted}
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Valor planejado (R$)</Text>
            <TextInput value={formPlanned} onChangeText={setFormPlanned} placeholder="0,00" placeholderTextColor={colors.muted} keyboardType="decimal-pad"
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Valor pago real (opcional)</Text>
            <TextInput value={formActual} onChangeText={setFormActual} placeholder="Deixe vazio se igual ao planejado" placeholderTextColor={colors.muted} keyboardType="decimal-pad"
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} />

            <View style={styles.modalButtons}>
              <Pressable onPress={() => setShowAddModal(false)} style={({ pressed }) => [styles.cancelBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
                <Text style={[styles.cancelBtnText, { color: colors.muted }]}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}>
                <Text style={styles.saveBtnText}>Salvar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  recurrenceBanner: { marginHorizontal: 16, marginBottom: 12, borderRadius: 14, borderWidth: 1.5, padding: 14 },
  recurrenceHeader: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 8 },
  recurrenceActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  recurrenceDismiss: { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1, borderColor: "rgba(170,255,0,0.25)", alignItems: "center" },
  recurrenceAccept: { flex: 2, paddingVertical: 9, borderRadius: 8, backgroundColor: "#AAFF00", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5 },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -1, color: "#F2F2FF" },
  subtitle: { fontSize: 13, marginTop: 2 },
  addBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  progressCard: { marginHorizontal: 16, borderRadius: 18, padding: 16, marginBottom: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  progressTitle: { fontSize: 14, fontWeight: "600" },
  progressPctText: { fontSize: 15, fontWeight: "800" },
  progressStats: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  progressStat: { alignItems: "center", flex: 1 },
  progressStatLabel: { fontSize: 10, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.3 },
  progressStatValue: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  emptyContainer: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "600" },
  emptySubtext: { fontSize: 13, textAlign: "center" },
  expenseCard: { borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, overflow: "hidden" },
  cardAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  checkbox: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  expenseName: { fontSize: 15, fontWeight: "600" },
  paidDate: { fontSize: 11, marginTop: 2 },
  actualValue: { fontSize: 15, fontWeight: "700" },
  plannedValue: { fontSize: 11, textDecorationLine: "line-through", marginTop: 2 },
  swipeActions: { alignItems: "center", borderRadius: 16, overflow: "hidden", marginLeft: 8 },
  swipeBtn: { width: 68, alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 2, height: "100%" },
  swipeBtnText: { fontSize: 20 },
  swipeBtnLabel: { color: "#fff", fontSize: 10, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 20 },
  inputLabel: { fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600" },
  saveBtn: { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
