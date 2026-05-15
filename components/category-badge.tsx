import React from "react";
import { Text, View } from "react-native";
import { type TransactionCategory } from "@/lib/finance-context";

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  "🍗 Alimentação": { bg: "#FEF3C7", text: "#92400E" },
  "🔋 Saúde e Bem-estar": { bg: "#D1FAE5", text: "#065F46" },
  "💪 Academia": { bg: "#EDE9FE", text: "#5B21B6" },
  "🧾 Contas": { bg: "#FEE2E2", text: "#991B1B" },
  "🚗 Transporte": { bg: "#DBEAFE", text: "#1E40AF" },
  "🎮 Lazer": { bg: "#FCE7F3", text: "#9D174D" },
  "🛍️ Compras": { bg: "#FEF3C7", text: "#92400E" },
  "📚 Educação": { bg: "#DBEAFE", text: "#1E40AF" },
  "🏠 Moradia": { bg: "#F3F4F6", text: "#374151" },
  "💊 Farmácia": { bg: "#D1FAE5", text: "#065F46" },
  "🐾 Pet": { bg: "#FEF3C7", text: "#92400E" },
  "Outros": { bg: "#F3F4F6", text: "#374151" },
};

interface CategoryBadgeProps {
  category: TransactionCategory | string;
  size?: "sm" | "md";
}

export function CategoryBadge({ category, size = "md" }: CategoryBadgeProps) {
  const colors = CATEGORY_COLORS[category] ?? { bg: "#F3F4F6", text: "#374151" };
  const emoji = category.split(" ")[0];
  const label = category.split(" ").slice(1).join(" ");

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.bg,
        borderRadius: 12,
        paddingHorizontal: size === "sm" ? 8 : 10,
        paddingVertical: size === "sm" ? 3 : 4,
        gap: 4,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ fontSize: size === "sm" ? 12 : 14 }}>{emoji}</Text>
      {label && (
        <Text
          style={{
            color: colors.text,
            fontSize: size === "sm" ? 10 : 12,
            fontWeight: "600",
          }}
        >
          {label}
        </Text>
      )}
    </View>
  );
}
