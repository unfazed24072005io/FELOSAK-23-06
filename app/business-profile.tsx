import React, { useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";
export default function BusinessProfileScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { activeBook } = useApp();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Egypt");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [taxId, setTaxId] = useState("");
  const [registrationNo, setRegistrationNo] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [footerNote, setFooterNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const topPad = Platform.OS === "web" ? 20 : 16;

  useEffect(() => {
    if (activeBook?.isCloud && user) {
      const url = new URL(`/api/books/${activeBook.id}/business-profile`, getApiUrl());
      fetch(url.toString(), { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            setBusinessName(data.businessName || "");
            setAddress(data.address || "");
            setCity(data.city || "");
            setCountry(data.country || "Egypt");
            setPhone(data.phone || "");
            setEmail(data.email || "");
            setWebsite(data.website || "");
            setTaxId(data.taxId || "");
            setRegistrationNo(data.registrationNo || "");
            setBankName(data.bankName || "");
            setBankAccount(data.bankAccount || "");
            setBankIban(data.bankIban || "");
            setTermsAndConditions(data.termsAndConditions || "");
            setFooterNote(data.footerNote || "");
          }
        })
        .catch(() => {});
    }
  }, [activeBook, user]);

  const handleSave = useCallback(async () => {
    if (!businessName.trim()) return;
    if (!activeBook?.isCloud || !user) return;
    setSaving(true);
    try {
      const url = new URL(`/api/books/${activeBook.id}/business-profile`, getApiUrl());
      await apiRequest("PUT", url.toString(), {
        businessName,
        address,
        city,
        country,
        phone,
        email,
        website,
        taxId,
        registrationNo,
        bankName,
        bankAccount,
        bankIban,
        termsAndConditions,
        footerNote,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
    }
    setSaving(false);
  }, [
    businessName, address, city, country, phone, email, website,
    taxId, registrationNo, bankName, bankAccount, bankIban,
    termsAndConditions, footerNote, activeBook, user,
  ]);

  const renderField = (
    label: string,
    value: string,
    setter: (v: string) => void,
    icon: string,
    placeholder?: string,
    multiline?: boolean,
    keyboardType?: "default" | "email-address" | "phone-pad" | "url"
  ) => (
    <View style={styles.fieldGroup}>
      <View style={styles.fieldLabel}>
        <Feather name={icon as any} size={14} color={theme.textSecondary} />
        <Text style={[styles.fieldLabelText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
          {label}
        </Text>
      </View>
      <TextInput
        style={[
          styles.fieldInput,
          multiline && styles.fieldTextArea,
          {
            color: theme.text,
            backgroundColor: theme.surface,
            borderColor: theme.border,
            fontFamily: "Inter_400Regular",
          },
        ]}
        value={value}
        onChangeText={setter}
        placeholder={placeholder || label}
        placeholderTextColor={theme.textSecondary + "88"}
        multiline={multiline}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad, paddingBottom: insets.bottom + 40 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          {t("businessProfile")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {t("businessSettings")}
        </Text>
        {renderField(t("businessName"), businessName, setBusinessName, "briefcase")}
        {renderField(t("businessAddress"), address, setAddress, "map-pin")}
        {renderField(t("businessCity"), city, setCity, "map")}
        {renderField(t("businessCountry"), country, setCountry, "globe")}
        {renderField(t("businessPhone"), phone, setPhone, "phone", undefined, false, "phone-pad")}
        {renderField(t("businessEmail"), email, setEmail, "mail", undefined, false, "email-address")}
        {renderField(t("businessWebsite"), website, setWebsite, "link", undefined, false, "url")}
      </View>

      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {t("taxIdLabel")}
        </Text>
        {renderField(t("taxIdLabel"), taxId, setTaxId, "hash")}
        {renderField(t("registrationNo"), registrationNo, setRegistrationNo, "file-text")}
      </View>

      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {t("bankNameLabel")}
        </Text>
        {renderField(t("bankNameLabel"), bankName, setBankName, "credit-card")}
        {renderField(t("bankAccountLabel"), bankAccount, setBankAccount, "hash")}
        {renderField(t("bankIbanLabel"), bankIban, setBankIban, "key")}
      </View>

      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {t("termsAndConditions")}
        </Text>
        {renderField(t("termsAndConditions"), termsAndConditions, setTermsAndConditions, "file-text", undefined, true)}
        {renderField(t("footerNote"), footerNote, setFooterNote, "edit-3", undefined, true)}
      </View>

      {saved ? (
        <View style={[styles.successBanner, { backgroundColor: theme.income + "18", borderColor: theme.income + "44" }]}>
          <Feather name="check-circle" size={16} color={theme.income} />
          <Text style={[styles.successText, { color: theme.income, fontFamily: "Inter_500Medium" }]}>
            {t("profileSaved")}
          </Text>
        </View>
      ) : null}
      {saveError ? (
        <View style={[styles.successBanner, { backgroundColor: theme.expense + "18", borderColor: theme.expense + "44" }]}>
          <Feather name="alert-circle" size={16} color={theme.expense} />
          <Text style={[styles.successText, { color: theme.expense, fontFamily: "Inter_500Medium" }]}>
            Failed to save. Please try again.
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={handleSave}
        disabled={saving || !businessName.trim()}
        style={({ pressed }) => [
          styles.saveBtn,
          {
            backgroundColor: businessName.trim() ? theme.tint : theme.textSecondary + "44",
            opacity: pressed ? 0.85 : saving ? 0.6 : 1,
          },
        ]}
        testID="save-profile-btn"
      >
        <Feather name="save" size={18} color="#FFF" />
        <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>
          {t("saveProfile")}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: { fontSize: 20 },
  section: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, marginBottom: 14 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  fieldLabelText: { fontSize: 12 },
  fieldInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  fieldTextArea: { minHeight: 80 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  saveBtnText: { color: "#FFF", fontSize: 16 },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  successText: { fontSize: 13 },
});
