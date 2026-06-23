import React, { useCallback, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const handleLogout = useCallback(async () => {
    setShowSignOutModal(false);
    await logout();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [logout]);

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
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel={t("goBack")}
          accessibilityRole="button"
        >
          <Feather name="x" size={22} color={theme.textSecondary} />
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
        >
          {t("account")}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.avatar, { backgroundColor: theme.tint + "22" }]}>
            <Feather name="user" size={32} color={theme.tint} />
          </View>
          <Text style={[styles.displayName, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {user?.displayName || "User"}
          </Text>
          <Text style={[styles.username, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            @{user?.username || "unknown"}
          </Text>
        </View>

        <Pressable
          onPress={() => setShowSignOutModal(true)}
          style={({ pressed }) => [
            styles.logoutBtn,
            {
              backgroundColor: theme.expense + "22",
              borderColor: theme.expense + "44",
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="log-out" size={18} color={theme.expense} />
          <Text style={[styles.logoutText, { color: theme.expense, fontFamily: "Inter_600SemiBold" }]}>
            {t("signOut")}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={showSignOutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSignOutModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t("signOut")}</Text>
            <Text style={styles.modalMessage}>{t("signOutConfirm")}</Text>
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowSignOutModal(false)}
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalCancelBtn,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={styles.modalCancelText}>{t("cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [
                  styles.modalBtn,
                  styles.modalConfirmBtn,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={styles.modalConfirmText}>{t("signOut")}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  content: { padding: 20, gap: 20 },
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  displayName: { fontSize: 20 },
  username: { fontSize: 14 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
  },
  logoutText: { fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  modalCard: {
    backgroundColor: "#0A1F15",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#C9A84C",
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#D4D4D4",
    textAlign: "center",
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalCancelBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#CCCCCC",
  },
  modalConfirmBtn: {
    backgroundColor: "#C9A84C",
  },
  modalConfirmText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#0A1F15",
  },
});
