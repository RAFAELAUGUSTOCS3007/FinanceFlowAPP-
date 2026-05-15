import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { ScreenContainer } from "@/components/screen-container";
import { MoneyText } from "@/components/money-text";
import { CategoryBadge } from "@/components/category-badge";
import { MonthSelector } from "@/components/month-selector";
import { useFinance, CATEGORIES, formatDate, formatCurrency, type TransactionCategory } from "@/lib/finance-context";
import { useColors } from "@/hooks/use-colors";
import type { ThemeColorPalette } from "@/constants/theme";
import { router } from "expo-router";

// ─── Swipeable Row ────────────────────────────────────────────────────────────

const TransactionRow = React.memo(function TransactionRow({ item, onDelete, onEdit, colors }: { item, onDelete, onEdit: any; colors: ThemeColorPalette }) {
  const swipeRef = useRef<Swipeable>(null);

  const renderRightActions = useCallback((progress: Animated.AnimatedInterpolation<number>) => {
    const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [140, 0] });
    return (
      <Animated.View style={[styles.swipeActions, { transform: [{ translateX }] }]}>
        <Pressable onPress={() => { swipeRef.current?.close(); onEdit(item); }} style={[styles.swipeBtn, { backgroundColor: "#3B82F6" }]}>
          <Text style={styles.swipeBtnText}>✏️</Text>
          <Text style={styles.swipeBtnLabel}>Editar</Text>
        </Pressable>
        <Pressable onPress={() => { swipeRef.current?.close(); onDelete(item.id); }} style={[styles.swipeBtn, { backgroundColor: "#EF4444" }]}>
          <Text style={styles.swipeBtnText}>🗑️</Text>
          <Text style={styles.swipeBtnLabel}>Excluir</Text>
        </Pressable>
      </Animated.View>
    );
  }, [item, onEdit, onDelete]);

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false} friction={2}>
      <Pressable onPress={() => onEdit(item)} style={({ pressed }) => [styles.transactionCard, { backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 }]}>
        <CategoryBadge category={item.category} />
        <View style={styles.transactionMeta}>
          {item.description ? (
            <Text style={[styles.transactionDesc, { color: colors.foreground }]} numberOfLines={1}>{item.description}</Text>
          ) : null}
          <Text style={[styles.transactionDate, { color: colors.muted }]}>{formatDate(item.date)}</Text>
          <View style={styles.transactionTags}>
            <View style={[styles.tag, { backgroundColor: colors.border }]}>
              <Text style={[styles.tagText, { color: colors.muted }]}>{item.paymentMethod}</Text>
            </View>
            {item.isEssential && (
              <View style={[styles.tag, { backgroundColor: "#DCFCE7" }]}>
                <Text style={[styles.tagText, { color: "#16A34A" }]}>Essencial</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.transactionRight}>
          <MoneyText value={-item.value} style={[styles.transactionValue, { color: colors.expense }]} />
          <Text style={[styles.swipeHint, { color: colors.muted }]}>← deslize</Text>
        </View>
      </Pressable>
    </Swipeable>
  );
});

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ item, visible, onClose, onSave, colors }) {
  const [value, setValue] = useState(item?.value?.toString() ?? "");
  const [category, setCategory] = useState<TransactionCategory>(item?.category ?? CATEGORIES[0]);
  const [paymentMethod, setPaymentMethod] = useState(item?.paymentMethod ?? "Débito");
  const [isEssential, setIsEssential] = useState(item?.isEssential ?? false);

  React.useEffect(() => {
    if (item) {
      setValue(item.value.toString());
      setCategory(item.category);
      setPaymentMethod(item.paymentMethod);
      setIsEssential(item.isEssential ?? false);
    }
  }, [item?.id]);

  if (!visible || !item) return null;

  const handleSave = () => {
    const parsed = parseFloat(value.replace(",", "."));
    if (isNaN(parsed) || parsed <= 0) { Alert.alert("Valor inválido", "Informe um valor válido."); return; }
    onSave({ ...item, value: parsed, category, paymentMethod, isEssential });
    onClose();
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
        <View style={styles.modalHandle} />
        <Text style={[styles.modalTitle, { color: colors.foreground }]}>Editar Transação</Text>

        <Text style={[styles.modalLabel, { color: colors.muted }]}>Valor (R$)</Text>
        <TextInput value={value} onChangeText={setValue} keyboardType="decimal-pad"
          style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]} />

        <Text style={[styles.modalLabel, { color: colors.muted }]}>Categoria</Text>
        <FlatList data={CATEGORIES} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(i) => i}
          style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 6 }}
          renderItem={({ item: cat }) => (
            <Pressable onPress={() => setCategory(cat as TransactionCategory)}
              style={[styles.catChip, { backgroundColor: cat === category ? colors.primary : colors.border }]}>
              <Text style={{ color: cat === category ? "#fff" : colors.foreground, fontSize: 12 }}>{cat}</Text>
            </Pressable>
          )} />

        <Text style={[styles.modalLabel, { color: colors.muted }]}>Método de Pagamento</Text>
        <View style={styles.paymentRow}>
          {["Pix / Dinheiro", "Débito", "Crédito", "Outros"].map((m) => (
            <Pressable key={m} onPress={() => setPaymentMethod(m)}
              style={[styles.payChip, { backgroundColor: m === paymentMethod ? colors.primary : colors.border, flex: 1 }]}>
              <Text style={{ color: m === paymentMethod ? "#fff" : colors.foreground, fontSize: 11, textAlign: "center" }}>{m}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => setIsEssential((v: boolean) => !v)} style={[styles.essentialToggle, { borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontSize: 14 }}>{isEssential ? "✅" : "⬜"} Despesa essencial</Text>
        </Pressable>

        <View style={styles.modalBtns}>
          <Pressable onPress={onClose} style={[styles.modalBtn, { backgroundColor: colors.border }]}>
            <Text style={{ color: colors.foreground, fontWeight: "600" }}>Cancelar</Text>
          </Pressable>
          <Pressable onPress={handleSave} style={[styles.modalBtn, { backgroundColor: colors.primary }]}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>Salvar</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TransactionsScreen() {
  const { currentMonthData, totalVariableExpenses, dispatch } = useFinance();
  const colors = useColors();
  const [selectedCategory, setSelectedCategory] = useState<TransactionCategory | "Todos">("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showSearch, setShowSearch] = useState(false);

  const expenses = currentMonthData?.variableExpenses ?? [];

  // Memoized filter + sort
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...expenses]
      .filter((e) => selectedCategory === "Todos" || e.category === selectedCategory)
      .filter((e) => !q || e.category.toLowerCase().includes(q) || e.paymentMethod.toLowerCase().includes(q) || (e.description ?? "").toLowerCase().includes(q) || formatCurrency(e.value).includes(q))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, selectedCategory, searchQuery]);

  // Group by date for SectionList
  const sections = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const t of filtered) {
      const key = t.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries()).map(([date, data]) => ({ title: date, data }));
  }, [filtered]);

  const usedCategories = useMemo(() => [...new Set(expenses.map((e) => e.category))], [expenses]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert("Excluir transação", "Tem certeza que deseja excluir esta transação?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => dispatch({ type: "DELETE_VARIABLE_EXPENSE", payload: id }) },
    ]);
  }, [dispatch]);

  const handleEdit = useCallback((item: any) => setEditingItem(item), []);
  const handleSaveEdit = useCallback((updated: any) => dispatch({ type: "UPDATE_VARIABLE_EXPENSE", payload: updated }), [dispatch]);

  const categoryFilterData = useMemo(
    () => ["Todos", ...usedCategories] as (TransactionCategory | "Todos")[],
    [usedCategories]
  );

  // Category totals for mini stats
  const categoryTotals = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const e of filtered) acc[e.category] = (acc[e.category] ?? 0) + e.value;
    return acc;
  }, [filtered]);

  const filteredTotal = useMemo(() => filtered.reduce((s, e) => s + e.value, 0), [filtered]);

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Despesas Variáveis</Text>
          <MoneyText value={totalVariableExpenses} style={[styles.totalValue, { color: colors.expense }]} />
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => { setShowSearch((v) => !v); if (showSearch) setSearchQuery(""); }}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: showSearch ? colors.primary + "20" : colors.surface, opacity: pressed ? 0.7 : 1 }]}>
            <Text style={{ fontSize: 18 }}>{showSearch ? "✕" : "🔍"}</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/add-transaction")}
            style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}>
            <Text style={styles.addBtnText}>+ Adicionar</Text>
          </Pressable>
        </View>
      </View>

      {/* Search */}
      {showSearch && (
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ fontSize: 16 }}>🔍</Text>
          <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Buscar categoria, valor, descrição..."
            placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.foreground }]} autoFocus />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}><Text style={{ color: colors.muted, fontSize: 16 }}>✕</Text></Pressable>
          )}
        </View>
      )}

      {/* Month Selector */}
      <View style={{ paddingVertical: 10 }}><MonthSelector /></View>

      {/* Category Filter */}
      <FlatList data={categoryFilterData} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(i) => i}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 10 }}
        renderItem={({ item }) => {
          const isSelected = item === selectedCategory;
          const catTotal = item !== "Todos" ? categoryTotals[item] : undefined;
          return (
            <Pressable onPress={() => setSelectedCategory(item)}
              style={({ pressed }) => ({
                paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
                backgroundColor: isSelected ? colors.primary : colors.surface,
                borderWidth: 1, borderColor: isSelected ? colors.primary : colors.border,
                opacity: pressed ? 0.8 : 1,
              })}>
              <Text style={{ color: isSelected ? "#FFFFFF" : colors.foreground, fontSize: 12, fontWeight: isSelected ? "700" : "400" }}>{item}</Text>
              {catTotal !== undefined && (
                <Text style={{ color: isSelected ? "rgba(255,255,255,0.8)" : colors.muted, fontSize: 10, textAlign: "center", marginTop: 1 }}>
                  {formatCurrency(catTotal).replace("R$", "").trim()}
                </Text>
              )}
            </Pressable>
          );
        }} />

      {/* Filtered total & count */}
      {(searchQuery.length > 0 || selectedCategory !== "Todos") && filtered.length > 0 && (
        <View style={[styles.filterSummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ fontSize: 12, color: colors.muted }}>{filtered.length} transaç{filtered.length !== 1 ? "ões" : "ão"}</Text>
          <MoneyText value={-filteredTotal} style={{ fontSize: 13, fontWeight: "700", color: colors.expense }} />
        </View>
      )}

      {/* Section List — grouped by date */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 4 }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section: { title } }) => (
          <View style={[styles.sectionHeader]}>
            <Text style={[styles.sectionHeaderText, { color: colors.muted }]}>{formatDate(title)}</Text>
            <View style={[styles.sectionHeaderLine, { backgroundColor: colors.border }]} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 44 }}>💸</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              {searchQuery ? "Nenhum resultado encontrado" : "Nenhuma transação este mês"}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.muted }]}>
              {searchQuery ? "Tente outro termo de busca" : "Toque em \"+ Adicionar\" para registrar"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TransactionRow item={item} onDelete={handleDelete} onEdit={handleEdit} colors={colors} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
      />

      {editingItem && (
        <EditModal item={editingItem} visible={!!editingItem} onClose={() => setEditingItem(null)} onSave={handleSaveEdit} colors={colors} />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5 },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -1, color: "#F2F2FF" },
  totalValue: { fontSize: 18, fontWeight: "700", marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  addBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  searchContainer: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginTop: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  filterSummary: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 0.5, marginBottom: 4 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  sectionHeaderText: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  sectionHeaderLine: { flex: 1, height: 0.5 },
  emptyContainer: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "600" },
  emptySubtext: { fontSize: 13, textAlign: "center" },
  transactionCard: { borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  transactionMeta: { flex: 1, gap: 3 },
  transactionDesc: { fontSize: 13, fontWeight: "600" },
  transactionDate: { fontSize: 11 },
  transactionTags: { flexDirection: "row", gap: 6, marginTop: 2 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tagText: { fontSize: 10, fontWeight: "500" },
  transactionRight: { alignItems: "flex-end", gap: 2 },
  transactionValue: { fontSize: 15, fontWeight: "700" },
  swipeHint: { fontSize: 9 },
  swipeActions: { flexDirection: "row", alignItems: "center", borderRadius: 16, overflow: "hidden", marginLeft: 8 },
  swipeBtn: { width: 64, alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 2 },
  swipeBtnText: { fontSize: 18 },
  swipeBtnLabel: { color: "#fff", fontSize: 10, fontWeight: "600" },
  modalOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end", zIndex: 100 },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 8, maxHeight: "90%" },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  modalLabel: { fontSize: 13, fontWeight: "500", marginBottom: 4, marginTop: 4 },
  modalInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 4 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  paymentRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  payChip: { paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  essentialToggle: { paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 0.5, marginBottom: 8 },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
});
