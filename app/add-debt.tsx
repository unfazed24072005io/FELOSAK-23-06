import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";
import { parseAmount, isValidDateStr, getCurrencySymbol, getCurrencyCode, subscribeToCurrencyChanges } from "@/utils/format";

export default function AddDebtScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { addDebt, updateDebt, deleteDebt, debts } = useApp();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ editId?: string }>();
const [currencyRefreshKey, setCurrencyRefreshKey] = useState(0);

useEffect(() => {
  const unsubscribe = subscribeToCurrencyChanges(() => {
    console.log("Currency changed, refreshing add-debt screen");
    setCurrencyRefreshKey(prev => prev + 1);
  });
  return unsubscribe;
}, []);
const currencySymbol = getCurrencySymbol();
const currencyCode = getCurrencyCode();
  const editDebt = useMemo(
    () => (params.editId ? debts.find((d) => d.id === params.editId) : null),
    [params.editId, debts]
  );

  const [direction, setDirection] = useState<"owed_to_me" | "i_owe">(
    editDebt?.direction ?? "owed_to_me"
  );
  const [name, setName] = useState(editDebt?.name ?? "");
  const [amount, setAmount] = useState(editDebt ? String(editDebt.amount) : "");
  const [phone, setPhone] = useState(editDebt?.phone ?? "");
  const [note, setNote] = useState(editDebt?.note ?? "");
  const [dueDate, setDueDate] = useState(editDebt?.dueDate ?? "");

  const parsedAmount = useMemo(() => parseAmount(amount), [amount]);
  const dueDateValid = useMemo(
    () => dueDate === "" || isValidDateStr(dueDate),
    [dueDate]
  );
  const isValid = useMemo(
    () => name.trim().length > 0 && parsedAmount !== null && dueDateValid,
    [name, parsedAmount, dueDateValid]
  );

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleConfirmDeleteDebt = useCallback(() => {
    if (!editDebt) return;
    deleteDebt(editDebt.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowDeleteConfirm(false);
    router.back();
  }, [editDebt, deleteDebt]);

  const handleSave = useCallback(() => {
    if (!isValid || parsedAmount === null) return;
    if (dueDate && !isValidDateStr(dueDate)) {
      Alert.alert("Invalid Date", "Please enter a date in YYYY-MM-DD format.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editDebt) {
      updateDebt(editDebt.id, {
        direction,
        name: name.trim(),
        amount: parsedAmount,
        note,
        phone,
        dueDate,
      });
    } else {
      addDebt({
        direction,
        name: name.trim(),
        amount: parsedAmount,
        note,
        phone,
        dueDate,
        settled: false,
      });
    }
    router.back();
  }, [isValid, parsedAmount, dueDateValid, direction, name, phone, note, dueDate, editDebt, addDebt, updateDebt]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View key={currencyRefreshKey} style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Close" accessibilityRole="button">
          <Feather name="x" size={22} color={theme.textSecondary} />
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
        >
          {editDebt ? t("editEntry") : t("addEntry")}
        </Text>
        <View style={styles.headerRight}>
          {editDebt && (
            <Pressable
              onPress={() => setShowDeleteConfirm(true)}
              accessibilityLabel="Delete entry"
              accessibilityRole="button"
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Feather name="trash-2" size={20} color={theme.expense} />
            </Pressable>
          )}
          <Pressable
            onPress={handleSave}
            disabled={!isValid}
            accessibilityLabel={editDebt ? "Update entry" : "Save entry"}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor: isValid ? theme.tint : theme.tint + "44",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[styles.saveBtnTxt, { fontFamily: "Inter_600SemiBold" }]}>
              {editDebt ? t("update") : t("save")}
            </Text>
          </Pressable>
        </View>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 40 }]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        {/* Direction Toggle */}
        <View
          style={[
            styles.typeToggle,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setDirection("owed_to_me");
            }}
            style={[
              styles.typeBtn,
              direction === "owed_to_me" && {
                backgroundColor: theme.income + "22",
                borderColor: theme.income + "66",
              },
            ]}
          >
            <Feather
              name="arrow-down-left"
              size={16}
              color={direction === "owed_to_me" ? theme.income : theme.textSecondary}
            />
            <Text
              style={[
                styles.typeLabel,
                {
                  color: direction === "owed_to_me" ? theme.income : theme.textSecondary,
                  fontFamily: direction === "owed_to_me" ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {t("owedToMe")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setDirection("i_owe");
            }}
            style={[
              styles.typeBtn,
              direction === "i_owe" && {
                backgroundColor: theme.expense + "22",
                borderColor: theme.expense + "66",
              },
            ]}
          >
            <Feather
              name="arrow-up-right"
              size={16}
              color={direction === "i_owe" ? theme.expense : theme.textSecondary}
            />
            <Text
              style={[
                styles.typeLabel,
                {
                  color: direction === "i_owe" ? theme.expense : theme.textSecondary,
                  fontFamily: direction === "i_owe" ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {t("iOwe")}
            </Text>
          </Pressable>
        </View>

        {/* Name */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {t("nameCompany")}
          </Text>
          <View
            style={[
              styles.inputBox,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Feather name="user" size={16} color={theme.textSecondary} />
            <TextInput
              style={[
                styles.inputText,
                { color: theme.text, fontFamily: "Inter_400Regular" },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Enter name..."
              placeholderTextColor={theme.textSecondary + "88"}
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Phone */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {t("phone")} (optional)
          </Text>
          <View
            style={[
              styles.inputBox,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Feather name="phone" size={16} color={theme.textSecondary} />
            <TextInput
              style={[
                styles.inputText,
                { color: theme.text, fontFamily: "Inter_400Regular" },
              ]}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone..."
              placeholderTextColor={theme.textSecondary + "88"}
              keyboardType="phone-pad"
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Amount */}
        <View style={styles.section}>
  <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
    {t("amount")} ({currencyCode})
  </Text>
  <View
    style={[
      styles.amountRow,
      { backgroundColor: theme.card, borderColor: theme.border },
    ]}
  >
    <Text
      style={[styles.egpSymbol, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}
    >
      {currencySymbol}
    </Text>
            <TextInput
              style={[
                styles.amountInput,
                { color: theme.text, fontFamily: "Inter_700Bold" },
              ]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={theme.textSecondary + "88"}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Due Date */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {t("dueDate")} (optional)
          </Text>
          <View
            style={[
              styles.inputBox,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Feather name="calendar" size={16} color={theme.textSecondary} />
            <TextInput
              style={[
                styles.inputText,
                { color: theme.text, fontFamily: "Inter_400Regular" },
              ]}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textSecondary + "88"}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {t("note")} (optional)
          </Text>
          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                height: 80,
                alignItems: "flex-start",
                paddingTop: 12,
              },
            ]}
          >
            <TextInput
              style={[
                styles.inputText,
                {
                  color: theme.text,
                  fontFamily: "Inter_400Regular",
                  flex: 1,
                  textAlignVertical: "top",
                },
              ]}
              value={note}
              onChangeText={setNote}
              placeholder="Add a note..."
              placeholderTextColor={theme.textSecondary + "88"}
              multiline
            />
          </View>
        </View>
      </KeyboardAwareScrollView>

      {showDeleteConfirm && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowDeleteConfirm(false)}>
            <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {t("delete")}
              </Text>
              <Text style={[styles.modalMsg, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                Delete this entry for {editDebt?.name}? This cannot be undone.
              </Text>
              <View style={styles.modalBtns}>
                <Pressable
                  onPress={() => setShowDeleteConfirm(false)}
                  style={({ pressed }) => [styles.modalCancelBtn, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={[styles.modalCancelTxt, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>{t("cancel")}</Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirmDeleteDebt}
                  style={({ pressed }) => [styles.modalDeleteBtn, { backgroundColor: theme.expense, opacity: pressed ? 0.8 : 1 }]}
                  testID="confirm-delete-debt-btn"
                >
                  <Text style={[styles.modalDeleteTxt, { fontFamily: "Inter_600SemiBold" }]}>{t("delete")}</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>
      )}
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
  },
  headerTitle: { fontSize: 17 },
  headerRight: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12 },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnTxt: { color: "#FFF", fontSize: 15 },
  scroll: { paddingHorizontal: 20, gap: 20, paddingTop: 8 },
  typeToggle: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
    margin: 4,
  },
  typeLabel: { fontSize: 15 },
  section: { gap: 10 },
  label: { fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 10,
  },
  egpSymbol: { fontSize: 18 },
  amountInput: { flex: 1, fontSize: 32, paddingVertical: 12 },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  inputText: { flex: 1, fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 12,
  },
  modalTitle: { fontSize: 18, textAlign: "center" },
  modalMsg: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  modalCancelTxt: { fontSize: 15 },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalDeleteTxt: { color: "#FFF", fontSize: 15 },
});
