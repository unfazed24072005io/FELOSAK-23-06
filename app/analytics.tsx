import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useFocusEffect } from 'expo-router';
import { loadCurrency } from '@/utils/format';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/config/firebase";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from "expo-haptics";
import { useApp, Transaction } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";
import { formatEGP, formatEGPShort, formatDate, getCurrencyCode, getCurrencySymbol, subscribeToCurrencyChanges } from "@/utils/format";

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const { t } = useLanguage();
  // Add this helper function near the top of the component
const formatAmount = (amount: number) => `${getCurrencySymbol()} ${amount.toLocaleString('en-EG')}`;
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
const [refreshKey, setRefreshKey] = useState(0);
useFocusEffect(
  useCallback(() => {
    loadCurrency();
  }, [])
);
const [currencyRefreshKey, setCurrencyRefreshKey] = useState(0);
const currencyCode = getCurrencyCode();
const currencySymbol = getCurrencySymbol();

const formatAmountShort = useCallback((amount: number) => {
  const currencyCode = getCurrencyCode();
  if (amount >= 1000000) {
    return `${currencyCode} ${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${currencyCode} ${(amount / 1000).toFixed(0)}K`;
  }
  return `${currencyCode} ${amount.toLocaleString('en-EG')}`;
}, []);

useEffect(() => {
  const unsubscribe = subscribeToCurrencyChanges(() => {
    console.log("Currency changed, refreshing analytics screen");
    setCurrencyRefreshKey(prev => prev + 1);
  });
  return unsubscribe;
}, []);
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  // Fetch ALL transactions from Firestore
  const fetchAllTransactions = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const q = query(collection(db, 'transactions'), where('userId', '==', user.id));
      const snapshot = await getDocs(q);
      const fetchedTransactions: Transaction[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        fetchedTransactions.push({ 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt?.toDate?.()?.getTime() || data.createdAt || Date.now()
        } as Transaction);
      });
      setAllTransactions(fetchedTransactions);
      console.log(`Fetched ${fetchedTransactions.length} transactions from all books`);
    } catch (error) {
      console.error("Error fetching all transactions:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAllTransactions();
  }, [fetchAllTransactions]);

  // Calculate totals from ALL transactions
  const allTotals = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    
    allTransactions.forEach(tx => {
      if (tx.type === "income") {
        totalIncome += tx.amount;
      } else if (tx.type === "expense") {
        totalExpense += tx.amount;
      }
    });
    
    return {
      totalIncome,
      totalExpense,
      totalBalance: totalIncome - totalExpense,
    };
  }, [allTransactions]);

  const { totalIncome, totalExpense, totalBalance } = allTotals;

  const categoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      Sales: t("sales"),
      Services: t("services"),
      Consulting: t("consulting"),
      Rent: t("rent"),
      Investment: t("investment"),
      "Other Income": t("otherIncome"),
      Inventory: t("inventory"),
      Salaries: t("salaries"),
      Utilities: t("utilities"),
      Marketing: t("marketing"),
      Transport: t("transport"),
      Maintenance: t("maintenance"),
      Taxes: t("taxes"),
      Supplies: t("supplies"),
      "Other Expense": t("otherExpense"),
    };
    return map[cat] || cat;
  };

  const last6Months = useMemo(() => {
    const months: { label: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleDateString("en-EG", { month: "short" });
      let income = 0;
      let expense = 0;
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).getTime();
      
      for (const tx of allTransactions) {
        if (tx.createdAt >= monthStart && tx.createdAt <= monthEnd) {
          if (tx.type === "income") income += tx.amount;
          else expense += tx.amount;
        }
      }
      months.push({ label, income, expense });
    }
    return months;
  }, [allTransactions]);

  const maxBar = useMemo(
    () =>
      Math.max(
        1,
        ...last6Months.map((m) => Math.max(m.income, m.expense))
      ),
    [last6Months]
  );

  const incomeByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of allTransactions) {
      if (tx.type === "income") {
        map[tx.category] = (map[tx.category] || 0) + tx.amount;
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [allTransactions]);

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of allTransactions) {
      if (tx.type === "expense") {
        map[tx.category] = (map[tx.category] || 0) + tx.amount;
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [allTransactions]);

  const savingsRate = useMemo(() => {
    if (totalIncome === 0) return 0;
    return Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100);
  }, [totalIncome, totalExpense]);

  // Generate Report PDF
  const generateReport = async () => {
const currencyCode = getCurrencyCode();
const currencySymbol = getCurrencySymbol();
    if (allTransactions.length === 0) {
      Alert.alert("No Data", "No transactions to generate report");
      return;
    }

    setGeneratingReport(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Financial Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; margin: 0; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3B82F6; padding-bottom: 20px; }
            .header h1 { color: #3B82F6; margin: 0; font-size: 28px; }
            .header p { color: #666; margin: 5px 0 0; font-size: 12px; }
            .stats-grid { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 30px; }
            .stat-card { flex: 1; min-width: 150px; background: #F9FAFB; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid #E5E7EB; }
            .stat-value { font-size: 24px; font-weight: bold; margin: 8px 0; }
            .income { color: #22C55E; }
            .expense { color: #EF4444; }
            .balance { color: #3B82F6; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #3B82F6; color: white; padding: 10px; text-align: left; font-size: 12px; }
            td { padding: 8px 10px; border-bottom: 1px solid #E5E7EB; font-size: 11px; }
            .category-section { margin-top: 30px; }
            .category-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
            .category-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F0F0F0; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #E5E7EB; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Financial Analytics Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div>Total Income</div>
              <div class="stat-value income">${currencyCode} ${totalIncome.toLocaleString('en-EG')}</div>
            </div>
            <div class="stat-card">
              <div>Total Expense</div>
              <div class="stat-value expense">${currencyCode} ${totalExpense.toLocaleString('en-EG')}</div>
            </div>
            <div class="stat-card">
              <div>Net Balance</div>
              <div class="stat-value balance">${currencyCode} ${totalBalance.toLocaleString('en-EG')}</div>
            </div>
            <div class="stat-card">
              <div>Savings Rate</div>
              <div class="stat-value">${savingsRate.toFixed(1)}%</div>
            </div>
          </div>

          <div class="category-section">
            <div class="category-title">Top Income Sources</div>
            ${incomeByCategory.map(([cat, amt]) => `
              <div class="category-row">
                <span>${categoryLabel(cat)}</span>
                <span style="color: #22C55E;">${currencyCode} ${amt.toLocaleString('en-EG')}</span>
              </div>
            `).join('')}
          </div>

          <div class="category-section">
            <div class="category-title">Top Expense Categories</div>
            ${expenseByCategory.map(([cat, amt]) => `
              <div class="category-row">
                <span>${categoryLabel(cat)}</span>
                <span style="color: #EF4444;">${currencyCode} ${amt.toLocaleString('en-EG')}</span>
              </div>
            `).join('')}
          </div>

          <div class="category-section">
            <div class="category-title">Recent Transactions</div>
            <table>
              <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Amount</th></tr></thead>
              <tbody>
                ${allTransactions.slice(0, 20).map(tx => `
                  <tr>
                    <td>${formatDate(tx.createdAt)}</td>
                    <td>${tx.type === 'income' ? 'Income' : 'Expense'}</td>
                    <td>${tx.category}</td>
                    <td style="${tx.type === 'income' ? 'color: #22C55E;' : 'color: #EF4444;'}">${tx.type === 'income' ? '+' : '-'} ${currencyCode} ${tx.amount.toLocaleString('en-EG')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${allTransactions.length > 20 ? `<p style="margin-top: 10px; font-size: 11px; color: #666;">* Showing last 20 of ${allTransactions.length} transactions</p>` : ''}
          </div>

          <div class="footer">
            <p>Total Transactions: ${allTransactions.length}</p>
            <p>Generated from Felosak App</p>
          </div>
        </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const win = window.open();
        win?.document.write(htmlContent);
        win?.document.close();
        win?.print();
        Alert.alert("Success", "Print dialog opened. You can save as PDF.");
      } else {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri);
        Alert.alert("Success", "Report generated and shared!");
      }
    } catch (error) {
      console.error("Report Error:", error);
      Alert.alert("Error", "Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return (
<View key={refreshKey} style={[styles.container, { backgroundColor: "#FFFFFF", paddingTop: topPad }]}>
        <ActivityIndicator size="large" color={theme.tint} />
        <Text style={[styles.loadingText, { color: theme.textSecondary, marginTop: 16 }]}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View key={currencyRefreshKey} style={[styles.container, { backgroundColor: theme.background }]}>
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
        <Text
          style={[
            styles.title,
            { color: theme.text, fontFamily: "Inter_700Bold", flex: 1, textAlign: "center" },
          ]}
        >
          {t("analytics")}
        </Text>
        {/* Download Report Button */}
        <Pressable onPress={generateReport} disabled={generatingReport} style={styles.downloadBtn}>
          {generatingReport ? (
            <ActivityIndicator size="small" color={theme.tint} />
          ) : (
            <Feather name="download" size={22} color={theme.tint} />
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Stat Cards */}
        <View style={styles.statsGrid}>
          <StatCard
  label="Net Balance"
  value={formatAmount(totalBalance)}  // Change from formatEGPShort
  color={totalBalance >= 0 ? "#22C55E" : "#EF4444"}
  icon="activity"
  theme={theme}
/>
          <StatCard
            label="Savings Rate"
            value={`${savingsRate.toFixed(1)}%`}
            color="#3B82F6"
            icon="percent"
            theme={theme}
          />
          <StatCard
  label="Total Income"
  value={formatAmount(totalIncome)}  // Change from formatEGPShort
  color="#22C55E"
  icon="arrow-up"
  theme={theme}
/>
          <StatCard
  label="Total Expense"
  value={formatAmount(totalExpense)}  // Change from formatEGPShort
  color="#EF4444"
  icon="arrow-down"
  theme={theme}
/>
        </View>

        {/* 6-Month Chart */}
        {allTransactions.length > 0 && (
          <View
            style={[
              styles.chartCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text
              style={[
                styles.cardTitle,
                { color: theme.text, fontFamily: "Inter_600SemiBold" },
              ]}
            >
              Last 6 Months
            </Text>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#22C55E" }]} />
                <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>Income</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
                <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>Expense</Text>
              </View>
            </View>
            <View style={styles.barChart}>
              {last6Months.map((m, i) => (
                <BarGroup
                  key={i}
                  data={m}
                  max={maxBar}
                  theme={theme}
                />
              ))}
            </View>
          </View>
        )}

        {/* Top Income Categories */}
        {incomeByCategory.length > 0 && (
          <CategoryBreakdown
            title="Top Income Sources"
            data={incomeByCategory}
            total={totalIncome}
            color="#22C55E"
            theme={theme}
            categoryLabel={categoryLabel}
          />
        )}

        {/* Top Expense Categories */}
        {expenseByCategory.length > 0 && (
          <CategoryBreakdown
            title="Top Expense Categories"
            data={expenseByCategory}
            total={totalExpense}
            color="#EF4444"
            theme={theme}
            categoryLabel={categoryLabel}
          />
        )}

        {allTransactions.length === 0 && (
          <View style={styles.emptyContent}>
            <Feather name="bar-chart-2" size={44} color={theme.textSecondary} />
            <Text
              style={[
                styles.emptyText,
                { color: theme.textSecondary },
              ]}
            >
              No transactions found
            </Text>
          </View>
        )}
        
        {/* Info Note */}
        {allTransactions.length > 0 && (
          <View style={[styles.noteCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Feather name="info" size={14} color={theme.textSecondary} />
            <Text style={[styles.noteText, { color: theme.textSecondary }]}>
              Showing analytics from {allTransactions.length} transactions across all books
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
  theme,
}: {
  label: string;
  value: string;
  color: string;
  icon: string;
  theme: typeof Colors.dark;
}) {
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: color + "22" }]}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <Text
        style={[styles.statValue, { color: theme.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text
        style={[styles.statLabel, { color: theme.textSecondary }]}
      >
        {label}
      </Text>
    </View>
  );
}

function BarGroup({
  data,
  max,
  theme,
}: {
  data: { label: string; income: number; expense: number };
  max: number;
  theme: typeof Colors.dark;
}) {
  const BAR_HEIGHT = 120;
  const incomeH = (data.income / max) * BAR_HEIGHT;
  const expenseH = (data.expense / max) * BAR_HEIGHT;

  return (
    <View style={styles.barGroup}>
      <View style={[styles.barContainer, { height: BAR_HEIGHT }]}>
        <View style={styles.barPair}>
          <View
            style={[
              styles.bar,
              {
                height: Math.max(incomeH, 2),
                backgroundColor: "#22C55E",
                opacity: incomeH < 2 ? 0.3 : 1,
              },
            ]}
          />
          <View
            style={[
              styles.bar,
              {
                height: Math.max(expenseH, 2),
                backgroundColor: "#EF4444",
                opacity: expenseH < 2 ? 0.3 : 1,
              },
            ]}
          />
        </View>
      </View>
      <Text
        style={[
          styles.barLabel,
          { color: theme.textSecondary },
        ]}
      >
        {data.label}
      </Text>
    </View>
  );
}

function CategoryBreakdown({
  title,
  data,
  total,
  color,
  theme,
  categoryLabel,
  currencyCode,
}: {
  title: string;
  data: [string, number][];
  total: number;
  color: string;
  theme: typeof Colors.dark;
  categoryLabel: (cat: string) => string;
  currencyCode: string;
}) {
  return (
    <View
      style={[
        styles.chartCard,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <Text
        style={[
          styles.cardTitle,
          { color: theme.text },
        ]}
      >
        {title}
      </Text>
      {data.map(([cat, amt]) => {
        const pct = total > 0 ? (amt / total) * 100 : 0;
        return (
          <View key={cat} style={styles.catRow}>
            <View style={styles.catInfo}>
              <Text
                style={[
                  styles.catName,
                  { color: theme.text },
                ]}
                numberOfLines={1}
              >
                {categoryLabel(cat)}
              </Text>
              <Text
                style={[
                  styles.catPct,
                  { color: theme.textSecondary },
                ]}
              >
                {pct.toFixed(0)}%
              </Text>
            </View>
            <View
              style={[styles.catBarBg, { backgroundColor: theme.border }]}
            >
              <View
                style={[
                  styles.catBar,
                  { width: `${pct}%` as any, backgroundColor: color },
                ]}
              />
            </View>
            <Text
              style={[
                styles.catAmt,
                { color: theme.text },
              ]}
              numberOfLines={1}
            >
              {currencyCode} {amt.toLocaleString('en-EG', { notation: 'compact', maximumFractionDigits: 1 })}

            </Text>
          </View>
        );
      })}
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
  title: { fontSize: 24 },
  scroll: { padding: 20, gap: 16 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  chartCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  legend: { flexDirection: "row", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  barChart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  barGroup: { flex: 1, alignItems: "center", gap: 6 },
  barContainer: { justifyContent: "flex-end", width: "100%" },
  barPair: {
    flexDirection: "row",
    gap: 2,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  bar: { width: 10, borderRadius: 4 },
  barLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  catRow: { gap: 6 },
  catInfo: { flexDirection: "row", justifyContent: "space-between" },
  catName: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  catPct: { fontSize: 12, fontFamily: "Inter_400Regular" },
  catBarBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  catBar: { height: 6, borderRadius: 3 },
  catAmt: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  emptyContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 40,
  },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
  noteCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  noteText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  downloadBtn: {
    padding: 8,
    borderRadius: 8,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});