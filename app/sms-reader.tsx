import React, { useCallback, useState } from "react";
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
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";
import {formatAmount, getCurrencyCode, getCurrencySymbol, subscribeToCurrencyChanges } from "@/utils/format";

interface ParsedSMS {
  amount: number;
  type: "income" | "expense";
  sender: string;
  note: string;
  date: string;
}

function parseSMSMessage(text: string): ParsedSMS | null {
  const amountPatterns = [
    /(?:EGP|egp|LE|le|ج\.م|جنيه)\s*([0-9,]+\.?\d*)/i,
    /([0-9,]+\.?\d*)\s*(?:EGP|egp|LE|le|ج\.م|جنيه)/i,
    /(?:amount|مبلغ|قيمة)\s*:?\s*([0-9,]+\.?\d*)/i,
    /(?:transferred|paid|received|debited|credited|sent|deposit)\s*(?:of|:)?\s*(?:EGP|egp|LE)?\s*([0-9,]+\.?\d*)/i,
    /([0-9,]+\.?\d{2})\s/,
  ];

  let amount = 0;
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      amount = parseFloat(match[1].replace(/,/g, ""));
      if (amount > 0) break;
    }
  }

  if (amount <= 0) return null;

  const lower = text.toLowerCase();
  const isExpense =
    lower.includes("debit") ||
    lower.includes("paid") ||
    lower.includes("purchase") ||
    lower.includes("withdrawn") ||
    lower.includes("sent") ||
    lower.includes("transfer to") ||
    lower.includes("payment") ||
    lower.includes("سحب") ||
    lower.includes("دفع") ||
    lower.includes("تحويل");

  const isIncome =
    lower.includes("credit") ||
    lower.includes("received") ||
    lower.includes("deposit") ||
    lower.includes("salary") ||
    lower.includes("refund") ||
    lower.includes("إيداع") ||
    lower.includes("استلام") ||
    lower.includes("راتب");

  const type = isExpense ? "expense" : isIncome ? "income" : "expense";

  let sender = "";
  const fromMatch = text.match(/(?:from|From|FROM)\s+([A-Za-z\s]+?)(?:\.|,|\n|$)/);
  const atMatch = text.match(/(?:at|At|AT)\s+([A-Za-z\s]+?)(?:\.|,|\n|$)/);
  if (fromMatch) sender = fromMatch[1].trim();
  else if (atMatch) sender = atMatch[1].trim();

  const today = new Date().toISOString().split("T")[0];

  return {
    amount,
    type,
    sender: sender || "SMS Transaction",
    note: text.substring(0, 100),
    date: today,
  };
}

export default function SMSReaderScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { addTransaction, activeBook } = useApp();
  const { t } = useLanguage();

  const [smsText, setSmsText] = useState("");
  const [parsed, setParsed] = useState<ParsedSMS | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
const [refreshKey, setRefreshKey] = useState(0);
const currencyCode = getCurrencyCode();
const currencySymbol = getCurrencySymbol();

useEffect(() => {
  const unsubscribe = subscribeToCurrencyChanges(() => {
    console.log("Currency changed, refreshing sms-reader screen");
    setRefreshKey(prev => prev + 1);
  });
  return unsubscribe;
}, []);
const formatAmount = (amount: number) => `${currencyCode} ${amount.toLocaleString('en-EG')}`;
  const topPad = Platform.OS === "web" ? 20 : 16;

  const handleParse = useCallback(() => {
    if (!smsText.trim()) {
      setError(t("noSmsContent"));
      setParsed(null);
      return;
    }
    const result = parseSMSMessage(smsText);
    if (result) {
      setParsed(result);
      setError("");
      setSuccess("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setParsed(null);
      setError(t("smsParseError"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [smsText, t]);

  const handleAddTransaction = useCallback(
    (type: "income" | "expense") => {
      if (!parsed || !activeBook) return;
      addTransaction({
        type,
        amount: parsed.amount,
        category: type === "income" ? "Other Income" : "Other Expense",
        note: parsed.note,
        date: parsed.date,
        paymentMode: "other",
        attachment: "",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(t("smsSuccess"));
      setParsed(null);
      setSmsText("");
    },
    [parsed, activeBook, addTransaction, t]
  );

  return (
    <ScrollView
  key={refreshKey}
  style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad, paddingBottom: insets.bottom + 40 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          {t("smsReader")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
        {t("smsReaderDesc")}
      </Text>

      <View style={[styles.inputCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.inputLabel}>
          <Feather name="message-square" size={16} color={theme.tint} />
          <Text style={[styles.labelText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {t("pasteSms")}
          </Text>
        </View>
        <TextInput
          style={[
            styles.textArea,
            {
              color: theme.text,
              backgroundColor: theme.surface,
              borderColor: theme.border,
              fontFamily: "Inter_400Regular",
            },
          ]}
          value={smsText}
          onChangeText={setSmsText}
          placeholder={t("smsPlaceholder")}
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          testID="sms-input"
        />
        <Pressable
          onPress={handleParse}
          style={({ pressed }) => [
            styles.parseBtn,
            { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
          ]}
          testID="parse-sms-btn"
        >
          <Feather name="search" size={18} color="#FFF" />
          <Text style={[styles.parseBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            {t("parseSms")}
          </Text>
        </Pressable>
      </View>

      {error ? (
        <View style={[styles.alertCard, { backgroundColor: theme.expense + "18", borderColor: theme.expense + "44" }]}>
          <Feather name="alert-circle" size={18} color={theme.expense} />
          <Text style={[styles.alertText, { color: theme.expense, fontFamily: "Inter_500Medium" }]}>
            {error}
          </Text>
        </View>
      ) : null}

      {success ? (
        <View style={[styles.alertCard, { backgroundColor: theme.income + "18", borderColor: theme.income + "44" }]}>
          <Feather name="check-circle" size={18} color={theme.income} />
          <Text style={[styles.alertText, { color: theme.income, fontFamily: "Inter_500Medium" }]}>
            {success}
          </Text>
        </View>
      ) : null}

      {parsed ? (
        <View style={[styles.resultCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.resultTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {t("detectedTransactions")}
          </Text>

          <View style={[styles.resultRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.resultLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              {t("smsAmount")}
            </Text>
            <Text style={[styles.resultValue, { color: theme.tint, fontFamily: "Inter_700Bold" }]}>
              {formatEGP(parsed.amount)}
            </Text>
          </View>

          {parsed.sender ? (
            <View style={[styles.resultRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.resultLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                {t("smsSender")}
              </Text>
              <Text style={[styles.resultValue, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                {parsed.sender}
              </Text>
            </View>
          ) : null}

          <View style={[styles.resultRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.resultLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              {t("smsType")}
            </Text>
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor:
                    parsed.type === "income" ? theme.income + "22" : theme.expense + "22",
                },
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  {
                    color: parsed.type === "income" ? theme.income : theme.expense,
                    fontFamily: "Inter_600SemiBold",
                  },
                ]}
              >
                {parsed.type === "income" ? t("cashIn") : t("cashOut")}
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => handleAddTransaction("income")}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: theme.income, opacity: pressed ? 0.85 : 1 },
              ]}
              testID="add-cash-in-btn"
            >
              <Feather name="arrow-down-left" size={16} color="#FFF" />
              <Text style={[styles.actionBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                {t("addAsCashIn")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleAddTransaction("expense")}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: theme.expense, opacity: pressed ? 0.85 : 1 },
              ]}
              testID="add-cash-out-btn"
            >
              <Feather name="arrow-up-right" size={16} color="#FFF" />
              <Text style={[styles.actionBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                {t("addAsCashOut")}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
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
    marginBottom: 8,
  },
  title: { fontSize: 20 },
  subtitle: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
  inputCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  inputLabel: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  labelText: { fontSize: 14 },
  textArea: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 14,
    minHeight: 120,
    lineHeight: 20,
  },
  parseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  parseBtnText: { color: "#FFF", fontSize: 15 },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  alertText: { fontSize: 13, flex: 1 },
  resultCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  resultTitle: { fontSize: 16, marginBottom: 16 },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultLabel: { fontSize: 13 },
  resultValue: { fontSize: 15 },
  typeBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { fontSize: 12 },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionBtnText: { color: "#FFF", fontSize: 13 },
});
