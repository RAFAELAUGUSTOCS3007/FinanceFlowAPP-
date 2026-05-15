import React, { useRef } from "react";
import { Animated, StyleSheet, Text, View, TouchableOpacity, I18nManager } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useColors } from "@/hooks/use-colors";

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  onEdit?: () => void;
}

export function SwipeableRow({ children, onDelete, onEdit }: SwipeableRowProps) {
  const colors = useColors();
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const hasEdit = !!onEdit;
    const trans = dragX.interpolate({
      inputRange: hasEdit ? [-160, 0] : [-80, 0],
      outputRange: hasEdit ? [0, 160] : [0, 80],
      extrapolate: "clamp",
    });

    return (
      <Animated.View
        style={[
          styles.rightActionsContainer,
          { transform: [{ translateX: trans }] },
        ]}
      >
        {hasEdit && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              swipeableRef.current?.close();
              onEdit?.();
            }}
          >
            <Text style={styles.actionIcon}>✏️</Text>
            <Text style={styles.actionText}>Editar</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.error }]}
          onPress={() => {
            swipeableRef.current?.close();
            onDelete();
          }}
        >
          <Text style={styles.actionIcon}>🗑️</Text>
          <Text style={styles.actionText}>Excluir</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      enableTrackpadTwoFingerGesture
      rightThreshold={40}
      renderRightActions={renderRightActions}
      overshootRight={false}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  rightActionsContainer: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  actionBtn: {
    width: 80,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
});
