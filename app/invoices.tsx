import React, { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
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
import {formatAmount, getCurrencyCode, getCurrencySymbol, subscribeToCurrencyChanges } from "@/utils/format";
interface InvoiceData {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  issueDate: string;
  dueDate: string;
  total: string;
  status: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "#94A3B822", text: "#94A3B8" },
  sent: { bg: "#3B82F622", text: "#3B82F6" },
  paid: { bg: "#10B98122", text: "#10B981" },
  overdue: { bg: "#EF444422", text: "#EF4444" },
};

export default function InvoicesScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { activeBook } = useApp();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [invoicesList, setInvoicesList] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<InvoiceData | null>(null);
const [refreshKey, setRefreshKey] = useState(0);
const currencyCode = getCurrencyCode();
const currencySymbol = getCurrencySymbol();

useEffect(() => {
  const unsubscribe = subscribeToCurrencyChanges(() => {
    console.log("Currency changed, refreshing invoices screen");
    setRefreshKey(prev => prev + 1);
  });
  return unsubscribe;
}, []);
const formatAmount = (amount: number) => `${currencyCode} ${amount.toLocaleString('en-EG')}`;
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const loadInvoices = useCallback(async () => {
    if (!activeBook?.isCloud || !user) {
      setLoading(false);
      return;
    }
    try {
      const url = new URL(`/api/books/${activeBook.id}/invoices`, getApiUrl());
      const resp = await fetch(url.toString(), { credentials: "include" });
      const data = await resp.json();
      setInvoicesList(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [activeBook, user]);

  useFocusEffect(
    useCallback(() => {
      loadInvoices();
    }, [loadInvoices])
  );

  const handleStatusChange = useCallback(
    async (inv: InvoiceData, newStatus: string) => {
      if (!activeBook?.isCloud) return;
      try {
        const url = new URL(`/api/books/${activeBook.id}/invoices/${inv.id}`, getApiUrl());
        await apiRequest("PUT", url.toString(), { status: newStatus });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loadInvoices();
      } catch (e) {
        console.error(e);
      }
    },
    [activeBook, loadInvoices]
  );

  const handleDelete = useCallback(async () => {
    if (!invoiceToDelete || !activeBook?.isCloud) return;
    try {
      const url = new URL(`/api/books/${activeBook.id}/invoices/${invoiceToDelete.id}`, getApiUrl());
      await apiRequest("DELETE", url.toString());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadInvoices();
    } catch (e) {
      console.error(e);
    }
    setDeleteModal(false);
    setInvoiceToDelete(null);
  }, [invoiceToDelete, activeBook, loadInvoices]);

  const renderInvoice = useCallback(
    ({ item }: { item: InvoiceData }) => {
      const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.draft;
      return (
        <View style={[styles.invoiceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.invoiceHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.invoiceNum, { color: theme.tint, fontFamily: "Inter_700Bold" }]}>
                {item.invoiceNumber}
              </Text>
              <Text style={[styles.clientNameText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {item.clientName}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text, fontFamily: "Inter_600SemiBold" }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.invoiceMeta}>
            <View style={styles.metaItem}>
              <Feather name="calendar" size={12} color={theme.textSecondary} />
              <Text style={[styles.metaText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {item.issueDate}
              </Text>
            </View>
            <Text style={[styles.invoiceTotal, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              {formatEGP(parseFloat(item.total))}
            </Text>
          </View>

          <View style={styles.invoiceActions}>
            {item.status === "draft" ? (
              <Pressable
                onPress={() => handleStatusChange(item, "sent")}
                style={[styles.smallBtn, { backgroundColor: theme.tint + "18" }]}
              >
                <Feather name="send" size={13} color={theme.tint} />
                <Text style={[styles.smallBtnText, { color: theme.tint, fontFamily: "Inter_500Medium" }]}>{t("markAsSent")}</Text>
              </Pressable>
            ) : item.status === "sent" ? (
              <Pressable
                onPress={() => handleStatusChange(item, "paid")}
                style={[styles.smallBtn, { backgroundColor: theme.income + "18" }]}
              >
                <Feather name="check" size={13} color={theme.income} />
                <Text style={[styles.smallBtnText, { color: theme.income, fontFamily: "Inter_500Medium" }]}>{t("markAsPaid")}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                setInvoiceToDelete(item);
                setDeleteModal(true);
              }}
              style={[styles.smallBtn, { backgroundColor: theme.expense + "18" }]}
            >
              <Feather name="trash-2" size={13} color={theme.expense} />
            </Pressable>
          </View>
        </View>
      );
    },
    [theme, t, handleStatusChange]
  );

  return (
    <View key={refreshKey} style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: theme.border, backgroundColor: theme.background }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{t("invoices")}</Text>
        <Pressable
          onPress={() => router.push("/create-invoice")}
          style={({ pressed }) => [styles.addBtn, { backgroundColor: theme.tint, opacity: pressed ? 0.8 : 1 }]}
        >
          <Feather name="plus" size={18} color="#FFF" />
        </Pressable>
      </View>

      <FlatList
  key={`invoice-list-${refreshKey}`}
  data={invoicesList}
  keyExtractor={(item) => `${item.id}-${refreshKey}`}
  renderItem={renderInvoice}
        scrollEnabled={invoicesList.length > 0}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomPad + 40 },
          !invoicesList.length && styles.emptyContainer,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <Feather name="file-text" size={44} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {t("noInvoices")}
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {t("createFirstInvoice")}
            </Text>
          </View>
        }
      />

      <Modal visible={deleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{t("confirmDelete")}</Text>
            <Text style={[styles.modalMsg, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>{t("confirmDeleteMessage")}</Text>
            <View style={styles.modalBtns}>
              <Pressable onPress={() => { setDeleteModal(false); setInvoiceToDelete(null); }} style={[styles.modalBtn, { backgroundColor: theme.surface }]}>
                <Text style={[styles.modalBtnText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{t("cancel")}</Text>
              </Pressable>
              <Pressable onPress={handleDelete} style={[styles.modalBtn, { backgroundColor: theme.expense }]}>
                <Text style={[styles.modalBtnText, { color: "#FFF", fontFamily: "Inter_600SemiBold" }]}>{t("delete")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 20 },
  addBtn: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 20, paddingTop: 16 },
  emptyContainer: { flex: 1, justifyContent: "center" },
  emptyContent: { alignItems: "center", gap: 10 },
  emptyText: { fontSize: 16, marginTop: 4 },
  emptySubtext: { fontSize: 13 },
  invoiceCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 12 },
  invoiceHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  invoiceNum: { fontSize: 13, marginBottom: 2 },
  clientNameText: { fontSize: 16 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11 },
  invoiceMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12 },
  invoiceTotal: { fontSize: 17 },
  invoiceActions: { flexDirection: "row", gap: 8 },
  smallBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  smallBtnText: { fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: "#00000066", justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  modalCard: { borderRadius: 16, padding: 24, width: "100%", maxWidth: 340 },
  modalTitle: { fontSize: 18, marginBottom: 8 },
  modalMsg: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
  modalBtns: { flexDirection: "row", gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  modalBtnText: { fontSize: 14 },
});
