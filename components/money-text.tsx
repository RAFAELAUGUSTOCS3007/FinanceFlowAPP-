/**
 * MoneyText — exibe valores monetários em fonte monospace
 * Alinhamento perfeito em colunas, estilo "bancário"
 * Usado em: saldo principal, KPIs, tabelas, valores em listas
 */

import React from "react";
import { Platform, Text, StyleSheet, type TextProps } from "react-native";

interface MoneyTextProps extends TextProps {
  value: number;
  hideCents?: boolean;
  showPlus?: boolean;
  currency?: "BRL" | "none";
}

export function MoneyText({
  value,
  hideCents = false,
  showPlus = false,
  currency = "BRL",
  style,
  ...rest
}: MoneyTextProps) {
  const abs = Math.abs(value);
  const formatted = hideCents
    ? Math.round(abs).toLocaleString("pt-BR")
    : abs.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  const sign = value < 0 ? "-" : showPlus ? "+" : "";
  const prefix = currency === "BRL" ? "R$ " : "";

  return (
    <Text style={[styles.money, style]} {...rest}>
      {sign}{prefix}{formatted}
    </Text>
  );
}

export function formatCurrency(value: number): string {
  return "R$ " + value.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

const styles = StyleSheet.create({
  money: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontVariant: ["tabular-nums"],
  },
});
