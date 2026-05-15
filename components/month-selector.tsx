/**
 * MonthSelector — pills de mês com visual FINAL
 * Pill ativo em neon, inativos com borda sutil
 */

import React, { useRef } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFinance, MONTH_NAMES } from "@/lib/finance-context";

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const NEON = "#AAFF00";
const NEON_INK = "#0F0F12";
const SURFACE = "#1A1A22";
const BORDER = "#303040";
const MUTED = "#7A7A96";
const TEXT_2 = "#C8C8E0";

export function MonthSelector({ light }: { light?: boolean } = {}) {
  const { state, dispatch } = useFinance();
  const listRef = useRef<FlatList>(null);

  const handleSelect = (month: number) => {
    dispatch({ type: "SET_CURRENT_MONTH", payload: { month, year: state.currentYear } });
    const index = month - 1;
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
  };

  return (
    <View>
      <Text style={styles.year}>{state.currentYear}</Text>
      <FlatList
        ref={listRef}
        data={MONTHS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.toString()}
        contentContainerStyle={styles.list}
        initialScrollIndex={state.currentMonth - 1}
        getItemLayout={(_, index) => ({ length: 76, offset: 76 * index + 16, index })}
        renderItem={({ item }) => {
          const isSelected = item === state.currentMonth;
          return (
            <Pressable
              onPress={() => handleSelect(item)}
              style={({ pressed }) => [
                styles.pill,
                {
                  backgroundColor: isSelected ? NEON : SURFACE,
                  borderColor: isSelected ? NEON : BORDER,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: isSelected ? NEON_INK : TEXT_2,
                  fontSize: 10,
                  fontWeight: isSelected ? "900" : "700",
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                }}
              >
                {MONTH_NAMES[item - 1].substring(0, 3)}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  year: {
    color: NEON,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  list: { paddingHorizontal: 16, gap: 6 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 7,
    borderWidth: 1,
    minWidth: 60,
    alignItems: "center",
  },
});
