import React, { useEffect, useRef } from "react";
import { Animated, Easing, Text, TextStyle } from "react-native";

interface AnimatedNumberProps {
  value: number;
  style?: TextStyle;
  formatter?: (value: number) => string;
  duration?: number;
}

/**
 * Smoothly animates between numeric values.
 * Replaces static Text for money/score values for polish.
 */
export function AnimatedNumber({
  value,
  style,
  formatter = (v) => v.toFixed(0),
  duration = 600,
}: AnimatedNumberProps) {
  const animatedValue = useRef(new Animated.Value(value)).current;
  const displayRef = useRef(value);
  const [displayValue, setDisplayValue] = React.useState(formatter(value));

  useEffect(() => {
    const fromValue = displayRef.current;
    animatedValue.setValue(fromValue);

    const listener = animatedValue.addListener(({ value: v }) => {
      displayRef.current = v;
      setDisplayValue(formatter(v));
    });

    Animated.timing(animatedValue, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      setDisplayValue(formatter(value));
      animatedValue.removeListener(listener);
    });

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [value]);

  return <Text style={style}>{displayValue}</Text>;
}
