import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";
import { useApp, Debt } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";  // ADD THIS
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";
import { formatEGP, formatDate, getCurrencyCode, getCurrencySymbol, subscribeToCurrencyChanges } from "@/utils/format";

type TabDir = "owed_to_me" | "i_owe";

export default function DebtorsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { debts, deleteDebt, updateDebt, activeBook } = useApp();
  const { currentBookAccess, isBookRestricted } = useAuth();  // ADD THIS
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabDir>("owed_to_me");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [showMonthFilter, setShowMonthFilter] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [currencyRefreshKey, setCurrencyRefreshKey] = useState(0);

  // Determine if user can edit
  const canEdit = !isBookRestricted || currentBookAccess?.accessLevel === "write";

useEffect(() => {
  const unsubscribe = subscribeToCurrencyChanges(() => {
    console.log("Currency changed, refreshing debtors screen");
    setCurrencyRefreshKey(prev => prev + 1);
  });
  return unsubscribe;
}, []);
const formatAmount = (amount: number) => {
  const currencyCode = getCurrencyCode();
  return `${currencyCode} ${amount.toLocaleString('en-EG')}`;
};
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const currentYear = new Date().getFullYear();

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Filter debts by selected month based on DUE DATE
  const filteredByMonth = useMemo(() => {
  if (!debts || debts.length === 0) return [];
  
  return debts.filter(debt => {
    // If no due date, show the debt (treat as current month or show all)
    if (!debt.dueDate) {
      console.log("Debt has no dueDate, showing anyway:", debt.name);
      return true;
    }
    const dueDate = new Date(debt.dueDate);
    if (isNaN(dueDate.getTime())) return true;
    const matches = dueDate.getMonth() === selectedMonth && dueDate.getFullYear() === selectedYear;
    console.log(`Debt: ${debt.name}, Month: ${dueDate.getMonth()}, Year: ${dueDate.getFullYear()}, Matches: ${matches}`);
    return matches;
  });
}, [debts, selectedMonth, selectedYear]);

  // For current month calculations (using actual current month)
  const currentMonthFiltered = useMemo(() => {
    if (!debts || debts.length === 0) return [];
    
    return debts.filter(debt => {
      if (!debt.dueDate) return false;
      const dueDate = new Date(debt.dueDate);
      if (isNaN(dueDate.getTime())) return false;
      return dueDate.getMonth() === new Date().getMonth() && dueDate.getFullYear() === currentYear;
    });
  }, [debts, currentYear]);

  const filtered = useMemo(
    () => filteredByMonth.filter((d) => d.direction === activeTab && !d.settled),
    [filteredByMonth, activeTab]
  );

  const settled = useMemo(
    () => filteredByMonth.filter((d) => d.direction === activeTab && d.settled),
    [filteredByMonth, activeTab]
  );

  // Total Balance (all time)
  const totalBalance = useMemo(
    () =>
      debts
        .filter((d) => !d.settled)
        .reduce((sum, d) => sum + (d.direction === "owed_to_me" ? d.amount : -d.amount), 0),
    [debts]
  );

  // Current month totals (using actual current month)
  const currentMonthReceived = useMemo(
    () =>
      currentMonthFiltered
        .filter((d) => d.direction === "owed_to_me" && !d.settled)
        .reduce((sum, d) => sum + d.amount, 0),
    [currentMonthFiltered]
  );

  const currentMonthPaid = useMemo(
    () =>
      currentMonthFiltered
        .filter((d) => d.direction === "i_owe" && !d.settled)
        .reduce((sum, d) => sum + d.amount, 0),
    [currentMonthFiltered]
  );

  const currentMonthNet = currentMonthReceived - currentMonthPaid;

  // Total counts for selected month
  const totalEntries = filteredByMonth.filter(d => !d.settled).length;
  const totalReceivedCount = filteredByMonth.filter(d => d.direction === "owed_to_me" && !d.settled).length;
  const totalPaidCount = filteredByMonth.filter(d => d.direction === "i_owe" && !d.settled).length;

  const totalOwedToMe = useMemo(
    () =>
      debts
        .filter((d) => d.direction === "owed_to_me" && !d.settled)
        .reduce((sum, d) => sum + d.amount, 0),
    [debts]
  );

  const totalIOwe = useMemo(
    () =>
      debts
        .filter((d) => d.direction === "i_owe" && !d.settled)
        .reduce((sum, d) => sum + d.amount, 0),
    [debts]
  );

  const handleSettle = useCallback(
    (debt: Debt) => {
      if (!canEdit) return;  // ADD THIS - Prevent settle if read only
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      updateDebt(debt.id, { settled: true });
    },
    [updateDebt, canEdit]
  );

  const handleDelete = useCallback(
    (debt: Debt) => {
      if (!canEdit) return;  // ADD THIS - Prevent delete if read only
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setDebtToDelete(debt);
      setShowDeleteModal(true);
    },
    [canEdit]
  );

  const handleConfirmDelete = useCallback(() => {
    if (debtToDelete) {
      deleteDebt(debtToDelete.id);
    }
    setShowDeleteModal(false);
    setDebtToDelete(null);
  }, [debtToDelete, deleteDebt]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteModal(false);
    setDebtToDelete(null);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Debt }) => (
      <DebtCard
        debt={item}
        theme={theme}
        onSettle={handleSettle}
        onDelete={handleDelete}
        onEdit={() => {
          if (!canEdit) return;  // ADD THIS - Prevent edit if read only
          router.push({ pathname: "/add-debt", params: { editId: item.id } });
        }}
        t={t}
        canEdit={canEdit}  // ADD THIS - Pass canEdit to DebtCard
      />
    ),
    [theme, handleSettle, handleDelete, t, canEdit]
  );

  if (!activeBook) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: theme.border, backgroundColor: theme.background }]}>
          <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{t("arAp")}</Text>
        </View>
        <View style={styles.emptyContent}>
          <Feather name="book-open" size={44} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>{t("selectBookDebts")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#FFFFFF" }]}>
      {/* Header with Back Button, Month Filter, and Add Button */}
      <View
        style={[
          styles.headerWhite,
          {
            marginTop: topPad + 8,
            backgroundColor: "#FFFFFF",
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#000000" />
        </Pressable>
        <Text style={[styles.headerTitle, { fontFamily: "Inter_700Bold" }]}>
          Customer
        </Text>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => setShowMonthFilter(true)}
            style={({ pressed }) => [
              styles.monthFilterBtn,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="calendar" size={18} color="#3B82F6" />
            <Text style={[styles.monthFilterText, { color: "#3B82F6" }]}>
              {months[selectedMonth]} {selectedYear}
            </Text>
          </Pressable>
          {/* Add Button - ONLY show if canEdit */}
          {canEdit && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/add-debt");
              }}
              style={({ pressed }) => [
                styles.addBtnBlue,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Feather name="plus" size={20} color="#FFFFFF" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Blue Card - Total Balance */}
      <View style={styles.totalBalanceCard}>
        <LinearGradient
          colors={['#3B82F6', '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCardGradient}
        />
        <View style={styles.balanceCardContent}>
          <View style={styles.balanceLeft}>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Text style={styles.balanceAmount}>{formatAmount(totalBalance)}</Text>
            <Text style={styles.balanceEntries}>{totalEntries} entries</Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceRight}>
            <Text style={styles.balanceLabel}>This Month</Text>
            <Text style={[styles.balanceAmount, { color: currentMonthNet >= 0 ? "#10B981" : "#EF4444" }]}>
              {formatAmount(currentMonthNet)}
            </Text>
            <Text style={styles.balanceEntries}>Net balance</Text>
          </View>
        </View>
      </View>

      {/* White Card - Received & Paid */}
      <View style={styles.statsWhiteCard}>
        <View style={styles.statsRow}>
          {/* Received Section */}
          <View style={styles.statsSection}>
            <View style={styles.statsIconRow}>
              <View style={[styles.statsIconBg, { backgroundColor: "#10B98120" }]}>
                <Feather name="arrow-down" size={20} color="#10B981" />
              </View>
              <View style={styles.statsTextContainer}>
                <Text style={styles.statsLabel}>Total Received</Text>
                <Text style={[styles.statsAmount, { color: "#10B981" }]}>{formatAmount(totalOwedToMe)}</Text>
                <Text style={styles.statsCount}>{totalReceivedCount} entries</Text>
              </View>
            </View>
          </View>

          {/* Vertical Divider */}
          <View style={styles.statsVerticalDivider} />

          {/* Paid Section */}
          <View style={styles.statsSection}>
            <View style={styles.statsIconRow}>
              <View style={[styles.statsIconBg, { backgroundColor: "#EF444420" }]}>
                <Feather name="arrow-up" size={20} color="#EF4444" />
              </View>
              <View style={styles.statsTextContainer}>
                <Text style={styles.statsLabel}>Total Paid</Text>
                <Text style={[styles.statsAmount, { color: "#EF4444" }]}>{formatAmount(totalIOwe)}</Text>
                <Text style={styles.statsCount}>{totalPaidCount} entries</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons Bar - ONLY show if canEdit */}
      {canEdit && (
        <View style={styles.actionBar}>
          <Pressable
  onPress={() => router.push({ pathname: "/add-debt", params: { type: "owed_to_me" } })}
  style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.8 : 1 }]}
>
  <Feather name="arrow-up-circle" size={22} color="#10B981" />
  <Text style={styles.actionBtnText}>Add Income</Text>
</Pressable>
<Pressable
  onPress={() => router.push({ pathname: "/add-debt", params: { type: "i_owe" } })}
  style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.8 : 1 }]}
>
  <Feather name="arrow-down-circle" size={22} color="#EF4444" />
  <Text style={styles.actionBtnText}>Add Expense</Text>
</Pressable>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="calendar" size={22} color="#6B7280" />
            <Text style={styles.actionBtnText}>Select Date</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/analytics")}
            style={({ pressed }) => [styles.actionBtn, styles.viewReportBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="bar-chart-2" size={22} color="#FFFFFF" />
            <Text style={[styles.actionBtnText, { color: "#FFFFFF" }]}>View Report</Text>
          </Pressable>
        </View>
      )}

      {/* Tab Switcher for Income/Expense */}
      <View style={styles.tabContainer}>
        <Pressable
          onPress={() => setActiveTab("owed_to_me")}
          style={[
            styles.tabButton,
            activeTab === "owed_to_me" && styles.activeTabButton,
          ]}
        >
          <Feather name="arrow-down" size={18} color={activeTab === "owed_to_me" ? "#10B981" : "#6B7280"} />
          <Text style={[styles.tabButtonText, { color: activeTab === "owed_to_me" ? "#10B981" : "#6B7280" }]}>
            Income
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("i_owe")}
          style={[
            styles.tabButton,
            activeTab === "i_owe" && styles.activeTabButton,
          ]}
        >
          <Feather name="arrow-up" size={18} color={activeTab === "i_owe" ? "#EF4444" : "#6B7280"} />
          <Text style={[styles.tabButtonText, { color: activeTab === "i_owe" ? "#EF4444" : "#6B7280" }]}>
            Expense
          </Text>
        </Pressable>
      </View>
      
      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.id}-${currencyRefreshKey}`}
        renderItem={renderItem}
        scrollEnabled={true}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomPad + 400 },
          (!filtered.length && !settled.length) && styles.emptyContainer,
        ]}
        ListHeaderComponent={
          filtered.length > 0 ? (
            <Text
              style={[
                styles.subheading,
                { color: "#6B7280", fontFamily: "Inter_500Medium" },
              ]}
            >
              Outstanding ({filtered.length})
            </Text>
          ) : null
        }
        ListFooterComponent={
          settled.length > 0 ? (
            <View>
              <Text
                style={[
                  styles.subheading,
                  {
                    color: "#6B7280",
                    fontFamily: "Inter_500Medium",
                    marginTop: 20,
                  },
                ]}
              >
                Settled ({settled.length})
              </Text>
              {settled.map((d) => (
                <DebtCard
                  key={d.id}
                  debt={d}
                  theme={theme}
                  onSettle={handleSettle}
                  onDelete={handleDelete}
                  onEdit={() => {
                    if (!canEdit) return;
                    router.push({
                      pathname: "/add-debt",
                      params: { editId: d.id },
                    });
                  }}
                  t={t}
                  canEdit={canEdit}
                />
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <Feather name="users" size={44} color="#D1D5DB" />
            <Text
              style={[
                styles.emptyText,
                { color: "#6B7280", fontFamily: "Inter_400Regular" },
              ]}
            >
              {activeTab === "owed_to_me"
                ? "No one owes you"
                : "You don't owe anyone"}
            </Text>
            {canEdit && (
              <Pressable
                onPress={() => router.push("/add-debt")}
                style={({ pressed }) => [
                  styles.emptyBtn,
                  { backgroundColor: "#3B82F6", opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={[styles.emptyBtnTxt, { fontFamily: "Inter_600SemiBold" }]}>
                  Add Entry
                </Text>
              </Pressable>
            )}
          </View>
        }
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: "#E5E7EB" }]} />
        )}
      />

      {/* Month Filter Modal */}
      <Modal visible={showMonthFilter} transparent animationType="slide" onRequestClose={() => setShowMonthFilter(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowMonthFilter(false)}>
          <View style={[styles.monthModalContent, { backgroundColor: "#FFFFFF" }]}>
            <Text style={[styles.modalTitle, { color: "#000", fontFamily: "Inter_700Bold" }]}>Select Month</Text>
            
            {/* Year Selection */}
            <Text style={[styles.dateSectionTitle, { color: "#374151" }]}>Year</Text>
            <View style={styles.yearGrid}>
              {[2024, 2025, 2026, 2027].map((year) => (
                <Pressable
                  key={year}
                  onPress={() => setSelectedYear(year)}
                  style={[
                    styles.yearOption,
                    {
                      backgroundColor: selectedYear === year ? "#3B82F6" : "#F3F4F6",
                    }
                  ]}
                >
                  <Text style={[styles.yearOptionText, { color: selectedYear === year ? "#FFFFFF" : "#374151" }]}>
                    {year}
                  </Text>
                </Pressable>
              ))}
            </View>
            
            {/* Month Selection */}
            <Text style={[styles.dateSectionTitle, { color: "#374151", marginTop: 16 }]}>Month</Text>
            <View style={styles.monthGrid}>
              {months.map((month, index) => (
                <Pressable
                  key={month}
                  onPress={() => {
                    setSelectedMonth(index);
                    setShowMonthFilter(false);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.monthOption,
                    {
                      backgroundColor: selectedMonth === index ? "#3B82F6" : "#F3F4F6",
                      borderColor: selectedMonth === index ? "#3B82F6" : "#E5E7EB",
                    }
                  ]}
                >
                  <Text style={[styles.monthOptionText, { color: selectedMonth === index ? "#FFFFFF" : "#374151" }]}>
                    {month}
                  </Text>
                </Pressable>
              ))}
            </View>
            
            <Pressable
              onPress={() => setShowMonthFilter(false)}
              style={styles.closeModalBtn}
            >
              <Text style={styles.closeModalBtnText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
          <View style={[styles.monthModalContent, { backgroundColor: "#FFFFFF" }]}>
            <Text style={[styles.modalTitle, { color: "#000", fontFamily: "Inter_700Bold" }]}>Select Date</Text>
            
            {/* Year Selection */}
            <Text style={[styles.dateSectionTitle, { color: "#374151" }]}>Year</Text>
            <View style={styles.yearGrid}>
              {[2024, 2025, 2026, 2027].map((year) => (
                <Pressable
                  key={year}
                  onPress={() => setSelectedYear(year)}
                  style={[
                    styles.yearOption,
                    {
                      backgroundColor: selectedYear === year ? "#3B82F6" : "#F3F4F6",
                    }
                  ]}
                >
                  <Text style={[styles.yearOptionText, { color: selectedYear === year ? "#FFFFFF" : "#374151" }]}>
                    {year}
                  </Text>
                </Pressable>
              ))}
            </View>
            
            {/* Month Selection */}
            <Text style={[styles.dateSectionTitle, { color: "#374151", marginTop: 16 }]}>Month</Text>
            <View style={styles.monthGrid}>
              {months.map((month, index) => (
                <Pressable
                  key={month}
                  onPress={() => {
                    setSelectedMonth(index);
                    setShowDatePicker(false);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.monthOption,
                    {
                      backgroundColor: selectedMonth === index ? "#3B82F6" : "#F3F4F6",
                      borderColor: selectedMonth === index ? "#3B82F6" : "#E5E7EB",
                    }
                  ]}
                >
                  <Text style={[styles.monthOptionText, { color: selectedMonth === index ? "#FFFFFF" : "#374151" }]}>
                    {month}
                  </Text>
                </Pressable>
              ))}
            </View>
            
            <Pressable onPress={() => setShowDatePicker(false)} style={styles.closeModalBtn}>
              <Text style={styles.closeModalBtnText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Delete Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              {t("deleteEntryTitle")}
            </Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {debtToDelete ? t("deleteEntryMessage", { name: debtToDelete.name }) : ""}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={handleCancelDelete}
                style={({ pressed }) => [
                  styles.modalBtn,
                  { backgroundColor: theme.surface, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={[styles.modalBtnText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {t("cancel")}
                </Text>
              </Pressable>
              <Pressable
                testID="confirm-delete-debt-btn"
                onPress={handleConfirmDelete}
                style={({ pressed }) => [
                  styles.modalBtn,
                  { backgroundColor: theme.expense, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={[styles.modalBtnText, { color: "#FFF", fontFamily: "Inter_600SemiBold" }]}>
                  {t("delete")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DebtCard({
  debt,
  theme,
  onSettle,
  onDelete,
  onEdit,
  t,
  canEdit,  // ADD THIS
}: {
  debt: Debt;
  theme: typeof Colors.dark;
  onSettle: (d: Debt) => void;
  onDelete: (d: Debt) => void;
  onEdit: () => void;
  t: (key: any, params?: Record<string, string | number>) => string;
  canEdit: boolean;  // ADD THIS
}) {
  const isOwedToMe = debt.direction === "owed_to_me";
  const color = isOwedToMe ? "#10B981" : theme.expense;
  const isOverdue =
    !debt.settled && debt.dueDate && new Date(debt.dueDate) < new Date();
const currencyCode = getCurrencyCode();
const formatAmount = (amount: number) => `${currencyCode} ${amount.toLocaleString('en-EG')}`;

  const getReminderMessage = () => {
    return t("reminderMessage", {
      name: debt.name,
      amount: formatAmount(debt.amount),
    });
  };

  const handleWhatsApp = async () => {
    const message = getReminderMessage();
    const phone = debt.phone || "";
    const phoneDigits = phone.replace(/[^0-9]/g, "");
    const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.error("Failed to open WhatsApp", e);
    }
  };

  const handleSMS = async () => {
    const message = getReminderMessage();
    const url = `sms:${debt.phone || ""}?body=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.error("Failed to open SMS", e);
    }
  };

  const handleEmail = async () => {
    const message = getReminderMessage();
    const subject = t("emailSubject", { amount: formatAmount(debt.amount) });
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.error("Failed to open email", e);
    }
  };

  return (
    <Pressable
      onPress={canEdit ? onEdit : undefined}  // Only allow edit if canEdit
      onLongPress={canEdit ? () => onDelete(debt) : undefined}  // Only allow delete if canEdit
      disabled={!canEdit}  // Disable if read only
      style={({ pressed }) => [
        styles.debtCard,
        {
          opacity: pressed && canEdit ? 0.8 : debt.settled ? 0.5 : 1,
          marginBottom: 4,
        },
      ]}
    >
      <View style={[styles.debtAvatar, { backgroundColor: color + "22" }]}>
        <Text style={[styles.debtInitial, { color, fontFamily: "Inter_700Bold" }]}>
          {debt.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.debtContent}>
        <View style={styles.debtTopRow}>
          <Text
            style={[
              styles.debtName,
              {
                color: "#000",
                fontFamily: "Inter_600SemiBold",
                textDecorationLine: debt.settled ? "line-through" : "none",
              },
            ]}
          >
            {debt.name}
          </Text>
          <Text
            style={[
              styles.debtAmount,
              { color, fontFamily: "Inter_700Bold" },
            ]}
          >
            {formatAmount(debt.amount)}
          </Text>
        </View>
        {debt.phone ? (
          <View style={styles.phoneRow}>
            <Feather name="phone" size={11} color="#6B7280" />
            <Text
              style={[
                styles.phoneText,
                { color: "#6B7280", fontFamily: "Inter_400Regular" },
              ]}
            >
              {debt.phone}
            </Text>
          </View>
        ) : null}
        <View style={styles.debtBottomRow}>
          {debt.dueDate ? (
            <View style={styles.dueDateRow}>
              <Feather
                name="calendar"
                size={11}
                color={isOverdue && !debt.settled ? theme.expense : "#6B7280"}
              />
              <Text
                style={[
                  styles.dueDate,
                  {
                    color:
                      isOverdue && !debt.settled
                        ? theme.expense
                        : "#6B7280",
                    fontFamily: "Inter_400Regular",
                  },
                ]}
              >
                {isOverdue && !debt.settled ? "Overdue · " : "Due "}
                {formatDate(debt.dueDate)}
              </Text>
            </View>
          ) : null}
          {debt.note ? (
            <Text
              style={[styles.debtNote, { color: "#6B7280", fontFamily: "Inter_400Regular" }]}
              numberOfLines={1}
            >
              {debt.note}
            </Text>
          ) : null}
        </View>
        {!debt.settled && isOwedToMe ? (
          <View style={styles.reminderRow}>
            {debt.phone ? (
              <>
                <Pressable
                  testID="reminder-whatsapp"
                  onPress={handleWhatsApp}
                  style={({ pressed }) => [
                    styles.reminderBtn,
                    { backgroundColor: "#25D366" + "22", opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Feather name="message-circle" size={12} color="#25D366" />
                  <Text style={[styles.reminderBtnText, { color: "#25D366", fontFamily: "Inter_500Medium" }]}>
                    WhatsApp
                  </Text>
                </Pressable>
                <Pressable
                  testID="reminder-sms"
                  onPress={handleSMS}
                  style={({ pressed }) => [
                    styles.reminderBtn,
                    { backgroundColor: theme.tint + "22", opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Feather name="smartphone" size={12} color={theme.tint} />
                  <Text style={[styles.reminderBtnText, { color: theme.tint, fontFamily: "Inter_500Medium" }]}>
                    SMS
                  </Text>
                </Pressable>
              </>
            ) : null}
            <Pressable
              testID="reminder-email"
              onPress={handleEmail}
              style={({ pressed }) => [
                styles.reminderBtn,
                { backgroundColor: "#F59E0B" + "22", opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Feather name="mail" size={12} color="#F59E0B" />
              <Text style={[styles.reminderBtnText, { color: "#F59E0B", fontFamily: "Inter_500Medium" }]}>
                Email
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      {/* Settle button - ONLY show if canEdit */}
      {!debt.settled && canEdit && (
        <Pressable
          onPress={() => onSettle(debt)}
          style={({ pressed }) => [
            styles.settleBtn,
            { borderColor: "#10B981", opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Feather name="check" size={14} color="#10B981" />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWhite: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    padding: 4,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  monthFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
  },
  monthFilterText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  addBtnBlue: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  totalBalanceCard: {
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  balanceCardGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  balanceCardContent: {
    flexDirection: "row",
    padding: 20,
    alignItems: "center",
  },
  balanceLeft: {
    flex: 1,
  },
  balanceRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  balanceDivider: {
    width: 1,
    height: 50,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 16,
  },
  balanceLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 22,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  balanceEntries: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Inter_400Regular",
  },
  statsWhiteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statsSection: {
    flex: 1,
  },
  statsVerticalDivider: {
    width: 1,
    height: 60,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 16,
  },
  statsIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statsIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  statsTextContainer: {
    flex: 1,
  },
  statsLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  statsAmount: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  statsCount: {
    fontSize: 11,
    color: "#9CA3AF",
    fontFamily: "Inter_400Regular",
  },
  actionBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  actionBtnText: {
    fontSize: 10,
    color: "#374151",
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  viewReportBtn: {
    backgroundColor: "#3B82F6",
  },
  list: { paddingHorizontal: 20, paddingTop: 4 },
  emptyContainer: { flex: 1 },
  emptyContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 60,
    paddingBottom: 200,
    minHeight: 500,
  },
  emptyText: { fontSize: 15 },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  emptyBtnTxt: { color: "#FFF", fontSize: 15 },
  subheading: { fontSize: 13, marginBottom: 10, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  separator: { height: 10 },
  debtCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  debtAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  debtInitial: { fontSize: 18 },
  debtContent: { flex: 1 },
  debtTopRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  debtName: { fontSize: 15, flex: 1, marginRight: 8 },
  debtAmount: { fontSize: 15 },
  debtBottomRow: { gap: 2 },
  dueDateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dueDate: { fontSize: 12 },
  debtNote: { fontSize: 12 },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  phoneText: { fontSize: 12 },
  reminderRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  reminderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  reminderBtnText: { fontSize: 11 },
  settleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  monthModalContent: {
    width: "85%",
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginVertical: 20,
  },
  monthOption: {
    width: "30%",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  monthOptionText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  closeModalBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  closeModalBtnText: {
    fontSize: 14,
    color: "#374151",
    fontFamily: "Inter_500Medium",
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalBtnText: {
    fontSize: 15,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 28 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    color: "#000000",
    flex: 1,
    textAlign: "left",
  },
  dateSectionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  yearGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginBottom: 20,
  },
  yearOption: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  yearOptionText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  activeTabButton: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});