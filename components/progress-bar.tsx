import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: number; // 0 to 1
  color?: string;
  backgroundColor?: string;
  height?: number;
  className?: string;
  animated?: boolean;
  duration?: number;
}

/**
 * Animated progress bar — smoothly transitions between values.
 */
export function ProgressBar({
  progress,
  color,
  backgroundColor,
  height = 8,
  className,
  animated = true,
  duration = 700,
}: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) {
      widthAnim.setValue(clampedProgress);
      return;
    }
    Animated.timing(widthAnim, {
      toValue: clampedProgress,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clampedProgress]);

  return (
    <View
      className={cn("rounded-full overflow-hidden", className)}
      style={{ height, backgroundColor: backgroundColor ?? "#E2E8F0" }}
    >
      <Animated.View
        style={{
          height,
          width: widthAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ["0%", "100%"],
          }),
          backgroundColor: color ?? "#1A73E8",
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}
