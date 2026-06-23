import React, { useCallback, useMemo, useState } from "react";
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
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";
import { formatAmount, getCurrencyCode, getCurrencySymbol, subscribeToCurrencyChanges } from "@/utils/format";

interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

function genId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 11);
}

export default function CreateInvoiceScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { activeBook } = useApp();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: genId(), name: "", quantity: 1, unitPrice: 0, total: 0 },
  ]);
  const [taxRate, setTaxRate] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
const [refreshKey, setRefreshKey] = useState(0);
const currencyCode = getCurrencyCode();
const currencySymbol = getCurrencySymbol();

useEffect(() => {
  const unsubscribe = subscribeToCurrencyChanges(() => {
    console.log("Currency changed, refreshing create-invoice screen");
    setRefreshKey(prev => prev + 1);
  });
  return unsubscribe;
}, []);
const formatAmount = (amount: number) => `${currencyCode} ${amount.toLocaleString('en-EG')}`;
  const topPad = Platform.OS === "web" ? 20 : 16;

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items]
  );

  const taxAmount = useMemo(
    () => (subtotal * parseFloat(taxRate || "0")) / 100,
    [subtotal, taxRate]
  );

  const discountAmount = useMemo(() => Math.max(0, parseFloat(discount || "0") || 0), [discount]);
  const grandTotal = useMemo(() => subtotal + taxAmount - discountAmount, [subtotal, taxAmount, discountAmount]);

  const invoiceNumber = useMemo(
    () => "INV-" + Date.now().toString().slice(-6),
    []
  );

  const updateItem = useCallback(
    (id: string, field: keyof InvoiceItem, value: string) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const updated = { ...item };
          if (field === "name") updated.name = value;
          else if (field === "quantity") updated.quantity = parseInt(value) || 0;
          else if (field === "unitPrice") updated.unitPrice = parseFloat(value) || 0;
          updated.total = updated.quantity * updated.unitPrice;
          return updated;
        })
      );
    },
    []
  );

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { id: genId(), name: "", quantity: 1, unitPrice: 0, total: 0 },
    ]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const [errorMsg, setErrorMsg] = useState("");

  const handleSave = useCallback(async () => {
    if (!clientName.trim()) {
      setErrorMsg(t("clientName") + " is required");
      return;
    }
    if (!activeBook?.isCloud || !user) {
      setErrorMsg("Invoices require a cloud book and sign-in");
      return;
    }
    setErrorMsg("");
    setSaving(true);
    try {
      const safeTax = Math.max(0, parseFloat(taxRate || "0") || 0);
      const safeDiscount = Math.max(0, parseFloat(discount || "0") || 0);
      const url = new URL(`/api/books/${activeBook.id}/invoices`, getApiUrl());
      await apiRequest("POST", url.toString(), {
        invoiceNumber,
        clientName,
        clientEmail,
        clientPhone,
        clientAddress,
        issueDate,
        dueDate,
        items: JSON.stringify(items),
        subtotal,
        taxRate: safeTax,
        taxAmount,
        discount: safeDiscount,
        total: grandTotal,
        notes,
        status: "draft",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to save invoice. Please try again.");
    }
    setSaving(false);
  }, [
    clientName, clientEmail, clientPhone, clientAddress,
    issueDate, dueDate, items, subtotal, taxRate, taxAmount,
    discountAmount, grandTotal, notes, invoiceNumber, activeBook, user, t, discount,
  ]);

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const handleGeneratePdf = useCallback(async () => {
    let profileData: any = null;
    if (activeBook?.isCloud && user) {
      try {
        const url = new URL(`/api/books/${activeBook.id}/business-profile`, getApiUrl());
        const resp = await fetch(url.toString(), { credentials: "include" });
        if (resp.ok) profileData = await resp.json();
      } catch (e) {}
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 40px; color: #1a1a1a; background: #fff; }
  .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .company-info h1 { font-size: 24px; margin: 0 0 4px; color: #2563EB; }
  .company-info p { margin: 2px 0; font-size: 12px; color: #666; }
  .invoice-title { text-align: right; }
  .invoice-title h2 { font-size: 28px; margin: 0; color: #1a1a1a; letter-spacing: 2px; }
  .invoice-title p { margin: 4px 0; font-size: 12px; color: #666; }
  .client-section { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
  .client-section h3 { font-size: 11px; text-transform: uppercase; color: #94a3b8; margin: 0 0 8px; letter-spacing: 1px; }
  .client-section p { margin: 2px 0; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  th { background: #0f172a; color: #fff; padding: 12px 16px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
  th:last-child { text-align: right; }
  td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  td:last-child { text-align: right; }
  .totals { margin-left: auto; width: 280px; }
  .totals .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; }
  .totals .row.grand { border-top: 2px solid #0f172a; font-weight: 700; font-size: 16px; padding-top: 12px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
</style>
</head>
<body>
<div class="header">
  <div class="company-info">
    <h1>${esc(profileData?.businessName || activeBook?.name || "Feloosak")}</h1>
    ${profileData?.address ? `<p>${esc(profileData.address)}</p>` : ""}
    ${profileData?.city ? `<p>${esc(profileData.city)}, ${esc(profileData.country || "Egypt")}</p>` : ""}
    ${profileData?.phone ? `<p>Tel: ${esc(profileData.phone)}</p>` : ""}
    ${profileData?.email ? `<p>${esc(profileData.email)}</p>` : ""}
    ${profileData?.taxId ? `<p>Tax ID: ${esc(profileData.taxId)}</p>` : ""}
  </div>
  <div class="invoice-title">
    <h2>INVOICE</h2>
    <p><strong>${esc(invoiceNumber)}</strong></p>
    <p>Date: ${esc(issueDate)}</p>
    ${dueDate ? `<p>Due: ${esc(dueDate)}</p>` : ""}
  </div>
</div>
<div class="client-section">
  <h3>Bill To</h3>
  <p><strong>${esc(clientName)}</strong></p>
  ${clientAddress ? `<p>${esc(clientAddress)}</p>` : ""}
  ${clientPhone ? `<p>Tel: ${esc(clientPhone)}</p>` : ""}
  ${clientEmail ? `<p>${esc(clientEmail)}</p>` : ""}
</div>
<table>
  <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
  <tbody>
    ${items.filter(i => i.name).map(i => `<tr><td>${esc(i.name)}</td><td>${i.quantity}</td><td>${formatAmount(i.unitPrice)}</td><td>${formatAmount(i.quantity * i.unitPrice)}</td></tr>`).join("")}
  </tbody>
</table>
<div class="totals">
  <div class="row"><span>Subtotal</span><span>${formatAmount(subtotal)}</span></div>
  ${parseFloat(taxRate || "0") > 0 ? `<div class="row"><span>Tax (${taxRate}%)</span><span>${formatAmount(taxAmount)}</span></div>` : ""}
  ${discountAmount > 0 ? `<div class="row"><span>Discount</span><span>-${formatAmount(discountAmount)}</span></div>` : ""}
  <div class="row grand"><span>Total</span><span>${formatAmount(grandTotal)}</span></div>
</div>
${notes ? `<div class="footer"><p><strong>Notes:</strong> ${esc(notes)}</p></div>` : ""}
${profileData?.bankName ? `<div class="footer"><p><strong>Bank:</strong> ${esc(profileData.bankName)} | Acc: ${esc(profileData.bankAccount || "N/A")} ${profileData.bankIban ? "| IBAN: " + esc(profileData.bankIban) : ""}</p></div>` : ""}
${profileData?.termsAndConditions ? `<div class="footer"><p><strong>Terms:</strong> ${esc(profileData.termsAndConditions)}</p></div>` : ""}
${profileData?.footerNote ? `<div class="footer"><p>${esc(profileData.footerNote)}</p></div>` : ""}
</body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Invoice ${invoiceNumber}`,
        });
      }
    } catch (e) {
      if (Platform.OS === "web") {
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(html);
          win.document.close();
          win.print();
        }
      }
    }
  }, [
    items, subtotal, taxRate, taxAmount, discountAmount, grandTotal,
    clientName, clientEmail, clientPhone, clientAddress,
    issueDate, dueDate, notes, invoiceNumber, activeBook, user,
  ]);

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
          {t("createInvoice")}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.invNumberCard, { backgroundColor: theme.tint + "12", borderColor: theme.tint + "33" }]}>
        <Text style={[styles.invNumberLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
          {t("invoiceNumber")}
        </Text>
        <Text style={[styles.invNumber, { color: theme.tint, fontFamily: "Inter_700Bold" }]}>
          {invoiceNumber}
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {t("clientName")}
        </Text>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
          value={clientName}
          onChangeText={setClientName}
          placeholder={t("clientName")}
          placeholderTextColor={theme.textSecondary + "88"}
          testID="client-name-input"
        />
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
          value={clientEmail}
          onChangeText={setClientEmail}
          placeholder={t("clientEmail")}
          placeholderTextColor={theme.textSecondary + "88"}
          keyboardType="email-address"
        />
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
          value={clientPhone}
          onChangeText={setClientPhone}
          placeholder={t("clientPhone")}
          placeholderTextColor={theme.textSecondary + "88"}
          keyboardType="phone-pad"
        />
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
          value={clientAddress}
          onChangeText={setClientAddress}
          placeholder={t("clientAddress")}
          placeholderTextColor={theme.textSecondary + "88"}
        />
      </View>

      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {t("date")}
        </Text>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={[styles.dateLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>{t("issueDate")}</Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
              value={issueDate}
              onChangeText={setIssueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textSecondary + "88"}
            />
          </View>
          <View style={styles.dateField}>
            <Text style={[styles.dateLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>{t("dueDate")}</Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textSecondary + "88"}
            />
          </View>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.itemsHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {t("items")}
          </Text>
          <Pressable
            onPress={addItem}
            style={({ pressed }) => [styles.addItemBtn, { backgroundColor: theme.tint, opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="plus" size={14} color="#FFF" />
            <Text style={[styles.addItemText, { fontFamily: "Inter_600SemiBold" }]}>{t("addItem")}</Text>
          </Pressable>
        </View>

        {items.map((item, idx) => (
          <View key={item.id} style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.itemRow}>
              <TextInput
                style={[styles.itemInput, styles.itemNameInput, { color: theme.text, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
                value={item.name}
                onChangeText={(v) => updateItem(item.id, "name", v)}
                placeholder={t("itemName")}
                placeholderTextColor={theme.textSecondary + "88"}
              />
              {items.length > 1 ? (
                <Pressable onPress={() => removeItem(item.id)} hitSlop={8}>
                  <Feather name="trash-2" size={16} color={theme.expense} />
                </Pressable>
              ) : null}
            </View>
            <View style={styles.itemNumbers}>
              <View style={styles.itemNumField}>
                <Text style={[styles.itemNumLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>{t("quantity")}</Text>
                <TextInput
                  style={[styles.itemInput, styles.itemNumInput, { color: theme.text, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
                  value={item.quantity.toString()}
                  onChangeText={(v) => updateItem(item.id, "quantity", v)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.itemNumField}>
                <Text style={[styles.itemNumLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>{t("unitPrice")}</Text>
                <TextInput
                  style={[styles.itemInput, styles.itemNumInput, { color: theme.text, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
                  value={item.unitPrice.toString()}
                  onChangeText={(v) => updateItem(item.id, "unitPrice", v)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.itemNumField}>
                <Text style={[styles.itemNumLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>{t("itemTotal")}</Text>
                <Text style={[styles.itemTotal, { color: theme.tint, fontFamily: "Inter_700Bold" }]}>
                  {formatAmount(item.quantity * item.unitPrice)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.calcRow}>
          <Text style={[styles.calcLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>{t("subtotal")}</Text>
          <Text style={[styles.calcValue, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{formatAmount(subtotal)}</Text>
        </View>
        <View style={styles.calcInputRow}>
          <Text style={[styles.calcLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>{t("taxRate")}</Text>
          <TextInput
            style={[styles.calcInput, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
            value={taxRate}
            onChangeText={setTaxRate}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={theme.textSecondary + "88"}
          />
        </View>
        {parseFloat(taxRate || "0") > 0 ? (
          <View style={styles.calcRow}>
            <Text style={[styles.calcLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>{t("taxAmount")}</Text>
            <Text style={[styles.calcValue, { color: theme.text, fontFamily: "Inter_500Medium" }]}>{formatAmount(taxAmount)}</Text>
          </View>
        ) : null}
        <View style={styles.calcInputRow}>
          <Text style={[styles.calcLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>{t("discountLabel")}</Text>
          <TextInput
            style={[styles.calcInput, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
            value={discount}
            onChangeText={setDiscount}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={theme.textSecondary + "88"}
          />
        </View>
        <View style={[styles.calcRow, styles.grandTotalRow, { borderTopColor: theme.border }]}>
          <Text style={[styles.grandTotalLabel, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{t("grandTotal")}</Text>
          <Text style={[styles.grandTotalValue, { color: theme.tint, fontFamily: "Inter_700Bold" }]}>{formatAmount(grandTotal)}</Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {t("invoiceNotes")}
        </Text>
        <TextInput
          style={[styles.input, styles.notesInput, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
          value={notes}
          onChangeText={setNotes}
          placeholder={t("invoiceNotes")}
          placeholderTextColor={theme.textSecondary + "88"}
          multiline
          textAlignVertical="top"
        />
      </View>

      {errorMsg ? (
        <View style={[styles.errorBox, { backgroundColor: theme.expense + "15", borderColor: theme.expense + "44" }]}>
          <Feather name="alert-circle" size={14} color={theme.expense} />
          <Text style={[styles.errorText, { color: theme.expense, fontFamily: "Inter_500Medium" }]}>{errorMsg}</Text>
        </View>
      ) : null}

      <View style={styles.btnRow}>
        <Pressable
          onPress={handleGeneratePdf}
          style={({ pressed }) => [styles.actionBtn, { backgroundColor: theme.income, opacity: pressed ? 0.85 : 1 }]}
          testID="generate-invoice-pdf-btn"
        >
          <Feather name="file-text" size={18} color="#FFF" />
          <Text style={[styles.actionBtnText, { fontFamily: "Inter_600SemiBold" }]}>{t("generateInvoicePdf")}</Text>
        </Pressable>
        <Pressable
          onPress={handleSave}
          disabled={saving || !clientName.trim()}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: clientName.trim() ? theme.tint : theme.textSecondary + "44", opacity: pressed ? 0.85 : saving ? 0.6 : 1 },
          ]}
          testID="save-invoice-btn"
        >
          <Feather name="save" size={18} color="#FFF" />
          <Text style={[styles.actionBtnText, { fontFamily: "Inter_600SemiBold" }]}>{t("save")}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 20 },
  invNumberCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  invNumberLabel: { fontSize: 12 },
  invNumber: { fontSize: 16 },
  section: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 16 },
  sectionTitle: { fontSize: 15, marginBottom: 12 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  notesInput: { minHeight: 80 },
  dateRow: { flexDirection: "row", gap: 10 },
  dateField: { flex: 1 },
  dateLabel: { fontSize: 12, marginBottom: 4 },
  itemsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  addItemBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addItemText: { color: "#FFF", fontSize: 12 },
  itemCard: { borderRadius: 12, padding: 12, borderWidth: 1, marginBottom: 10 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  itemInput: { borderBottomWidth: 1, paddingVertical: 6, fontSize: 14 },
  itemNameInput: { flex: 1 },
  itemNumbers: { flexDirection: "row", gap: 10 },
  itemNumField: { flex: 1 },
  itemNumLabel: { fontSize: 10, marginBottom: 2 },
  itemNumInput: { textAlign: "center" },
  itemTotal: { fontSize: 14, paddingVertical: 6, textAlign: "center" },
  calcRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  calcLabel: { fontSize: 13 },
  calcValue: { fontSize: 14 },
  calcInputRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  calcInput: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, width: 80, textAlign: "right", fontSize: 14 },
  grandTotalRow: { borderTopWidth: 1, marginTop: 8, paddingTop: 14 },
  grandTotalLabel: { fontSize: 16 },
  grandTotalValue: { fontSize: 18 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  errorText: { fontSize: 13, flex: 1 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14 },
  actionBtnText: { color: "#FFF", fontSize: 15 },
});
