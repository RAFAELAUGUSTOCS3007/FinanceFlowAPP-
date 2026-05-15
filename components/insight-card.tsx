/**
 * components/insight-card.tsx
 * Card de insight automático para o Dashboard
 */

import React, { useCallback } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import type { Insight } from "@/lib/insights";
import { getInsightColor, getInsightIcon } from "@/lib/insights";
import { useColors } from "@/hooks/use-colors";

interface InsightCardProps {
  insight: Insight;
  onDismiss?: (id: string) => void;
}

export const InsightCard = React.memo(function InsightCard({ insight, onDismiss }: InsightCardProps) {
  const colors = useColors();
  const accentColor = getInsightColor(insight.severity);
  const icon = getInsightIcon(insight.type);

  const handleAction = useCallback(() => {
    if (insight.actionRoute) router.push(insight.actionRoute as any);
  }, [insight.actionRoute]);

  const handleDismiss = useCallback(() => {
    onDismiss?.(insight.id);
  }, [insight.id, onDismiss]);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: accentColor }]}>
      <View style={styles.top}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>{insight.title}</Text>
          <Text style={[styles.message, { color: colors.muted }]}>{insight.message}</Text>
        </View>
        {insight.dismissible && (
          <Pressable onPress={handleDismiss} hitSlop={12}>
            <Text style={{ color: colors.muted, fontSize: 18, lineHeight: 20 }}>×</Text>
          </Pressable>
        )}
      </View>
      {insight.actionLabel && insight.actionRoute && (
        <Pressable onPress={handleAction} style={[styles.actionBtn, { borderColor: accentColor }]}>
          <Text style={[styles.actionText, { color: accentColor }]}>{insight.actionLabel} →</Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
  },
  top: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 8 },
  icon: { fontSize: 22, lineHeight: 26 },
  title: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  message: { fontSize: 12, lineHeight: 17 },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  actionText: { fontSize: 11, fontWeight: "700" },
});
