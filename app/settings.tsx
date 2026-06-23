import React, { useCallback, useState, useEffect } from "react";
import { loadCurrency, updateCurrencyFromRegion } from '@/utils/format';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = "user_profile_data";
const REGION_STORAGE_KEY = "user_selected_region";

const MODAL_BG = "#0A1F15";
const MODAL_GOLD = "#C9A84C";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { pin, setPin, lock, activeBook } = useApp();
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [step, setStep] = useState<"idle" | "enter" | "confirm">("idle");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [showRemovePinModal, setShowRemovePinModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("Egypt");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  // Load saved region on mount
  useEffect(() => {
    const loadSavedRegion = async () => {
      try {
        const savedRegionCode = await AsyncStorage.getItem(REGION_STORAGE_KEY);
        if (savedRegionCode) {
          const regionName = getRegionName(savedRegionCode);
          setSelectedRegion(regionName);
        }
      } catch (error) {
        console.error("Error loading region:", error);
      }
    };
    loadSavedRegion();
  }, []);

  // Load profile data when component mounts
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        const userId = user.id;
        const savedData = await AsyncStorage.getItem(`${STORAGE_KEY}_${userId}`);
        if (savedData) {
          const profile = JSON.parse(savedData);
          setProfilePhoto(profile.photo || null);
          setProfileName(profile.name || "");
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };
    loadProfile();
  }, [user]);

  const getRegionCode = (regionName: string): string => {
    const map: Record<string, string> = {
      "Egypt": "EG",
      "UAE": "AE",
      "Saudi Arabia": "SA",
      "Kuwait": "KW",
      "Qatar": "QA",
      "Oman": "OM",
      "Bahrain": "BH"
    };
    return map[regionName] || "EG";
  };

  const getRegionName = (regionCode: string): string => {
    const map: Record<string, string> = {
      "EG": "Egypt",
      "AE": "UAE",
      "SA": "Saudi Arabia",
      "KW": "Kuwait",
      "QA": "Qatar",
      "OM": "Oman",
      "BH": "Bahrain"
    };
    return map[regionCode] || "Egypt";
  };

  const handleSetPin = useCallback(() => {
    if (step === "idle") {
      setStep("enter");
      setNewPin("");
      setConfirmPin("");
      setError("");
    } else if (step === "enter") {
      if (newPin.length < 4) {
        setError(t("pinMinDigits"));
        return;
      }
      setStep("confirm");
      setError("");
    } else if (step === "confirm") {
      if (confirmPin !== newPin) {
        setError(t("pinsDontMatch"));
        setStep("enter");
        setNewPin("");
        setConfirmPin("");
        return;
      }
      setPin(newPin);
      setStep("idle");
      setError("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t("pinSet"), t("pinSetMessage"));
    }
  }, [step, newPin, confirmPin, setPin, t]);

  const handleRemovePin = useCallback(() => {
    setShowRemovePinModal(true);
  }, []);

  const confirmRemovePin = useCallback(() => {
    setShowRemovePinModal(false);
    setPin(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [setPin]);

  const handleLogout = useCallback(() => {
    setShowSignOutModal(true);
  }, []);

  const confirmLogout = useCallback(() => {
    setShowSignOutModal(false);
    logout();
    router.back();
  }, [logout]);

  const handleNavigate = (route: string) => {
    Haptics.selectionAsync();
    router.push(route as any);
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
        // In SettingsScreen, replace the back button Pressable:
<Pressable 
  onPress={() => router.push("/(tabs)")}  // ← Change this to go to home
  accessibilityLabel="Go to home" 
  accessibilityRole="button"
>
  <Feather name="arrow-left" size={22} color={theme.text} />
</Pressable>
        <Text
          style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
        >
          {t("settings")}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPad + 40 },
        ]}
      >
        {/* User Profile Card */}
        {user && (
          <Pressable
            style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => router.push("/account")}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.profileAvatarImage} />
            ) : (
              <View style={[styles.profileAvatar, { backgroundColor: theme.tint + "22" }]}>
                <Feather name="user" size={24} color={theme.tint} />
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {profileName || user?.displayName || user?.email?.split('@')[0] || "User"}
              </Text>
              <Text style={[styles.profileEmail, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {user?.email || "user@example.com"}
              </Text>
              <Text style={[styles.userCountry, { color: '#3B82F6', fontFamily: "Inter_500Medium" }]}>
                {selectedRegion}
              </Text>
            </View>
            <Pressable onPress={() => router.push("/account")} hitSlop={8}>
              <Feather name="edit-2" size={16} color={theme.tint} />
            </Pressable>
          </Pressable>
        )}

        {activeBook?.isCloud && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              {t("bookSettings")}
            </Text>
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <SettingsRow
                icon="users"
                title={t("businessTeam")}
                subtitle={t("addRemoveChangeRole")}
                theme={theme}
                onPress={() => {
                  if (activeBook) {
                    router.push({ pathname: "/business-team", params: { bookId: activeBook.id } });
                  }
                }}
              />
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <SettingsRow
                icon="sliders"
                title={t("businessSettings")}
                subtitle={t("settingsSpecificBusiness")}
                theme={theme}
                onPress={() => {
                  Alert.alert(t("comingSoon"), t("comingSoonMessage"));
                }}
              />
            </View>
          </View>
        )}

        {/* General Settings Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            General
          </Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <SettingsRow
              icon="map-pin"
              title="Region"
              subtitle={selectedRegion}
              theme={theme}
              badge={selectedRegion === "Egypt" ? "EG" : selectedRegion === "UAE" ? "AE" : selectedRegion === "Saudi Arabia" ? "SA" : selectedRegion === "Kuwait" ? "KW" : selectedRegion === "Qatar" ? "QA" : selectedRegion === "Oman" ? "OM" : "BH"}
              badgeColor={theme.tint}
              onPress={() => setShowRegionModal(true)}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="shield"
              title="Tax Compliance"
              subtitle="Tax rates & requirements"
              theme={theme}
              onPress={() => handleNavigate("/compliance")}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="bar-chart-2"
              title="Analytics"
              subtitle="Business insights"
              theme={theme}
              onPress={() => handleNavigate("/analytics")}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="globe"
              title={t("language")}
              subtitle={language === "en" ? "English" : "العربية"}
              theme={theme}
              badge={language.toUpperCase()}
              badgeColor={theme.tint}
              onPress={() => {
                const next = language === "en" ? "ar" : "en";
                setLanguage(next as any);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="lock"
              title={t("security")}
              subtitle={pin ? t("pinEnabled") : t("setPinLock")}
              theme={theme}
              badge={pin ? "ON" : undefined}
              badgeColor={theme.income}
              onPress={() => {
                if (pin) {
                  Alert.alert(t("pinLockTitle"), t("pinLockActive"), [
                    { text: t("changePin"), onPress: () => { setStep("enter"); setNewPin(""); setConfirmPin(""); setError(""); } },
                    { text: t("removePin"), style: "destructive", onPress: handleRemovePin },
                    { text: t("cancel"), style: "cancel" },
                  ]);
                } else {
                  setStep("enter");
                  setNewPin("");
                  setConfirmPin("");
                  setError("");
                }
              }}
            />
            {step !== "idle" && (
              <View style={styles.pinSetupBox}>
                <Text style={[styles.pinPrompt, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {step === "enter" ? t("enterNewPin") : t("confirmYourPin")}
                </Text>
                <TextInput
                  style={[
                    styles.pinInput,
                    {
                      backgroundColor: theme.surface,
                      color: theme.text,
                      borderColor: error ? theme.expense : theme.border,
                      fontFamily: "Inter_700Bold",
                    },
                  ]}
                  value={step === "enter" ? newPin : confirmPin}
                  onChangeText={step === "enter" ? setNewPin : setConfirmPin}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                  placeholder="----"
                  placeholderTextColor={theme.textSecondary + "88"}
                  textAlign="center"
                />
                {error ? (
                  <Text style={[styles.errorTxt, { color: theme.expense, fontFamily: "Inter_400Regular" }]}>
                    {error}
                  </Text>
                ) : null}
                <View style={styles.pinBtnRow}>
                  <Pressable
                    onPress={() => { setStep("idle"); setError(""); }}
                    style={({ pressed }) => [
                      styles.pinCancelBtn,
                      { borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
                    ]}
                  >
                    <Text style={[styles.pinCancelTxt, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                      {t("cancel")}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSetPin}
                    style={({ pressed }) => [
                      styles.pinConfirmBtn,
                      { backgroundColor: theme.tint, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Text style={[styles.pinConfirmTxt, { fontFamily: "Inter_600SemiBold" }]}>
                      {step === "enter" ? t("next") : t("confirm")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="lock"
              title="Privacy Policy"
              subtitle="Data protection & privacy"
              theme={theme}
              onPress={() => handleNavigate("/privacy-policy")}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="file-text"
              title="Legal Notices"
              subtitle="Disclaimer & liability"
              theme={theme}
              onPress={() => handleNavigate("/legal-notices")}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="help-circle"
              title="FAQ"
              subtitle="Frequently asked questions"
              theme={theme}
              onPress={() => handleNavigate("/faq")}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="headphones"
              title="Help & Support"
              subtitle="Contact us & support tickets"
              theme={theme}
              onPress={() => handleNavigate("/help-support")}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="credit-card"
              title={t("subscription")}
              subtitle={t("managePlan")}
              theme={theme}
              onPress={() => router.push("/subscription")}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="credit-card"
              title={t("subscription")}
              subtitle={t("managePlan")}
              theme={theme}
              onPress={() => router.push("/subscription")}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <SettingsRow
              icon="info"
              title={t("about")}
              subtitle={t("version")}
              theme={theme}
              onPress={() => {
                Alert.alert(
                  t("appName"),
                  t("version") + "\n\n" + t("aboutDescription"),
                );
              }}
            />
          </View>
        </View>

        {pin && step === "idle" && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              lock();
            }}
            style={({ pressed }) => [
              styles.lockBtn,
              { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="lock" size={16} color={theme.tint} />
            <Text style={[styles.lockBtnText, { color: theme.tint, fontFamily: "Inter_500Medium" }]}>
              {t("lockAppNow")}
            </Text>
          </Pressable>
        )}

        {user && (
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.logoutBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Feather name="log-out" size={18} color={theme.expense} />
            <Text style={[styles.logoutText, { color: theme.expense, fontFamily: "Inter_500Medium" }]}>
              {t("signOut")}
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Region Modal */}
      <Modal visible={showRegionModal} transparent animationType="slide" onRequestClose={() => setShowRegionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainerLight, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitleLight, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Select Region</Text>
            {["Egypt", "UAE", "Saudi Arabia", "Kuwait", "Qatar", "Oman", "Bahrain"].map((region) => (
              <Pressable
                key={region}
                onPress={async () => {
  const regionCode = getRegionCode(region);
  setSelectedRegion(region);
  // CRITICAL: Use updateCurrencyFromRegion instead of loadCurrency
  await updateCurrencyFromRegion(regionCode);
  setShowRegionModal(false);
  Haptics.selectionAsync();
  const { getCurrencyCode, getCurrencySymbol } = require('@/utils/format');
  Alert.alert("Region Changed", `${region} selected.\nCurrency updated to: ${getCurrencyCode()} (${getCurrencySymbol()})`);
}}
                style={[styles.modalOptionLight, { borderColor: theme.border, backgroundColor: selectedRegion === region ? theme.tint + '20' : 'transparent' }]}
              >
                <Text style={[styles.modalOptionTextLight, { color: selectedRegion === region ? theme.tint : theme.text }]}>
                  {region}
                </Text>
                {selectedRegion === region && <Feather name="check" size={18} color={theme.tint} />}
              </Pressable>
            ))}
            <Pressable onPress={() => setShowRegionModal(false)} style={[styles.closeBtn, { backgroundColor: theme.tint }]}>
              <Text style={[styles.closeBtnText, { color: "#FFF" }]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Remove Pin Modal */}
      <Modal
        visible={showRemovePinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRemovePinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{t("removePin")}</Text>
            <Text style={styles.modalMessage}>{t("removePinConfirm")}</Text>
            <View style={styles.modalBtnRow}>
              <Pressable
                onPress={() => setShowRemovePinModal(false)}
                style={({ pressed }) => [styles.modalCancelBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={styles.modalCancelText}>{t("cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={confirmRemovePin}
                style={({ pressed }) => [styles.modalDeleteBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={styles.modalDeleteText}>{t("delete")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sign Out Modal */}
      <Modal
        visible={showSignOutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{t("signOut")}</Text>
            <Text style={styles.modalMessage}>{t("signOutConfirm")}</Text>
            <View style={styles.modalBtnRow}>
              <Pressable
                onPress={() => setShowSignOutModal(false)}
                style={({ pressed }) => [styles.modalCancelBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={styles.modalCancelText}>{t("cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={confirmLogout}
                style={({ pressed }) => [styles.modalDeleteBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={styles.modalDeleteText}>{t("signOut")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SettingsRow({
  icon,
  title,
  subtitle,
  theme,
  badge,
  badgeColor,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  theme: typeof Colors.dark;
  badge?: string;
  badgeColor?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.settingsRow, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: theme.tint + "18" }]}>
        <Feather name={icon as any} size={18} color={theme.tint} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
          {title}
        </Text>
        <Text style={[styles.rowSubtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          {subtitle}
        </Text>
      </View>
      {badge && (
        <View style={[styles.badge, { backgroundColor: (badgeColor || theme.tint) + "22" }]}>
          <Text style={[styles.badgeText, { color: badgeColor || theme.tint, fontFamily: "Inter_600SemiBold" }]}>
            {badge}
          </Text>
        </View>
      )}
      <Feather name="chevron-right" size={16} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18 },
  scrollContent: { paddingTop: 16 },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 14,
    resizeMode: "cover",
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16 },
  profileEmail: { fontSize: 13, marginTop: 2 },
  userCountry: { fontSize: 12, marginTop: 2 },

  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 60 },

  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 15 },
  rowSubtitle: { fontSize: 12, marginTop: 1 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 11 },

  pinSetupBox: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  pinPrompt: { fontSize: 14, textAlign: "center" },
  pinInput: {
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 22,
    paddingVertical: 10,
    letterSpacing: 8,
  },
  errorTxt: { fontSize: 12, textAlign: "center" },
  pinBtnRow: { flexDirection: "row", gap: 10 },
  pinCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  pinCancelTxt: { fontSize: 14 },
  pinConfirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  pinConfirmTxt: { color: "#FFF", fontSize: 14 },

  lockBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  lockBtnText: { fontSize: 15 },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoutText: { fontSize: 16 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: MODAL_BG,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: MODAL_GOLD + "33",
  },
  modalContainerLight: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: MODAL_GOLD,
    marginBottom: 8,
    textAlign: "center",
  },
  modalTitleLight: {
    fontSize: 20,
    marginBottom: 16,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#D4D4D4",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MODAL_GOLD + "44",
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: MODAL_GOLD,
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: MODAL_GOLD,
    alignItems: "center",
  },
  modalDeleteText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: MODAL_BG,
  },
  modalOptionLight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalOptionTextLight: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  closeBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  closeBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});