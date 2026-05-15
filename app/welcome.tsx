import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");
const ONBOARDING_DONE_KEY = "@financeflow_onboarding_done";

export default function WelcomeScreen() {
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslate = useRef(new Animated.Value(30)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Background fade in
    Animated.timing(bgOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Logo animation: scale + fade in
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // After logo appears, animate text
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslate, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Wait 1.5s then navigate
        setTimeout(async () => {
          try {
            const done = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
            if (!done) {
              router.replace("/onboarding" as never);
            } else {
              router.replace("/(tabs)");
            }
          } catch {
            router.replace("/(tabs)");
          }
        }, 1500);
      });
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: bgOpacity }]}>
      {/* Gradient background circles */}
      <View style={[styles.circle, styles.circle1]} />
      <View style={[styles.circle, styles.circle2]} />
      <View style={[styles.circle, styles.circle3]} />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Text */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslate }],
          },
        ]}
      >
        <Text style={styles.appName}>FinanceFlow</Text>
        <Text style={styles.tagline}>Seu dinheiro, sob controle</Text>
      </Animated.View>

      {/* Bottom dots loader */}
      <Animated.View style={[styles.loaderContainer, { opacity: textOpacity }]}>
        <LoadingDots />
      </Animated.View>
    </Animated.View>
  );
}

function LoadingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    };
    animate(dot1, 0);
    animate(dot2, 200);
    animate(dot3, 400);
  }, []);

  return (
    <View style={styles.dotsRow}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0F",
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    position: "absolute",
    borderRadius: 999,
  },
  circle1: {
    width: width * 0.8,
    height: width * 0.8,
    backgroundColor: "rgba(170,255,0,0.08)",
    top: -width * 0.2,
    left: -width * 0.2,
    opacity: 0.6,
  },
  circle2: {
    width: width * 0.6,
    height: width * 0.6,
    backgroundColor: "rgba(170,255,0,0.05)",
    bottom: -width * 0.1,
    right: -width * 0.15,
    opacity: 0.5,
  },
  circle3: {
    width: width * 0.4,
    height: width * 0.4,
    backgroundColor: "rgba(0,229,160,0.06)",
    bottom: height * 0.2,
    left: -width * 0.1,
    opacity: 0.3,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#4A90D9",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
  },
  textContainer: {
    alignItems: "center",
    gap: 8,
  },
  appName: {
    fontSize: 36,
    fontWeight: "800",
    color: "#F2F2FF",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: "#94A3B8",
    fontWeight: "400",
  },
  loaderContainer: {
    position: "absolute",
    bottom: 80,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#AAFF00",
  },
});
