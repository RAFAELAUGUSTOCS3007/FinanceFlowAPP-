import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useFinance, CATEGORIES, PAYMENT_METHODS, type TransactionCategory, type PaymentMethod } from "@/lib/finance-context";
import { useColors } from "@/hooks/use-colors";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export default function AddTransactionScreen() {
  const { state, dispatch, generateId } = useFinance();
  const colors = useColors();

  const [category, setCategory] = useState<TransactionCategory>("🍗 Alimentação");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Pix / Dinheiro");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isEssential, setIsEssential] = useState(false);
  const [description, setDescription] = useState("");

  const handleSave = () => {
    const numValue = parseFloat(value.replace(",", "."));
    if (isNaN(numValue) || numValue <= 0) return;

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    dispatch({
      type: "ADD_VARIABLE_EXPENSE",
      payload: {
        id: generateId(),
        category,
        paymentMethod,
        value: numValue,
        date,
        isEssential,
        description: description.trim() || undefined,
        month: state.currentMonth,
        year: state.currentYear,
      },
    });
    router.back();
  };

  return (
    <ScreenContainer containerClassName="bg-background" edges={["top", "left", "right", "bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text style={[styles.cancelText, { color: colors.muted }]}>Cancelar</Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.foreground }]}>Nova Despesa</Text>
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text style={[styles.saveText, { color: colors.primary }]}>Salvar</Text>
          </Pressable>
        </View>

        {/* Value Input */}
        <View style={styles.valueSection}>
          <Text style={[styles.currencySymbol, { color: colors.muted }]}>R$</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="0,00"
            placeholderTextColor={colors.border}
            keyboardType="decimal-pad"
            style={[styles.valueInput, { color: colors.foreground }]}
            autoFocus
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Categoria</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const isSelected = cat === category;
              const emoji = cat.split(" ")[0];
              const label = cat.split(" ").slice(1).join(" ") || cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={({ pressed }) => [
                    styles.categoryItem,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 22 }}>{emoji}</Text>
                  <Text
                    style={{
                      color: isSelected ? "#FFFFFF" : colors.foreground,
                      fontSize: 11,
                      fontWeight: isSelected ? "700" : "400",
                      textAlign: "center",
                    }}
                    numberOfLines={2}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Forma de Pagamento</Text>
          <View style={styles.paymentRow}>
            {PAYMENT_METHODS.map((method) => {
              const isSelected = method === paymentMethod;
              return (
                <Pressable
                  key={method}
                  onPress={() => setPaymentMethod(method)}
                  style={({ pressed }) => [
                    styles.paymentItem,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isSelected ? "#FFFFFF" : colors.foreground,
                      fontSize: 12,
                      fontWeight: isSelected ? "700" : "400",
                      textAlign: "center",
                    }}
                    numberOfLines={2}
                  >
                    {method}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Data</Text>
          <View style={styles.dateRow}>
            {[-2, -1, 0, 1, 2].map((offset) => {
              const d = new Date();
              d.setDate(d.getDate() + offset);
              const iso = d.toISOString().split("T")[0];
              const isSelected = iso === date;
              const label = offset === 0 ? "Hoje" : offset === -1 ? "Ontem" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
              return (
                <Pressable
                  key={iso}
                  onPress={() => setDate(iso)}
                  style={({ pressed }) => ([
                    styles.dateChip,
                    { backgroundColor: isSelected ? colors.primary : colors.surface, borderColor: isSelected ? colors.primary : colors.border, opacity: pressed ? 0.8 : 1 },
                  ])}
                >
                  <Text style={{ color: isSelected ? "#fff" : colors.muted, fontSize: 10 }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={colors.muted}
            style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border, marginTop: 8 }]}
          />
        </View>

        {/* Description (optional) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Descrição (opcional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Adicione uma observação..."
            placeholderTextColor={colors.muted}
            style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
          />
        </View>

        {/* Essential Toggle */}
        <View style={styles.section}>
          <Pressable
            onPress={() => setIsEssential(!isEssential)}
            style={({ pressed }) => [
              styles.essentialToggle,
              {
                backgroundColor: isEssential ? "rgba(0,229,160,0.15)" : colors.surface,
                borderColor: isEssential ? colors.income : colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={{ fontSize: 20 }}>{isEssential ? "✅" : "⬜"}</Text>
            <View>
              <Text style={[styles.essentialTitle, { color: colors.foreground }]}>Despesa Essencial</Text>
              <Text style={[styles.essentialSubtitle, { color: colors.muted }]}>
                Marque se for uma necessidade básica
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Save Button */}
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={styles.saveBtnText}>Registrar Despesa</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  cancelText: { fontSize: 16 },
  title: { fontSize: 18, fontWeight: "700" },
  saveText: { fontSize: 16, fontWeight: "700" },
  valueSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 8,
  },
  currencySymbol: { fontSize: 28, fontWeight: "600" },
  valueInput: { fontSize: 48, fontWeight: "800", minWidth: 120, textAlign: "center" },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryItem: {
    width: "22%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  paymentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dateRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  dateChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  paymentItem: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  essentialToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  essentialTitle: { fontSize: 15, fontWeight: "600" },
  essentialSubtitle: { fontSize: 12, marginTop: 2 },
  saveBtn: {
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
