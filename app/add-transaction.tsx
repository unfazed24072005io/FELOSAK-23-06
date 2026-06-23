import { useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState, useEffect, } from "react";
import {
  Alert,
  Image,
  Modal,
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
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useApp, TransactionType } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";
import type { TranslationKey } from "@/i18n/translations";
import { today, parseAmount, isValidDateStr, getCurrencyCode, getCurrencySymbol, subscribeToCurrencyChanges } from "@/utils/format";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
// ✅ GOAL CATEGORIES
const GOAL_CATEGORIES = [
  "Emergency Fund",
  "New Car",
  "Vacation",
  "House Down Payment",
  "Retirement",
  "Education Fund",
  "Business Startup",
  "Debt Payoff",
  "Investment",
  "Wedding",
  "Baby Fund",
  "Home Renovation",
];

// ✅ INVESTMENT CATEGORIES - For INCOME only
const INCOME_INVESTMENT_CATEGORIES = [
  "Investment Income",
  "Dividend",
  "Capital Gains",
  "Interest Income",
  "Rental Income",
  "Stock Profit",
  "Crypto Profit",
];

const INCOME_SAVINGS_CATEGORIES = [
  "Savings",
  "Goal Contribution",
  "Savings Deposit",
  "Goal Fund",
  "Emergency Fund",
];

// ✅ INVESTMENT CATEGORIES - For EXPENSE only
const EXPENSE_INVESTMENT_CATEGORIES = [
  "Investment",
  "Stocks",
  "Bonds",
  "Mutual Fund",
  "Real Estate",
  "Property",
  "Crypto",
  "Bitcoin",
  "Ethereum",
  "Gold",
  "Silver",
  "Fixed Deposit",
  "Brokerage",
  "Trading Fee",
  "Property Maintenance",
];

// ✅ DEBT CATEGORIES - For EXPENSE only (Debt payments)
const EXPENSE_DEBT_CATEGORIES = [
  "Loan Payment",
  "Credit Card Payment",
  "Mortgage Payment",
  "Student Loan Payment",
  "Personal Loan Payment",
  "Car Loan Payment",
  "EMI Payment",
  "Debt Repayment",
];

// ✅ DEBT CATEGORIES - For INCOME only (Money received from loans)
const INCOME_DEBT_CATEGORIES = [
  "Loan Received",
  "Debt Collection Received",
];

// ✅ REGULAR INCOME CATEGORIES (No Investment/Debt)
const REGULAR_INCOME_CATEGORIES = [
  "Sales", 
  "Services", 
  "Consulting", 
  "Rent Received", 
  "Refund", 
  "Other Income",
  "Salary",
  "Freelance",
  "Bonus",
  "Commission",
  "Gift",
];

// ✅ REGULAR EXPENSE CATEGORIES (No Investment/Debt)
const REGULAR_EXPENSE_CATEGORIES = [
  "Inventory", 
  "Salaries", 
  "Rent", 
  "Utilities", 
  "Marketing", 
  "Transport",
  "Maintenance", 
  "Taxes", 
  "Supplies", 
  "Equipment", 
  "Other Expense",
  "Groceries",
  "Dining",
  "Entertainment",
  "Shopping",
  "Healthcare",
  "Insurance",
  "Education",
];

const EXPENSE_SAVINGS_CATEGORIES = [
  "Savings Transfer",
  "Goal Savings",
  "Emergency Fund Savings",
  "Investment Savings",
];

// ✅ FINAL INCOME CATEGORIES (All Income categories combined)
const INCOME_CATEGORIES = [
  ...REGULAR_INCOME_CATEGORIES,
  ...INCOME_INVESTMENT_CATEGORIES,
  ...INCOME_DEBT_CATEGORIES,
  ...INCOME_SAVINGS_CATEGORIES,
];

// ✅ FINAL EXPENSE CATEGORIES (All Expense categories combined)
// REMOVE GOAL_CATEGORIES from here - we'll add them dynamically
const EXPENSE_CATEGORIES = [
  ...REGULAR_EXPENSE_CATEGORIES,
  ...EXPENSE_INVESTMENT_CATEGORIES,
  ...EXPENSE_DEBT_CATEGORIES,
  ...EXPENSE_SAVINGS_CATEGORIES,
];

const PAYMENT_MODES = [
  { id: "cash", label: "Cash", icon: "dollar-sign" as const },
  { id: "instapay", label: "InstaPay", icon: "zap" as const },
  { id: "vodafone_cash", label: "Vodafone Cash", icon: "smartphone" as const },
  { id: "fawry", label: "Fawry", icon: "credit-card" as const },
  { id: "bank_transfer", label: "Bank Transfer", icon: "briefcase" as const },
  { id: "international", label: "International Transfer", icon: "globe" as const },
  { id: "cheque", label: "Cheque", icon: "file-text" as const },
  { id: "other", label: "Other", icon: "more-horizontal" as const },
];

function getPaymentModeLabel(id: string): string {
  return PAYMENT_MODES.find((m) => m.id === id)?.label || id;
}

export { 
  PAYMENT_MODES, 
  getPaymentModeLabel, 
  INCOME_INVESTMENT_CATEGORIES, 
  EXPENSE_INVESTMENT_CATEGORIES,
  INCOME_DEBT_CATEGORIES,
  EXPENSE_DEBT_CATEGORIES,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  GOAL_CATEGORIES,
  INCOME_SAVINGS_CATEGORIES,   // ✅ ADD THIS
  EXPENSE_SAVINGS_CATEGORIES,  // ✅ ADD THIS
};

export default function AddTransactionScreen() {
  const [dynamicGoals, setDynamicGoals] = useState<{ id: string; name: string }[]>([]);
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { addTransaction, updateTransaction, deleteTransaction, transactions } = useApp();
  const { user } = useAuth();
  const { t } = useLanguage();
// In add-transaction.tsx, near the top with other params
// In add-transaction.tsx, near the top where you get params:
// In add-transaction.tsx, near the top:
const params = useLocalSearchParams<{ 
  mode?: string; 
  editId?: string; 
  bookId?: string;
  bookName?: string;
  returnPage?: string; // ✅ This is critical
}>();

// ✅ Extract values with proper defaults
const bookId = params.bookId || "";
const bookName = params.bookName || "";
const returnPage = params.returnPage || "transactions"; // Default to transactions
const isPersonalMode = params.mode === "personal" || !bookId;
  const CATEGORY_I18N: Record<string, TranslationKey> = {
    "Sales": "sales",
    "Services": "services",
    "Consulting": "consulting",
    "Rent Received": "rent",
    "Investment": "investment",
    "Other Income": "otherIncome",
    "Inventory": "inventory",
    "Salaries": "salaries",
    "Rent": "rent",
    "Utilities": "utilities",
    "Marketing": "marketing",
    "Transport": "transport",
    "Maintenance": "maintenance",
    "Taxes": "taxes",
    "Supplies": "supplies",
    "Other Expense": "otherExpense",
    "Stocks": "stocks",
    "Bonds": "bonds",
    "Real Estate": "realEstate",
    "Crypto": "crypto",
    "Loan": "loan",
    "Credit Card": "creditCard",
    "Mortgage": "mortgage",
    "Personal Loan": "personalLoan",
    "Dividend": "dividend",
    "Capital Gains": "capitalGains",
    "Interest": "interest",
    "Rental Income": "rentalIncome",
    "Brokerage": "brokerage",
    "Property Maintenance": "propertyMaintenance",
    "Loan Interest": "loanInterest",
    "Debt Repayment": "debtRepayment",
    "Savings": "savings",
    "Goal Contribution": "goalContribution",
    "Savings Deposit": "savingsDeposit",
    "Goal Fund": "goalFund",
    "Savings Transfer": "savingsTransfer",
    "Goal Savings": "goalSavings",
    "Emergency Fund Savings": "emergencyFundSavings",
    "Investment Savings": "investmentSavings",
  };

  const editTx = useMemo(
    () => (params.editId ? transactions.find((tx) => tx.id === params.editId) : null),
    [params.editId, transactions]
  );

  const [type, setType] = useState<TransactionType>(
    editTx?.type ?? (params.type === "expense" ? "expense" : "income")
  );
  const [amount, setAmount] = useState(editTx ? String(editTx.amount) : "");
  const [category, setCategory] = useState(editTx?.category ?? "");
  const [note, setNote] = useState(editTx?.note ?? "");
  const [date, setDate] = useState(editTx?.date ?? today());
  const [paymentMode, setPaymentMode] = useState(editTx?.paymentMode ?? "cash");
  const [attachment, setAttachment] = useState(editTx?.attachment ?? "");
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [currencyRefreshKey, setCurrencyRefreshKey] = useState(0);
  const currencyCode = getCurrencyCode();
  const currencySymbol = getCurrencySymbol();
const [selectedGoalId, setSelectedGoalId] = useState<string | null>(
  editTx?.goalId || null // Also add goalId to your Transaction type
);
  useEffect(() => {
    const unsubscribe = subscribeToCurrencyChanges(() => {
      console.log("Currency changed, refreshing add-transaction screen");
      setCurrencyRefreshKey(prev => prev + 1);
    });
    return unsubscribe;
  }, []);

  // Load goals from AsyncStorage
useEffect(() => {
  const loadGoals = async () => {
    if (!user) return;
    try {
      console.log("🔄 Loading goals from Firestore for add-transaction...");
      const q = query(
        collection(db, 'goals'),
        where('userId', '==', user.id),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(q);
      const activeGoals: { id: string; name: string }[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        activeGoals.push({
          id: doc.id,
          name: data.name || "",
        });
      });
      console.log("✅ Loaded", activeGoals.length, "active goals from Firestore");
      setDynamicGoals(activeGoals);
    } catch (error) {
      console.error("Error loading goals from Firestore:", error);
    }
  };
  loadGoals();
}, [user]);
  // ✅ FIX: Single categories computation that includes goals
  // ✅ FIX: Single categories computation that includes goals
// In AddTransactionScreen, update the categories computation:
const categories = useMemo(() => {
  const baseCategories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  
  // Add goal categories if they're not already in the list
  const uniqueCategories = [...baseCategories];
  
  // Add all goal names (both static and dynamic)
  const allGoals = [...GOAL_CATEGORIES, ...dynamicGoals.map(g => g.name)];
  allGoals.forEach(goal => {
    if (!uniqueCategories.includes(goal)) {
      uniqueCategories.push(goal);
    }
  });
  
  console.log("📊 Categories for", type, ":", uniqueCategories.length);
  console.log("📊 Goal categories included:", allGoals);
  return uniqueCategories;
}, [type, dynamicGoals]);

  const parsedAmount = useMemo(() => parseAmount(amount), [amount]);
  const dateValid = useMemo(() => isValidDateStr(date), [date]);
  const isValid = useMemo(
    () => parsedAmount !== null && category.length > 0 && dateValid,
    [parsedAmount, category, dateValid]
  );

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleConfirmDelete = useCallback(() => {
    if (!editTx) return;
    deleteTransaction(editTx.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowDeleteConfirm(false);
    router.back();
  }, [editTx, deleteTransaction]);

  // In add-transaction.tsx, update the handleSave function (around line 210):
// Add this function inside AddTransactionScreen component
// Add this function inside AddTransactionScreen component
const updateGoalAmount = useCallback(async (goalId: string, amount: number, type: 'income' | 'expense') => {
  if (!user) {
    console.warn("⚠️ No user, cannot update goal");
    return;
  }
  
  try {
    console.log(`🔵 Updating goal ${goalId}: ${type} ${amount}`);
    const goalRef = doc(db, 'goals', goalId);
    const goalDoc = await getDoc(goalRef);
    
    if (!goalDoc.exists()) {
      console.warn(`⚠️ Goal ${goalId} not found in Firestore`);
      Alert.alert("Warning", "Goal not found. Please refresh your goals.");
      return;
    }
    
    const currentSaved = goalDoc.data().savedAmount || 0;
    console.log(`📊 Current savedAmount: ${currentSaved}`);
    
    let newSaved = currentSaved;
    
    // ✅ BOTH income AND expense ADD to the goal's savedAmount
    // (Expense means you're spending toward the goal, so it counts as progress)
    if (type === 'income' || type === 'expense') {
      newSaved = currentSaved + amount;
    }
    
    console.log(`📊 New savedAmount: ${newSaved}`);
    
    if (newSaved !== currentSaved) {
      await updateDoc(goalRef, {
        savedAmount: newSaved,
        updatedAt: Timestamp.now(),
      });
      console.log(`✅ Goal ${goalId} updated: ${currentSaved} → ${newSaved}`);
      
      // Dispatch event to notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('goalUpdated', { 
          detail: { goalId, savedAmount: newSaved } 
        }));
      }
    } else {
      console.log(`ℹ️ No change needed for goal ${goalId}`);
    }
  } catch (error) {
    console.error("❌ Error updating goal amount:", error);
    Alert.alert("Warning", "Transaction saved but goal was not updated. Please refresh your goals.");
  }
}, [user]);
const handleSave = useCallback(async () => {
  if (!isValid || parsedAmount === null) return;
  if (!dateValid) {
    Alert.alert("Invalid Date", "Please enter a date in YYYY-MM-DD format.");
    return;
  }
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  
  console.log("🔵 SAVING TRANSACTION");
  console.log("🔵 returnPage from params:", returnPage);
  console.log("🔵 isPersonalMode:", isPersonalMode);
  console.log("🔵 bookId:", bookId);
  
  const transactionData = {
    type, 
    amount: parsedAmount, 
    category, 
    note, 
    date, 
    paymentMode, 
    attachment,
    bookId: isPersonalMode ? "personal" : bookId || undefined,
    goalId: selectedGoalId || null,
  };
  
  try {
    if (editTx) {
      // ... edit logic
      updateTransaction(editTx.id, transactionData);
    } else {
      if (selectedGoalId) {
        await updateGoalAmount(selectedGoalId, parsedAmount, type);
      }
      addTransaction(transactionData);
    }
    
    console.log("✅ Transaction saved successfully!");
    
    // ✅ DETERMINE WHERE TO NAVIGATE
    if (isPersonalMode) {
      // ✅ Personal mode: go to transactions page
      console.log("🔵 Personal mode: navigating to transactions page");
      router.push("/transactions");
    } else {
      // ✅ Business mode: go to books page
      console.log("🔵 Business mode: navigating to books page");
      router.push("/books");
    }
    
  } catch (error) {
    console.error("❌ Error saving transaction:", error);
    Alert.alert("Error", "Failed to save transaction. Please try again.");
  }
}, [isValid, parsedAmount, dateValid, type, category, note, date, paymentMode, attachment, editTx, addTransaction, updateTransaction, isPersonalMode, bookId, selectedGoalId, transactions, returnPage, updateGoalAmount]);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setAttachment(`data:image/jpeg;base64,${asset.base64}`);
      } else {
        setAttachment(asset.uri);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Camera access is needed to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setAttachment(`data:image/jpeg;base64,${asset.base64}`);
      } else {
        setAttachment(asset.uri);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  const removeAttachment = useCallback(() => {
    setAttachment("");
    Haptics.selectionAsync();
  }, []);

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
          {editTx ? t("editEntry") : t("newTransaction")}
        </Text>
        <View style={styles.headerRight}>
          {editTx && (
            <Pressable
              onPress={() => setShowDeleteConfirm(true)}
              accessibilityLabel="Delete transaction"
              accessibilityRole="button"
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Feather name="trash-2" size={20} color={theme.expense} />
            </Pressable>
          )}
          <Pressable
            onPress={handleSave}
            disabled={!isValid}
            accessibilityLabel={editTx ? "Update transaction" : "Save transaction"}
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
              {editTx ? t("update") : t("save")}
            </Text>
          </Pressable>
        </View>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 40 }]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <View
          style={[
            styles.typeToggle,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setType("income");
              setCategory("");
            }}
            style={[
              styles.typeBtn,
              type === "income" && {
                backgroundColor: theme.income + "22",
                borderColor: theme.income + "66",
              },
            ]}
          >
            <Feather
              name="trending-up"
              size={16}
              color={type === "income" ? theme.income : theme.textSecondary}
            />
            <Text
              style={[
                styles.typeLabel,
                {
                  color: type === "income" ? theme.income : theme.textSecondary,
                  fontFamily: type === "income" ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {t("income")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setType("expense");
              setCategory("");
            }}
            style={[
              styles.typeBtn,
              type === "expense" && {
                backgroundColor: theme.expense + "22",
                borderColor: theme.expense + "66",
              },
            ]}
          >
            <Feather
              name="trending-down"
              size={16}
              color={type === "expense" ? theme.expense : theme.textSecondary}
            />
            <Text
              style={[
                styles.typeLabel,
                {
                  color: type === "expense" ? theme.expense : theme.textSecondary,
                  fontFamily: type === "expense" ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {t("expense")}
            </Text>
          </Pressable>
        </View>

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

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {t("paymentMode")}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.paymentScroll} contentContainerStyle={styles.paymentScrollContent}>
            {PAYMENT_MODES.map((mode) => {
              const selected = paymentMode === mode.id;
              return (
                <Pressable
                  key={mode.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPaymentMode(mode.id);
                  }}
                  style={({ pressed }) => [
                    styles.paymentChip,
                    {
                      backgroundColor: selected ? theme.tint + "22" : theme.card,
                      borderColor: selected ? theme.tint + "88" : theme.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  testID={`payment-mode-${mode.id}`}
                >
                  <Feather
                    name={mode.icon}
                    size={14}
                    color={selected ? theme.tint : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.paymentLabel,
                      {
                        color: selected ? theme.tint : theme.text,
                        fontFamily: selected ? "Inter_600SemiBold" : "Inter_400Regular",
                      },
                    ]}
                  >
                    {mode.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Category
          </Text>
          <View style={styles.catGrid}>
            {categories.map((cat) => {
  // Check if this is a goal category
  const isGoal = dynamicGoals.some(g => g.name === cat) || GOAL_CATEGORIES.includes(cat);
  const isInvestment = type === "income" 
    ? INCOME_INVESTMENT_CATEGORIES.includes(cat)
    : EXPENSE_INVESTMENT_CATEGORIES.includes(cat);
  const isDebt = type === "income"
    ? INCOME_DEBT_CATEGORIES.includes(cat)
    : EXPENSE_DEBT_CATEGORIES.includes(cat);
  const isSavings = type === "income"
    ? INCOME_SAVINGS_CATEGORIES.includes(cat)
    : EXPENSE_SAVINGS_CATEGORIES.includes(cat);
              
              let categoryColor = theme.text;
              let categoryEmoji = "";
              
              if (isGoal) {
                categoryColor = '#8B5CF6'; // Purple for goals
                categoryEmoji = " 🎯";
              } else if (isInvestment) {
                categoryColor = '#10B981'; // Green for investment
                categoryEmoji = " 📈";
              } else if (isDebt) {
                categoryColor = '#EF4444'; // Red for debt
                categoryEmoji = " 💳";
              } else if (isSavings) {
                categoryColor = '#3B82F6'; // Blue for savings
                categoryEmoji = " 💰";
              }
              
              return (
                <Pressable
                  key={cat}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCategory(cat);
                  }}
                  style={({ pressed }) => [
                    styles.catChip,
                    {
                      backgroundColor:
                        category === cat
                          ? type === "income"
                            ? theme.income + "22"
                            : theme.expense + "22"
                          : theme.card,
                      borderColor:
                        category === cat
                          ? type === "income"
                            ? theme.income + "88"
                            : theme.expense + "88"
                          : theme.border,
                      opacity: pressed ? 0.7 : 1,
                      borderWidth: isGoal || isInvestment || isDebt || isSavings ? 2 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.catChipTxt,
                      {
                        color:
                          category === cat
                            ? type === "income"
                              ? theme.income
                              : theme.expense
                            : categoryColor,
                        fontFamily:
                          category === cat ? "Inter_600SemiBold" : "Inter_400Regular",
                      },
                    ]}
                  >
                    {CATEGORY_I18N[cat] ? t(CATEGORY_I18N[cat]) : cat}
                    {categoryEmoji}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
{((type === 'income' && (GOAL_CATEGORIES.includes(category) || dynamicGoals.some(g => g.name === category))) || 
  (type === 'expense' && (GOAL_CATEGORIES.includes(category) || dynamicGoals.some(g => g.name === category)))) && 
  dynamicGoals.length > 0 && (
  <View style={styles.section}>
    <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
      {type === 'income' ? 'Link to Goal (Income will add to goal)' : 'Link to Goal (Expense will count toward goal)'}
    </Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.paymentScroll} contentContainerStyle={styles.paymentScrollContent}>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          setSelectedGoalId(null);
        }}
        style={({ pressed }) => [
          styles.paymentChip,
          {
            backgroundColor: !selectedGoalId ? theme.tint + "22" : theme.card,
            borderColor: !selectedGoalId ? theme.tint + "88" : theme.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text style={[styles.paymentLabel, { color: !selectedGoalId ? theme.tint : theme.text }]}>
          None
        </Text>
      </Pressable>
      {dynamicGoals.map((goal) => (
        <Pressable
          key={goal.id}
          onPress={() => {
            Haptics.selectionAsync();
            setSelectedGoalId(goal.id);
          }}
          style={({ pressed }) => [
            styles.paymentChip,
            {
              backgroundColor: selectedGoalId === goal.id ? theme.tint + "22" : theme.card,
              borderColor: selectedGoalId === goal.id ? theme.tint + "88" : theme.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.paymentLabel, { color: selectedGoalId === goal.id ? theme.tint : theme.text }]}>
            🎯 {goal.name}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  </View>
)}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {t("date")}
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
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textSecondary + "88"}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

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

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Attachment (optional)
          </Text>
          {attachment ? (
            <View style={[styles.attachmentPreview, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Pressable onPress={() => setShowImagePreview(true)} style={styles.attachmentThumb}>
                <Image source={{ uri: attachment }} style={styles.thumbImage} resizeMode="cover" />
              </Pressable>
              <View style={styles.attachmentInfo}>
                <Feather name="paperclip" size={14} color={theme.tint} />
                <Text style={[styles.attachmentText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  Receipt attached
                </Text>
              </View>
              <Pressable onPress={removeAttachment} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
                <Feather name="x-circle" size={20} color={theme.expense} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.attachmentActions}>
              <Pressable
                onPress={takePhoto}
                style={({ pressed }) => [
                  styles.attachBtn,
                  { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
                ]}
                testID="take-photo-btn"
              >
                <Feather name="camera" size={20} color={theme.tint} />
                <Text style={[styles.attachBtnText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {t("takePhoto")}
                </Text>
              </Pressable>
              <Pressable
                onPress={pickImage}
                style={({ pressed }) => [
                  styles.attachBtn,
                  { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
                ]}
                testID="pick-image-btn"
              >
                <Feather name="image" size={20} color={theme.tint} />
                <Text style={[styles.attachBtnText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {t("gallery")}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>

      {showDeleteConfirm && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowDeleteConfirm(false)}>
            <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                Delete Transaction
              </Text>
              <Text style={[styles.modalMsg, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                Delete this {editTx?.category} entry? This cannot be undone.
              </Text>
              <View style={styles.modalBtns}>
                <Pressable
                  onPress={() => setShowDeleteConfirm(false)}
                  style={({ pressed }) => [styles.modalCancelBtn, { borderColor: theme.border, opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={[styles.modalCancelTxt, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>{t("cancel")}</Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirmDelete}
                  style={({ pressed }) => [styles.modalDeleteBtn, { backgroundColor: theme.expense, opacity: pressed ? 0.8 : 1 }]}
                  testID="confirm-delete-btn"
                >
                  <Text style={[styles.modalDeleteTxt, { fontFamily: "Inter_600SemiBold" }]}>{t("delete")}</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>
      )}

      {showImagePreview && attachment ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowImagePreview(false)}>
          <Pressable style={styles.imagePreviewOverlay} onPress={() => setShowImagePreview(false)}>
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: attachment }} style={styles.fullImage} resizeMode="contain" />
              <Pressable
                onPress={() => setShowImagePreview(false)}
                style={[styles.closePreviewBtn, { backgroundColor: theme.card }]}
              >
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      ) : null}
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
    gap: 0,
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
  amountInput: {
    flex: 1,
    fontSize: 32,
    paddingVertical: 12,
  },
  paymentScroll: {
    marginHorizontal: -20,
  },
  paymentScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: "row",
  },
  paymentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  paymentLabel: { fontSize: 13 },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  catChipTxt: { fontSize: 13 },
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
  attachmentActions: {
    flexDirection: "row",
    gap: 12,
  },
  attachBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed" as const,
  },
  attachBtnText: { fontSize: 14 },
  attachmentPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
  },
  attachmentThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: "hidden",
  },
  thumbImage: {
    width: 48,
    height: 48,
  },
  attachmentInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  attachmentText: { fontSize: 14 },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreviewContainer: {
    width: "90%",
    height: "70%",
    position: "relative",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  closePreviewBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
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