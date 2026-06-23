import React, { useState, useEffect } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateCurrencyFromRegion } from '@/utils/format';

const STORAGE_KEY = "user_profile_data";
const REGION_STORAGE_KEY = "user_selected_region";

// Region code mapping
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

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { user, logout } = useAuth();
  const { t, setLanguage, language } = useLanguage();
  
  const [showLanguageModal, setShowLanguageModal] = useState(false);
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

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive", 
          onPress: async () => {
            try {
              await logout();
              router.dismissAll();
              router.replace("/auth");
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleNavigate = (route: string) => {
    Haptics.selectionAsync();
    router.push(route as any);
  };

  const MenuItem = ({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.menuItemLeft}>
        <Feather name={icon as any} size={22} color={theme.tint} />
        <Text style={[styles.menuItemLabel, { color: theme.text }]}>{label}</Text>
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 16,
            borderBottomColor: theme.border,
            backgroundColor: theme.background,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          Settings
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 20 }]}
      >
        {/* User Card */}
        <Pressable
          style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => router.push("/account")}
        >
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.userAvatarImage} />
          ) : (
            <View style={styles.userAvatar}>
              <Feather name="user" size={32} color="#FFFFFF" />
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {profileName || user?.displayName || user?.email?.split('@')[0] || "User"}
            </Text>
            <Text style={[styles.userEmail, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {user?.email || "user@example.com"}
            </Text>
            <Text style={[styles.userCountry, { color: '#3B82F6', fontFamily: "Inter_500Medium" }]}>
              {selectedRegion}
            </Text>
          </View>
        </Pressable>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="map-pin"
            label="Region"
            onPress={() => setShowRegionModal(true)}
          />
          
          <MenuItem
            icon="shield"
            label="Tax Compliance"
            onPress={() => router.push("/compliance")}
          />
          
          <MenuItem
            icon="bar-chart-2"
            label="Analytics"
            onPress={() => router.push("/analytics")}
          />
          
          <MenuItem
            icon="globe"
            label="Language"
            onPress={() => setShowLanguageModal(true)}
          />
          
          <MenuItem
            icon="lock"
            label="Privacy Policy"
            onPress={() => router.push("/privacy-policy")}
          />
          
          <MenuItem
            icon="file-text"
            label="Legal Notices"
            onPress={() => router.push("/legal-notices")}
          />
          
          <MenuItem
            icon="help-circle"
            label="FAQ"
            onPress={() => router.push("/faq")}
          />
<MenuItem
  icon="help-circle"
  label="Help & Support"
  onPress={() => router.push("/help-support")}
/>
        </View>

        {/* Logout Button */}
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutBtn,
            {
              backgroundColor: theme.expense + '15',
              borderColor: theme.expense,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Feather name="log-out" size={20} color={theme.expense} />
          <Text style={[styles.logoutText, { color: theme.expense, fontFamily: "Inter_600SemiBold" }]}>
            Logout
          </Text>
        </Pressable>
      </ScrollView>

      {/* Language Modal */}
      <Modal visible={showLanguageModal} transparent animationType="slide" onRequestClose={() => setShowLanguageModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowLanguageModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Select Language</Text>
            {["en", "ar"].map((lang) => (
              <Pressable
                key={lang}
                onPress={() => {
                  setLanguage(lang as any);
                  setShowLanguageModal(false);
                  Haptics.selectionAsync();
                }}
                style={[styles.modalOption, { borderColor: theme.border, backgroundColor: language === lang ? theme.tint + '20' : 'transparent' }]}
              >
                <Text style={[styles.modalOptionText, { color: language === lang ? theme.tint : theme.text }]}>
                  {lang === "en" ? "English" : "العربية"}
                </Text>
                {language === lang && <Feather name="check" size={20} color={theme.tint} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Region Modal */}
      <Modal visible={showRegionModal} transparent animationType="slide" onRequestClose={() => setShowRegionModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowRegionModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Select Region</Text>
            {["Egypt", "UAE", "Saudi Arabia", "Kuwait", "Qatar", "Oman", "Bahrain"].map((region) => (
              <Pressable
  key={region}
  onPress={async () => {
    const regionCode = getRegionCode(region);
    setSelectedRegion(region);
    
    // THIS IS THE KEY FIX - Update currency cache and notify all components
    await updateCurrencyFromRegion(regionCode);
    
    setShowRegionModal(false);
    Haptics.selectionAsync();
    
    // Get the updated currency info for the alert message
    const { getCurrencyCode, getCurrencySymbol } = require('@/utils/format');
    Alert.alert(
      "Region Changed", 
      `${region} selected.\nCurrency updated to: ${getCurrencyCode()} (${getCurrencySymbol()})`
    );
  }}
  style={[styles.modalOption, { borderColor: theme.border, backgroundColor: selectedRegion === region ? theme.tint + '20' : 'transparent' }]}
>
                <Text style={[styles.modalOptionText, { color: selectedRegion === region ? theme.tint : theme.text }]}>
                  {region}
                </Text>
                {selectedRegion === region && <Feather name="check" size={20} color={theme.tint} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 24, flex: 1, textAlign: "center" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    gap: 16,
  },
  userAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#3B82F6',
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    resizeMode: "cover",
  },
  userInfo: { flex: 1, gap: 4 },
  userName: { fontSize: 18 },
  userEmail: { fontSize: 14 },
  userCountry: { fontSize: 14 },
  
  menuSection: { gap: 12, marginBottom: 24 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  menuItemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuItemLabel: { fontSize: 16, fontFamily: "Inter_500Medium" },
  
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 40,
  },
  logoutText: { fontSize: 16 },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "85%", maxWidth: 400, borderRadius: 20, padding: 24, gap: 16 },
  modalTitle: { fontSize: 20, marginBottom: 8, textAlign: "center" },
  modalOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
  modalOptionText: { fontSize: 16, fontFamily: "Inter_500Medium" },
});