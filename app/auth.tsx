// app/auth.tsx
import React, { useCallback, useState, useEffect } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mode selection types
type DashboardMode = "personal" | "business";

// Key for storing mode preference
const MODE_STORAGE_KEY = "selected_dashboard_mode";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { login } = useAuth();
  
  // State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Mode selection state
  const [selectedDashboardMode, setSelectedDashboardMode] = useState<DashboardMode>("personal");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  // Load saved mode preference on mount
  useEffect(() => {
    const loadModePreference = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(MODE_STORAGE_KEY);
        console.log("📱 Loaded saved mode:", savedMode);
        if (savedMode === "personal" || savedMode === "business") {
          setSelectedDashboardMode(savedMode);
        }
      } catch (error) {
        console.error("Error loading mode preference:", error);
      }
    };
    loadModePreference();
  }, []);

  // Regular login
  const handleLogin = useCallback(async () => {
  setError("");
  if (!email.trim() || !password.trim()) {
    setError("Please fill in all fields");
    return;
  }
  setLoading(true);
  try {
    await login(email.trim(), password);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Store the mode with multiple keys to ensure it's picked up
    await AsyncStorage.setItem("selected_dashboard_mode", selectedDashboardMode);
    await AsyncStorage.setItem("selected_tab", selectedDashboardMode);
    await AsyncStorage.setItem("pending_dashboard_mode", selectedDashboardMode);
    await AsyncStorage.setItem("force_reload_tabs", Date.now().toString());
    
    console.log(`🚀 Stored mode: ${selectedDashboardMode}`);
    console.log(`🚀 Navigating to tabs with mode: ${selectedDashboardMode}`);
    
    // Navigate with mode in URL params
    router.replace({
      pathname: "/(tabs)",
      params: { 
        dashboardMode: selectedDashboardMode,
        _t: Date.now().toString()
      }
    });
  } catch (e: any) {
    const msg = e.message || "Something went wrong";
    const cleanMsg = msg.includes(":") ? msg.split(":").slice(1).join(":").trim() : msg;
    setError(cleanMsg);
  } finally {
    setLoading(false);
  }
}, [email, password, login, selectedDashboardMode]);

  const handleSignUp = () => {
    console.log("🔵 SIGN UP CLICKED - Navigating to onboarding");
    router.push("/onboarding");
  };

  // Handle mode selection
  const handleModeSelect = (mode: DashboardMode) => {
    console.log(`🔵 Mode selected: ${mode}`);
    setSelectedDashboardMode(mode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            borderBottomColor: theme.border,
            backgroundColor: theme.background,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="x" size={22} color={theme.textSecondary} />
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
        >
          Sign In
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        {/* Mode Selection */}
        <View style={styles.modeSelectionContainer}>
          <Text style={[styles.modeSelectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Select Dashboard Mode
          </Text>
          <Text style={[styles.modeSelectionSubtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Choose which dashboard you want to access after login
          </Text>
          
          <View style={styles.modeSelectionRow}>
            <Pressable
              onPress={() => handleModeSelect("personal")}
              style={[
                styles.modeSelectionOption,
                selectedDashboardMode === "personal" && styles.modeSelectionOptionActive,
                {
                  borderColor: selectedDashboardMode === "personal" ? "#3B82F6" : theme.border,
                  backgroundColor: selectedDashboardMode === "personal" ? "#EFF6FF" : theme.card,
                }
              ]}
            >
              <View style={[styles.modeIconCircle, { backgroundColor: "#3B82F620" }]}>
                <Feather name="user" size={24} color="#3B82F6" />
              </View>
              <Text style={[styles.modeOptionTitle, { 
                color: selectedDashboardMode === "personal" ? "#3B82F6" : theme.text,
                fontFamily: "Inter_600SemiBold" 
              }]}>
                Personal
              </Text>
              <Text style={[styles.modeOptionDescription, { 
                color: theme.textSecondary,
                fontFamily: "Inter_400Regular" 
              }]}>
                Your personal finances
              </Text>
              {selectedDashboardMode === "personal" && (
                <View style={styles.modeCheckmark}>
                  <Feather name="check-circle" size={20} color="#3B82F6" />
                </View>
              )}
            </Pressable>
            
            <Pressable
              onPress={() => handleModeSelect("business")}
              style={[
                styles.modeSelectionOption,
                selectedDashboardMode === "business" && styles.modeSelectionOptionActive,
                {
                  borderColor: selectedDashboardMode === "business" ? "#8B5CF6" : theme.border,
                  backgroundColor: selectedDashboardMode === "business" ? "#F3E8FF" : theme.card,
                }
              ]}
            >
              <View style={[styles.modeIconCircle, { backgroundColor: "#8B5CF620" }]}>
                <Feather name="briefcase" size={24} color="#8B5CF6" />
              </View>
              <Text style={[styles.modeOptionTitle, { 
                color: selectedDashboardMode === "business" ? "#8B5CF6" : theme.text,
                fontFamily: "Inter_600SemiBold" 
              }]}>
                Business
              </Text>
              <Text style={[styles.modeOptionDescription, { 
                color: theme.textSecondary,
                fontFamily: "Inter_400Regular" 
              }]}>
                Your business accounts
              </Text>
              {selectedDashboardMode === "business" && (
                <View style={[styles.modeCheckmark, { backgroundColor: "#8B5CF620" }]}>
                  <Feather name="check-circle" size={20} color="#8B5CF6" />
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.dividerContainer}>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Text style={[styles.dividerText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Login Details
          </Text>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
        </View>

        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: theme.tint + "22" }]}>
            <Feather name="users" size={40} color={theme.tint} />
          </View>
          <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Sign in to access your {selectedDashboardMode === "business" ? "business" : "personal"} dashboard
          </Text>
        </View>

        {/* Email Field */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Email *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
                fontFamily: "Inter_400Regular",
              },
            ]}
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            placeholderTextColor={theme.textSecondary + "88"}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
        </View>

        {/* Password Field */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Password *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text,
                fontFamily: "Inter_400Regular",
              },
            ]}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={theme.textSecondary + "88"}
            secureTextEntry
          />
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.expense + "22" }]}>
            <Text style={[styles.errorText, { color: theme.expense, fontFamily: "Inter_500Medium" }]}>
              {error}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleLogin}
          disabled={loading}
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: theme.tint,
              opacity: pressed || loading ? 0.7 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={[styles.submitText, { fontFamily: "Inter_600SemiBold" }]}>
              Sign In to {selectedDashboardMode === "business" ? "Business" : "Personal"}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={handleSignUp} style={styles.toggleBtn}>
          <Text style={[styles.toggleText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Don't have an account?{" "}
            <Text style={{ color: theme.tint, fontFamily: "Inter_600SemiBold" }}>
              Sign Up
            </Text>
          </Text>
        </Pressable>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17 },
  scroll: { padding: 20, gap: 16 },
  iconContainer: { alignItems: "center", gap: 12, paddingVertical: 20 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 22, maxWidth: 280 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, paddingLeft: 4 },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  errorBox: {
    borderRadius: 12,
    padding: 12,
  },
  errorText: { fontSize: 14, textAlign: "center" },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: { color: "#FFF", fontSize: 16 },
  toggleBtn: { alignItems: "center", paddingVertical: 12 },
  toggleText: { fontSize: 14 },
  
  // Mode Selection Styles
  modeSelectionContainer: {
    marginBottom: 8,
  },
  modeSelectionTitle: {
    fontSize: 18,
    marginBottom: 4,
    textAlign: "center",
  },
  modeSelectionSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },
  modeSelectionRow: {
    flexDirection: "row",
    gap: 12,
  },
  modeSelectionOption: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    position: "relative",
    minHeight: 120,
  },
  modeSelectionOptionActive: {
    borderWidth: 2,
  },
  modeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  modeOptionTitle: {
    fontSize: 16,
    marginBottom: 2,
  },
  modeOptionDescription: {
    fontSize: 12,
    textAlign: "center",
  },
  modeCheckmark: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  
  // Divider Styles
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 8,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
  },
});