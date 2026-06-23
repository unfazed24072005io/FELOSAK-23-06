import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import Colors from "@/constants/colors";

const PIN_LENGTH = 4;

export function PinLockOverlay() {
  const { isLocked, unlock, pin } = useApp();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;

  const [entered, setEntered] = useState("");
  const [error, setError] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isLocked) {
      setEntered("");
      setError(false);
    }
  }, [isLocked]);

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handlePress = useCallback(
    (digit: string) => {
      if (entered.length >= PIN_LENGTH) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const next = entered + digit;
      setEntered(next);

      if (next.length === PIN_LENGTH) {
        const success = unlock(next);
        if (!success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(true);
          shake();
          setTimeout(() => {
            setEntered("");
            setError(false);
          }, 800);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    },
    [entered, unlock, shake]
  );

  const handleDelete = useCallback(() => {
    if (entered.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEntered((prev) => prev.slice(0, -1));
  }, [entered]);

  if (!isLocked || !pin) return null;

  const KEYS = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
  ];

  return (
    <View
      style={[
        styles.overlay,
        { backgroundColor: theme.background, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.logoCircle,
            { backgroundColor: theme.tint + "22", borderColor: theme.tint + "44" },
          ]}
        >
          <Feather name="lock" size={28} color={theme.tint} />
        </View>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          Misr Cash Book
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Enter your PIN to continue
        </Text>
      </View>

      <Animated.View
        style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}
      >
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i < entered.length
                    ? error
                      ? theme.expense
                      : theme.tint
                    : theme.border,
                borderColor:
                  i < entered.length
                    ? error
                      ? theme.expense
                      : theme.tint
                    : theme.textSecondary + "55",
              },
            ]}
          />
        ))}
      </Animated.View>

      {error && (
        <Text style={[styles.errorText, { color: theme.expense, fontFamily: "Inter_500Medium" }]}>
          Incorrect PIN
        </Text>
      )}

      <View style={styles.keypad}>
        {KEYS.map((row, ri) => (
          <View key={ri} style={styles.keyRow}>
            {row.map((digit) => (
              <KeypadButton
                key={digit}
                label={digit}
                onPress={() => handlePress(digit)}
                theme={theme}
              />
            ))}
          </View>
        ))}
        <View style={styles.keyRow}>
          <View style={styles.keyPlaceholder} />
          <KeypadButton label="0" onPress={() => handlePress("0")} theme={theme} />
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.keyButton,
              { opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <Feather name="delete" size={22} color={theme.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function KeypadButton({
  label,
  onPress,
  theme,
}: {
  label: string;
  onPress: () => void;
  theme: typeof Colors.dark;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.keyButton,
        {
          backgroundColor: pressed ? theme.surface : theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <Text
        style={[
          styles.keyLabel,
          { color: theme.text, fontFamily: "Inter_500Medium" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    gap: 12,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
  },
  subtitle: {
    fontSize: 15,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 20,
    marginVertical: 8,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  errorText: {
    fontSize: 14,
    marginTop: -4,
  },
  keypad: {
    width: "100%",
    maxWidth: 320,
    gap: 12,
    paddingHorizontal: 24,
  },
  keyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  keyButton: {
    flex: 1,
    height: 68,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  keyPlaceholder: {
    flex: 1,
    height: 68,
  },
  keyLabel: {
    fontSize: 24,
  },
});
