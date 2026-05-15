import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { ScreenContainer } from "@/components/screen-container";
import { MoneyText } from "@/components/money-text";
import { MonthSelector } from "@/components/month-selector";
import { ProgressBar } from "@/components/progress-bar";
import { useFinance, formatCurrency, type Income } from "@/lib/finance-context";
import { useColors } from "@/hooks/use-colors";
import type { ThemeColorPalette } from "@/constants/theme";

const INCOME_ICONS = ["💰", "💼", "🏢", "💻", "🏠", "📈", "🎨", "🚀", "⭐"];

const IncomeRow = React.memo(function IncomeRow({ item, totalIncome, onEdit, onDelete, colors }: { item, totalIncome, onEdit, onDelete: any; colors: ThemeColorPalette }) {
  const swipeRef = useRef<Swipeable>(null);
  const pct = totalIncome > 0 ? (item.value / totalIncome) * 100 : 0;
  const iconIndex = item.name.length % INCOME_ICONS.length;

  const renderRightActions = useCallback((progress: Animated.AnimatedInterpolation<number>) => {
    const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
    return (
      <Animated.View style={[{ transform: [{ translateX }] }, styles.swipeActions]}>
        <Pressable onPress={() => { swipeRef.current?.close(); onDelete(item.id); }} style={[styles.swipeBtn, { backgroundColor: "#EF4444" }]}>
          <Text style={styles.swipeBtnText}>🗑️</Text>
          <Text style={styles.swipeBtnLabel}>Excluir</Text>
        </Pressable>
      </Animated.View>
    );
  }, [item.id, onDelete]);

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false} friction={2}>
      <Pressable onPress={() => onEdit(item)} style={({ pressed }) => [styles.incomeCard, { backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 }]}>
        <View style={[styles.incomeIcon, { backgroundColor: "#DCFCE7" }]}>
          <Text style={{ fontSize: 22 }}>{INCOME_ICONS[iconIndex]}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.incomeName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
          <View style={styles.pctRow}>
            <View style={[styles.pctBarOuter, { backgroundColor: colors.border }]}>
              <Animated.View style={[styles.pctBarInner, { width: `${pct}%`, backgroundColor: colors.income }]} />
            </View>
            <Text style={[styles.pctText, { color: colors.muted }]}>{pct.toFixed(1)}%</Text>
          </View>
        </View>
        <MoneyText value={item.value} style={[styles.incomeValue, { color: colors.income }]} />
      </Pressable>
    </Swipeable>
  );
});

export default function IncomeScreen() {
  const { state, currentMonthData, totalIncome, dispatch, generateId } = useFinance();
  const colors = useColors();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Income | null>(null);
  const [formName, setFormName] = useState("");
  const [formValue, setFormValue] = useState("");

  const incomes = useMemo(() => currentMonthData?.incomes ?? [], [currentMonthData]);

  // Sorted by value descending
  const sortedIncomes = useMemo(() => [...incomes].sort((a, b) => b.value - a.value), [incomes]);

  // Top source
  const topSource = sortedIncomes[0];

  const openAdd = useCallback(() => { setEditingItem(null); setFormName(""); setFormValue(""); setShowModal(true); }, []);
  const openEdit = useCallback((item: Income) => { setEditingItem(item); setFormName(item.name); setFormValue(item.value.toString()); setShowModal(true); }, []);

  const handleDelete = useCallback((id: string) => {
    Alert.alert("Excluir entrada", "Deseja excluir esta fonte de renda?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => dispatch({ type: "DELETE_INCOME", payload: id }) },
    ]);
  }, [dispatch]);

  const handleSave = useCallback(() => {
    if (!formName.trim() || !formValue.trim()) return;
    const value = parseFloat(formValue.replace(",", "."));
    if (isNaN(value) || value <= 0) return;
    if (editingItem) {
      dispatch({ type: "UPDATE_INCOME", payload: { ...editingItem, name: formName.trim(), value } });
    } else {
      dispatch({ type: "ADD_INCOME", payload: { id: generateId(), name: formName.trim(), value, month: state.currentMonth, year: state.currentYear } });
    }
    setShowModal(false);
  }, [formName, formValue, editingItem, dispatch, generateId, state.currentMonth, state.currentYear]);

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={styles.title}>Entradas</Text>
          <MoneyText value={totalIncome} style={[styles.totalValue, { color: colors.income }]} />
        </View>
        <Pressable onPress={openAdd} style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.income, opacity: pressed ? 0.8 : 1 }]}>
          <Text style={styles.addBtnText}>+ Adicionar</Text>
        </Pressable>
      </View>

      <View style={{ paddingVertical: 10 }}><MonthSelector /></View>

      {/* Summary Banner */}
      {incomes.length > 0 && (
        <View style={[styles.summaryBanner, { backgroundColor: "#DCFCE7" }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#16A34A", fontSize: 12, fontWeight: "600" }}>
              {incomes.length} fonte{incomes.length > 1 ? "s" : ""} de renda
            </Text>
            {topSource && (
              <Text style={{ color: "#15803D", fontSize: 11, marginTop: 2 }}>
                Principal: {topSource.name}
              </Text>
            )}
          </View>
          <MoneyText value={totalIncome} style={{ color: "#16A34A", fontSize: 20, fontWeight: "800" }} />
        </View>
      )}

      {/* List */}
      <FlatList data={sortedIncomes} keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 8, paddingTop: 8 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 44 }}>💰</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>Nenhuma entrada cadastrada</Text>
            <Text style={[styles.emptySubtext, { color: colors.muted }]}>Adicione suas fontes de renda para este mês</Text>
          </View>
        }
        renderItem={({ item }) => <IncomeRow item={item} totalIncome={totalIncome} onEdit={openEdit} onDelete={handleDelete} colors={colors} />}
      />

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{editingItem ? "Editar Entrada" : "Nova Entrada"}</Text>

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Nome / Descrição</Text>
            <TextInput value={formName} onChangeText={setFormName} placeholder="Ex: Salário, Freelance, Aluguel..." placeholderTextColor={colors.muted}
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} />

            <Text style={[styles.inputLabel, { color: colors.muted }]}>Valor (R$)</Text>
            <TextInput value={formValue} onChangeText={setFormValue} placeholder="0,00" placeholderTextColor={colors.muted} keyboardType="decimal-pad"
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} />

            <View style={styles.modalButtons}>
              <Pressable onPress={() => setShowModal(false)} style={({ pressed }) => [styles.cancelBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
                <Text style={[styles.cancelBtnText, { color: colors.muted }]}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.income, opacity: pressed ? 0.8 : 1 }]}>
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5 },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -1, color: "#F2F2FF" },
  totalValue: { fontSize: 18, fontWeight: "700", marginTop: 2 },
  addBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  summaryBanner: { marginHorizontal: 16, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 4 },
  emptyContainer: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "600" },
  emptySubtext: { fontSize: 13, textAlign: "center" },
  incomeCard: { borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  incomeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  incomeName: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  pctRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pctBarOuter: { flex: 1, height: 5, borderRadius: 3, overflow: "hidden" },
  pctBarInner: { height: 5, borderRadius: 3 },
  pctText: { fontSize: 11, minWidth: 38, textAlign: "right" },
  incomeValue: { fontSize: 16, fontWeight: "700" },
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
