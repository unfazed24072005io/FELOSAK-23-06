import React, { useCallback, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { useApp, Transaction } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";
import { formatAmount, getCurrencyCode, getCurrencySymbol, subscribeToCurrencyChanges } from "@/utils/format";
import { PAYMENT_MODES, getPaymentModeLabel } from "@/app/add-transaction";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function escapeCsv(str: string): string {
  return `"${str.replace(/"/g, '""')}"`;
}

type ReportType = "all_entries" | "day_summary" | "category_summary";
type EntryTypeFilter = "all" | "income" | "expense";
type PaymentModeFilter = "all" | string;

export default function GenerateReportScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { transactions, activeBook, totalIncome, totalExpense, totalBalance } = useApp();
  const { t } = useLanguage();

  const [reportType, setReportType] = useState<ReportType>("all_entries");
  const [entryTypeFilter, setEntryTypeFilter] = useState<EntryTypeFilter>("all");
  const [paymentModeFilter, setPaymentModeFilter] = useState<PaymentModeFilter>("all");
  const [generating, setGenerating] = useState(false);
const [refreshKey, setRefreshKey] = useState(0);
const currencyCode = getCurrencyCode();
const currencySymbol = getCurrencySymbol();

useEffect(() => {
  const unsubscribe = subscribeToCurrencyChanges(() => {
    console.log("Currency changed, refreshing generate-report screen");
    setRefreshKey(prev => prev + 1);
  });
  return unsubscribe;
}, []);
const formatAmount = (amount: number) => `${currencyCode} ${amount.toLocaleString('en-EG')}`;
  const filtered = useMemo(() => {
    let result = [...transactions];
    if (entryTypeFilter !== "all") {
      result = result.filter((t) => t.type === entryTypeFilter);
    }
    if (paymentModeFilter !== "all") {
      result = result.filter((t) => (t.paymentMode || "cash") === paymentModeFilter);
    }
    return result.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, [transactions, entryTypeFilter, paymentModeFilter]);

  const filteredTotals = useMemo(() => {
    let income = 0, expense = 0;
    filtered.forEach((t) => {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    });
    return { income, expense, balance: income - expense };
  }, [filtered]);

  const bookName = activeBook?.name || "Cash Book";

  const buildCsvContent = useCallback(() => {
    const bom = "\uFEFF";
    if (reportType === "all_entries") {
      const header = `Date,Type,Category,Amount (${currencyCode}),Payment Mode,Note\n`;
      const rows = filtered.map((t) =>
        [escapeCsv(t.date), escapeCsv(t.type === "income" ? "Cash In" : "Cash Out"), escapeCsv(t.category), escapeCsv(t.amount.toFixed(2)), escapeCsv(getPaymentModeLabel(t.paymentMode || "cash")), escapeCsv(t.note || "")].join(",")
      ).join("\n");
      return bom + header + rows;
    }
    if (reportType === "day_summary") {
      const grouped: Record<string, { income: number; expense: number }> = {};
      filtered.forEach((t) => {
        if (!grouped[t.date]) grouped[t.date] = { income: 0, expense: 0 };
        if (t.type === "income") grouped[t.date].income += t.amount;
        else grouped[t.date].expense += t.amount;
      });
      const dayHeader = `Date,Total In (${currencyCode}),Total Out (${currencyCode}),Balance (${currencyCode})\n`;
      const rows = Object.entries(grouped)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, v]) => [escapeCsv(date), escapeCsv(v.income.toFixed(2)), escapeCsv(v.expense.toFixed(2)), escapeCsv((v.income - v.expense).toFixed(2))].join(","))
        .join("\n");
      return bom + dayHeader + rows;
    }
    const grouped: Record<string, { income: number; expense: number }> = {};
    filtered.forEach((t) => {
      if (!grouped[t.category]) grouped[t.category] = { income: 0, expense: 0 };
      if (t.type === "income") grouped[t.category].income += t.amount;
      else grouped[t.category].expense += t.amount;
    });
    const catHeader = `Category,Total In (${currencyCode}),Total Out (${currencyCode}),Net (${currencyCode})\n`;
    const rows = Object.entries(grouped)
      .sort(([, a], [, b]) => (b.income + b.expense) - (a.income + a.expense))
      .map(([cat, v]) => [escapeCsv(cat), escapeCsv(v.income.toFixed(2)), escapeCsv(v.expense.toFixed(2)), escapeCsv((v.income - v.expense).toFixed(2))].join(","))
      .join("\n");
    return bom + catHeader + rows;
  }, [filtered, reportType]);

  const buildHtmlContent = useCallback(() => {
    const titleMap: Record<ReportType, string> = {
      all_entries: "All Entries Report",
      day_summary: "Day-wise Summary",
      category_summary: "Category-wise Summary",
    };
    const reportTitle = titleMap[reportType];

    let tableHtml = "";

    if (reportType === "all_entries") {
      tableHtml = `
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Amount (${currencyCode})</th><th>Payment Mode</th><th>Note</th></tr></thead>
          <tbody>
            ${filtered.map((t) => `
              <tr>
                <td>${escapeHtml(t.date)}</td>
                <td style="color:${t.type === "income" ? "#2E7D32" : "#C62828"}">${t.type === "income" ? "Cash In" : "Cash Out"}</td>
                <td>${escapeHtml(t.category)}</td>
                <td style="text-align:right;color:${t.type === "income" ? "#2E7D32" : "#C62828"}">${t.type === "income" ? "+" : "-"}${t.amount.toFixed(2)}</td>
                <td>${escapeHtml(getPaymentModeLabel(t.paymentMode || "cash"))}</td>
                <td>${escapeHtml(t.note || "-")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>`;
    } else if (reportType === "day_summary") {
      const grouped: Record<string, { income: number; expense: number }> = {};
      filtered.forEach((t) => {
        if (!grouped[t.date]) grouped[t.date] = { income: 0, expense: 0 };
        if (t.type === "income") grouped[t.date].income += t.amount;
        else grouped[t.date].expense += t.amount;
      });
      tableHtml = `
        <table>
          <thead><tr><th>Date</th><th>Total In (${currencyCode})</th><th>Total Out (${currencyCode})</th><th>Balance (${currencyCode})</th></tr></thead>
          <tbody>
            ${Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a)).map(([date, v]) => `
              <tr>
                <td>${date}</td>
                <td style="text-align:right;color:#2E7D32">${v.income.toFixed(2)}</td>
                <td style="text-align:right;color:#C62828">${v.expense.toFixed(2)}</td>
                <td style="text-align:right">${(v.income - v.expense).toFixed(2)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>`;
    } else {
      const grouped: Record<string, { income: number; expense: number }> = {};
      filtered.forEach((t) => {
        if (!grouped[t.category]) grouped[t.category] = { income: 0, expense: 0 };
        if (t.type === "income") grouped[t.category].income += t.amount;
        else grouped[t.category].expense += t.amount;
      });
      tableHtml = `
        <table>
          <thead><tr><th>Category</th><th>Total In (${currencyCode})</th><th>Total Out (${currencyCode})</th><th>Net (${currencyCode})</th></tr></thead>
          <tbody>
            ${Object.entries(grouped).sort(([, a], [, b]) => (b.income + b.expense) - (a.income + a.expense)).map(([cat, v]) => `
              <tr>
                <td>${cat}</td>
                <td style="text-align:right;color:#2E7D32">${v.income.toFixed(2)}</td>
                <td style="text-align:right;color:#C62828">${v.expense.toFixed(2)}</td>
                <td style="text-align:right">${(v.income - v.expense).toFixed(2)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>`;
    }

    return `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { font-size: 22px; color: #0A1F15; margin-bottom: 4px; }
            h2 { font-size: 16px; color: #666; margin-top: 0; }
            .summary { display: flex; gap: 20px; margin: 16px 0; }
            .stat { padding: 12px; background: #f5f5f5; border-radius: 8px; }
            .stat-label { font-size: 12px; color: #666; }
            .stat-value { font-size: 18px; font-weight: bold; }
            .income { color: #2E7D32; }
            .expense { color: #C62828; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
            th { background: #0A1F15; color: #fff; padding: 10px 8px; text-align: left; }
            td { padding: 8px; border-bottom: 1px solid #e0e0e0; }
            tr:nth-child(even) { background: #fafafa; }
            .footer { margin-top: 24px; font-size: 11px; color: #999; text-align: center; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(bookName)} - ${escapeHtml(reportTitle)}</h1>
          <h2>Generated on ${new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}</h2>
          <div class="summary">
            <div class="stat">
              <div class="stat-label">Total In</div>
<div class="stat-value income">${filteredTotals.income.toFixed(2)} ${currencyCode}</div>

            </div>
            <div class="stat">
              <div class="stat-label">Total Out</div>
              <div class="stat-value expense">${filteredTotals.expense.toFixed(2)} ${currencyCode}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Net Balance</div>
              <div class="stat-value">${filteredTotals.balance.toFixed(2)} ${currencyCode}</div>
            </div>
          </div>
          ${tableHtml}
          <div class="footer">Misr Cash Book Report - ${filtered.length} entries</div>
        </body>
      </html>
    `;
  }, [filtered, reportType, bookName, filteredTotals]);

  const handleGenerateExcel = useCallback(async () => {
    if (filtered.length === 0) {
      Alert.alert("No Data", "No entries match your filters.");
      return;
    }
    setGenerating(true);
    try {
      const csv = buildCsvContent();
      if (Platform.OS === "web") {
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${bookName.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_")}_report.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const safeName = bookName.replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "_");
        const fileUri = FileSystem.documentDirectory + `${safeName}_report.csv`;
        await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, { mimeType: "text/csv", dialogTitle: t("excelReport") });
        } else {
          return;
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error("Excel export error:", e);
      Alert.alert("Error", "Failed to generate report.");
    } finally {
      setGenerating(false);
    }
  }, [filtered, buildCsvContent, bookName]);

  const handleGeneratePdf = useCallback(async () => {
    if (filtered.length === 0) {
      Alert.alert("No Data", "No entries match your filters.");
      return;
    }
    setGenerating(true);
    try {
      const html = buildHtmlContent();
      if (Platform.OS === "web") {
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(html);
          win.document.close();
          setTimeout(() => win.print(), 500);
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: t("pdfReport") });
        } else {
          return;
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error("PDF export error:", e);
      Alert.alert("Error", "Failed to generate report.");
    } finally {
      setGenerating(false);
    }
  }, [filtered, buildHtmlContent]);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const REPORT_OPTIONS: { id: ReportType; title: string; subtitle: string }[] = [
    { id: "all_entries", title: t("allEntriesReport"), subtitle: t("allEntriesReport") },
    { id: "day_summary", title: t("daySummary"), subtitle: t("daySummary") },
    { id: "category_summary", title: t("categorySummary"), subtitle: t("categorySummary") },
  ];

  return (
    <View key={refreshKey} style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Back" accessibilityRole="button">
          <Feather name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {t("generateReport")}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 40 }]}>
        <View style={[styles.filterSummary, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.filterSummaryTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {t("generateReport")}
          </Text>
          <View style={styles.filterSummaryGrid}>
            <View style={styles.filterSummaryItem}>
              <Text style={[styles.filterLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>{t("duration")}</Text>
              <Text style={[styles.filterValue, { color: theme.tint, fontFamily: "Inter_600SemiBold" }]}>{t("allTime")}</Text>
            </View>
            <View style={styles.filterSummaryItem}>
              <Text style={[styles.filterLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>{t("entryType")}</Text>
              <Text style={[styles.filterValue, { color: theme.tint, fontFamily: "Inter_600SemiBold" }]}>
                {entryTypeFilter === "all" ? t("all") : entryTypeFilter === "income" ? t("cashIn") : t("cashOut")}
              </Text>
            </View>
            <View style={styles.filterSummaryItem}>
              <Text style={[styles.filterLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>{t("paymentMode")}</Text>
              <Text style={[styles.filterValue, { color: theme.tint, fontFamily: "Inter_600SemiBold" }]}>
                {paymentModeFilter === "all" ? t("all") : getPaymentModeLabel(paymentModeFilter)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {t("filterBy")}
          </Text>

          <Text style={[styles.chipLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {t("entryType")}
          </Text>
          <View style={styles.chipRow}>
            {(["all", "income", "expense"] as EntryTypeFilter[]).map((f) => (
              <Pressable
                key={f}
                onPress={() => { Haptics.selectionAsync(); setEntryTypeFilter(f); }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: entryTypeFilter === f ? theme.tint + "22" : theme.card,
                    borderColor: entryTypeFilter === f ? theme.tint + "88" : theme.border,
                  },
                ]}
              >
                <Text style={[styles.chipText, {
                  color: entryTypeFilter === f ? theme.tint : theme.text,
                  fontFamily: entryTypeFilter === f ? "Inter_600SemiBold" : "Inter_400Regular",
                }]}>
                  {f === "all" ? t("all") : f === "income" ? t("cashIn") : t("cashOut")}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.chipLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {t("paymentMode")}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); setPaymentModeFilter("all"); }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: paymentModeFilter === "all" ? theme.tint + "22" : theme.card,
                    borderColor: paymentModeFilter === "all" ? theme.tint + "88" : theme.border,
                  },
                ]}
              >
                <Text style={[styles.chipText, {
                  color: paymentModeFilter === "all" ? theme.tint : theme.text,
                  fontFamily: paymentModeFilter === "all" ? "Inter_600SemiBold" : "Inter_400Regular",
                }]}>{t("all")}</Text>
              </Pressable>
              {PAYMENT_MODES.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => { Haptics.selectionAsync(); setPaymentModeFilter(m.id); }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: paymentModeFilter === m.id ? theme.tint + "22" : theme.card,
                      borderColor: paymentModeFilter === m.id ? theme.tint + "88" : theme.border,
                    },
                  ]}
                >
                  <Feather name={m.icon} size={12} color={paymentModeFilter === m.id ? theme.tint : theme.textSecondary} />
                  <Text style={[styles.chipText, {
                    color: paymentModeFilter === m.id ? theme.tint : theme.text,
                    fontFamily: paymentModeFilter === m.id ? "Inter_600SemiBold" : "Inter_400Regular",
                  }]}>{m.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {t("reportType")}
          </Text>
          {REPORT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              onPress={() => { Haptics.selectionAsync(); setReportType(opt.id); }}
              style={[
                styles.radioRow,
                {
                  backgroundColor: reportType === opt.id ? theme.tint + "0D" : theme.card,
                  borderColor: reportType === opt.id ? theme.tint + "55" : theme.border,
                },
              ]}
            >
              <View style={[styles.radioOuter, { borderColor: reportType === opt.id ? theme.tint : theme.border }]}>
                {reportType === opt.id && <View style={[styles.radioInner, { backgroundColor: theme.tint }]} />}
              </View>
              <View style={styles.radioContent}>
                <Text style={[styles.radioTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {opt.title}
                </Text>
                <Text style={[styles.radioSubtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {opt.subtitle}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={[styles.statsPreview, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.statsPreviewTitle, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {t("entriesMatched", { count: String(filtered.length) })}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>{t("cashIn")}</Text>
              <Text style={[styles.statValue, { color: theme.income, fontFamily: "Inter_600SemiBold" }]}>
                {formatAmount(filteredTotals.income)}

              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>{t("cashOut")}</Text>
              <Text style={[styles.statValue, { color: theme.expense, fontFamily: "Inter_600SemiBold" }]}>
                {formatAmount(filteredTotals.expense)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>{t("netBalance")}</Text>
              <Text style={[styles.statValue, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                {formatAmount(filteredTotals.balance)}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={handleGenerateExcel}
          disabled={generating}
          style={({ pressed }) => [
            styles.excelBtn,
            { borderColor: theme.tint, opacity: pressed || generating ? 0.6 : 1 },
          ]}
          testID="generate-excel-btn"
        >
          <Feather name="grid" size={18} color={theme.tint} />
          <Text style={[styles.excelBtnText, { color: theme.tint, fontFamily: "Inter_600SemiBold" }]}>
            {t("generateExcel")}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleGeneratePdf}
          disabled={generating}
          style={({ pressed }) => [
            styles.pdfBtn,
            { backgroundColor: theme.expense, opacity: pressed || generating ? 0.6 : 1 },
          ]}
          testID="generate-pdf-btn"
        >
          <Feather name="file-text" size={18} color="#FFF" />
          <Text style={[styles.pdfBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            {t("generatePdf")}
          </Text>
        </Pressable>
      </ScrollView>
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
  headerTitle: { fontSize: 18 },
  scroll: { paddingHorizontal: 20, gap: 16 },
  filterSummary: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  filterSummaryTitle: { fontSize: 15 },
  filterSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  filterSummaryItem: { gap: 2 },
  filterLabel: { fontSize: 12 },
  filterValue: { fontSize: 14 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 16, marginBottom: 2 },
  chipLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  chipScroll: { marginHorizontal: -20, paddingHorizontal: 0 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 0 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: { fontSize: 13 },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  radioContent: { flex: 1, gap: 2 },
  radioTitle: { fontSize: 15 },
  radioSubtitle: { fontSize: 12 },
  statsPreview: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  statsPreviewTitle: { fontSize: 13, textAlign: "center" },
  statsRow: { flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center", gap: 2 },
  statLabel: { fontSize: 11 },
  statValue: { fontSize: 14 },
  excelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  excelBtnText: { fontSize: 16 },
  pdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
  },
  pdfBtnText: { fontSize: 16, color: "#FFF" },
});
