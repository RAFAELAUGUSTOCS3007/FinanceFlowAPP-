/**
 * SummaryCard — card de KPI com accent strip, shine decorativo e valor em monospace
 * Visual do FinanceFlow FINAL: refinamento do dashboard
 */

import React, { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { MoneyText } from "./money-text";

interface SummaryCardProps {
  title: string;
  value: number;
  icon: string;
  color: string;
  bgColor: string;
  subtitle?: string;
  className?: string;
  hidden?: boolean;
  onPress?: () => void;
}

export const SummaryCard = React.memo(function SummaryCard({
  title,
  value,
  icon,
  color,
  bgColor,
  subtitle,
  hidden,
  onPress,
}: SummaryCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  };

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.card}
      >
        {/* Shine decorativo — canto superior direito */}
        <View style={[styles.shine, { backgroundColor: color }]} />

        {/* Header: ícone + tag */}
        <View style={styles.header}>
          <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>
          <Text style={[styles.tag, { color }]}>{title}</Text>
        </View>

        {/* Valor em monospace */}
        {hidden ? (
          <Text style={styles.hiddenValue}>••••</Text>
        ) : (
          <MoneyText
            value={value}
            hideCents
            style={styles.value}
          />
        )}

        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

        {/* Accent strip inferior */}
        <View style={[styles.strip, { backgroundColor: color }]} />
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#1A1A22",
    borderRadius: 14,
    padding: 14,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#252530",
  },
  shine: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 60,
    height: 60,
    borderBottomLeftRadius: 60,
    opacity: 0.06,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 18 },
  tag: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  value: {
    color: "#F2F2FF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  hiddenValue: {
    color: "#4A4A62",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 4,
    marginTop: 2,
  },
  subtitle: {
    color: "#7A7A96",
    fontSize: 10,
    marginTop: 4,
  },
  strip: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
});
