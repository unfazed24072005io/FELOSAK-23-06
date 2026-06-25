// app/create-document.tsx - WITH TYPE SELECTOR & AUTO-REDIRECT
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "@/context/AppContext";
import { getCurrencyCode, getCurrencySymbol, subscribeToCurrencyChanges } from "@/utils/format";
import AsyncStorage from '@react-native-async-storage/async-storage';

type DocumentType = "Invoice" | "Quote" | "Credit Note" | "Purchase Order" | "Delivery Note";

interface LineItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

// Document type configuration
const DOCUMENT_TYPES = [
  { type: "Invoice" as DocumentType, icon: "file-text", color: "#3B82F6", label: "Invoice" },
  { type: "Quote" as DocumentType, icon: "file", color: "#10B981", label: "Quote" },
  { type: "Credit Note" as DocumentType, icon: "credit-card", color: "#8B5CF6", label: "Credit Note" },
  { type: "Purchase Order" as DocumentType, icon: "package", color: "#EC4899", label: "Purchase Order" },
  { type: "Delivery Note" as DocumentType, icon: "truck", color: "#F59E0B", label: "Delivery Note" },
];

export default function CreateDocumentPage() {
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams<{ type: string }>();
  const [showTypeSelector, setShowTypeSelector] = useState(!type);
  const [selectedType, setSelectedType] = useState<DocumentType>("Invoice");
  
  // Convert URL param to exact document type name
  useEffect(() => {
    if (type) {
      let docType: DocumentType = "Invoice";
      if (type === "invoice") docType = "Invoice";
      else if (type === "quote") docType = "Quote";
      else if (type === "credit-note") docType = "Credit Note";
      else if (type === "purchase-order") docType = "Purchase Order";
      else if (type === "delivery-note") docType = "Delivery Note";
      setSelectedType(docType);
      setShowTypeSelector(false);
    }
  }, [type]);
  
  const { addDocument } = useApp();

  // Common fields
  const [partyName, setPartyName] = useState("");
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  
  // Invoice Status field
  const [invoiceStatus, setInvoiceStatus] = useState<"paid" | "unpaid">("unpaid");
  
  // Fields for Credit Note, Purchase Order, Quote (NOT for Invoice)
  const [referenceNo, setReferenceNo] = useState("");
  const [orderNo, setOrderNo] = useState("");
  
  const [items, setItems] = useState<LineItem[]>([]);
  const [taxRate, setTaxRate] = useState(14);
  const [notes, setNotes] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const currencyCode = getCurrencyCode();
  const currencySymbol = getCurrencySymbol();

  useEffect(() => {
    const unsubscribe = subscribeToCurrencyChanges(() => {
      console.log("Currency changed, refreshing create-document screen");
      setRefreshKey(prev => prev + 1);
    });
    return unsubscribe;
  }, []);

  const formatAmount = (amount: number) => `${currencyCode} ${amount.toLocaleString('en-EG')}`;
  const topPad = insets.top + (Platform.OS === "web" ? 16 : 8);

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  // Auto-generate document number
  const getDocumentNumber = () => {
    const prefix = {
      "Invoice": "INV",
      "Quote": "Q",
      "Credit Note": "CN",
      "Purchase Order": "PO",
      "Delivery Note": "DN"
    }[selectedType];
    return `${prefix}-${Date.now().toString().slice(-8)}`;
  };

  const addCustomItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      name: "",
      quantity: 1,
      price: 0,
      total: 0,
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'price') {
        const qty = field === 'quantity' ? Number(value) : item.quantity;
        const price = field === 'price' ? Number(value) : item.price;
        updated.total = qty * price;
      }
      return updated;
    }));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const getDefaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };

  // Check if document type needs reference and order fields
  const needsReferenceAndOrder = () => {
    return ["Credit Note", "Purchase Order", "Quote"].includes(selectedType);
  };

  // Check if document type is Invoice (needs status)
  const isInvoice = () => {
    return selectedType === "Invoice";
  };

  // Get document label for customer/vendor
  const getPartyLabel = () => {
    if (selectedType === "Credit Note") return "Customer Name";
    if (selectedType === "Purchase Order") return "Vendor Name";
    if (selectedType === "Delivery Note") return "Customer Name";
    if (selectedType === "Quote") return "Customer Name";
    if (selectedType === "Invoice") return "Party Name";
    return "Party Name";
  };

  // Handle save
  const handleSave = async () => {
    console.log("🔵🔵🔵 SAVE BUTTON PRESSED 🔵🔵🔵");
    console.log("📄 Document Type:", selectedType);
    console.log("📄 Invoice Status:", invoiceStatus);
    
    if (!partyName.trim()) {
      Alert.alert("Error", `Please enter ${getPartyLabel().toLowerCase()}`);
      return;
    }
    if (items.length === 0) {
      Alert.alert("Error", "Please add at least one item");
      return;
    }
    
    setLoading(true);
    
    try {
      const newDocument: any = {
        number: getDocumentNumber(),
        type: selectedType,
        partyName: partyName.trim(),
        amount: total,
        date: documentDate,
        dueDate: dueDate || getDefaultDueDate(),
        notes: notes,
        items: items,
        bookId: "",
        userId: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "unpaid",
      };
      
      // For Invoice documents, use the selected status
      if (isInvoice()) {
        newDocument.status = invoiceStatus;
        newDocument.invoiceStatus = invoiceStatus;
      }
      
      if (needsReferenceAndOrder()) {
        newDocument.referenceNo = referenceNo;
        newDocument.orderNo = orderNo;
      }
      
      console.log("🔵 Saving document with status:", newDocument.status);
      console.log("🔵 Full document:", newDocument);
      
      // Use addDocument if available, otherwise save directly
      if (typeof addDocument === 'function') {
        await addDocument(newDocument);
        console.log("✅ Document saved via addDocument!");
      } else {
        // Save directly to Firestore
        const { db } = await import('@/config/firebase');
        const { collection, addDoc, Timestamp } = await import('firebase/firestore');
        
        const firestoreData = {
          ...newDocument,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        
        await addDoc(collection(db, 'documents'), firestoreData);
        console.log("✅ Document saved directly to Firestore!");
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // ✅ Store the return page in AsyncStorage
      await AsyncStorage.setItem("return_to_page", "docs");
      
      // ✅ Also store a flag to refresh the documents list
      await AsyncStorage.setItem("refresh_documents", Date.now().toString());
      
      // ✅ Auto-redirect after 1 second
      Alert.alert("Success", `${selectedType} created successfully!`, [
        { 
          text: "OK", 
          onPress: () => {
            router.replace("/(tabs)");
          }
        }
      ]);
      
      // ✅ Auto-close after 2 seconds even if user doesn't tap OK
      setTimeout(() => {
        router.replace("/(tabs)");
      }, 2000);
      
    } catch (error: any) {
      console.error("🔴 Save error:", error);
      Alert.alert("Error", error.message || "Failed to save document");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // TYPE SELECTOR VIEW
  // =============================================
  if (showTypeSelector) {
    return (
      <View style={[styles.container, { backgroundColor: "#FFFFFF", paddingTop: topPad }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Feather name="arrow-left" size={24} color="#000" />
          </Pressable>
          <Text style={styles.headerTitle}>Select Document Type</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.subHeaderText}>Choose the type of document you want to create</Text>
          
          <View style={styles.docTypeGrid}>
            {DOCUMENT_TYPES.map((doc) => (
              <Pressable
                key={doc.type}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const typeParam = doc.type.toLowerCase().replace(/\s/g, '-');
                  router.replace(`/create-document?type=${typeParam}`);
                }}
                style={[
                  styles.docTypeOption,
                  { backgroundColor: doc.color + "10", borderColor: doc.color + "30" }
                ]}
              >
                <View style={[styles.docTypeIcon, { backgroundColor: doc.color + "20" }]}>
                  <Feather name={doc.icon as any} size={28} color={doc.color} />
                </View>
                <Text style={[styles.docTypeName, { color: doc.color }]}>{doc.type}</Text>
              </Pressable>
            ))}
          </View>
          
          {/* AI Generate Option */}
          <Pressable 
            onPress={() => {
              Alert.alert("AI Generation", "AI document generation coming soon!");
            }} 
            style={styles.aiGenerateOption}
          >
            <View style={styles.aiContent}>
              <View>
                <Text style={styles.aiTitle}>Generate with AI</Text>
                <Text style={styles.aiSubtitle}>Create any document using AI</Text>
              </View>
              <View style={styles.aiRobotIcon}>
                <Feather name="cpu" size={40} color="#8B5CF6" />
              </View>
            </View>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // =============================================
  // DOCUMENT FORM VIEW
  // =============================================
  return (
    <View key={refreshKey} style={[styles.container, { backgroundColor: "#FFFFFF", paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => {
          // Go back to type selector instead of previous page
          setShowTypeSelector(true);
          router.replace("/create-document");
        }} hitSlop={8}>
          <Feather name="arrow-left" size={24} color="#000" />
        </Pressable>
        <Text style={styles.headerTitle}>Create {selectedType}</Text>
        <Pressable onPress={handleSave} disabled={loading} hitSlop={8}>
          <Text style={[styles.saveText, { color: loading ? "#9CA3AF" : "#3B82F6", fontFamily: "Inter_600SemiBold" }]}>
            {loading ? "Saving..." : "Save"}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Document Type Badge */}
        <View style={[styles.docTypeBadge, { backgroundColor: DOCUMENT_TYPES.find(d => d.type === selectedType)?.color + "15" }]}>
          <Feather name={DOCUMENT_TYPES.find(d => d.type === selectedType)?.icon as any} size={16} color={DOCUMENT_TYPES.find(d => d.type === selectedType)?.color} />
          <Text style={[styles.docTypeBadgeText, { color: DOCUMENT_TYPES.find(d => d.type === selectedType)?.color }]}>
            {selectedType}
          </Text>
        </View>

        {/* Document Number (Auto-generated display) */}
        <Text style={styles.label}>Document No.</Text>
        <View style={styles.autoGeneratedField}>
          <Text style={styles.autoGeneratedText}>
            {getDocumentNumber()}
          </Text>
          <Text style={styles.autoGeneratedBadge}>Auto-generated</Text>
        </View>

        {/* Party Name */}
        <Text style={styles.label}>{getPartyLabel()} *</Text>
        <TextInput
          style={styles.input}
          placeholder={`Enter ${getPartyLabel().toLowerCase()}`}
          value={partyName}
          onChangeText={setPartyName}
        />

        {/* Document Date */}
        <Text style={styles.label}>Document Date</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={documentDate}
          onChangeText={setDocumentDate}
        />

        {/* Due Date */}
        <Text style={styles.label}>Due Date</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={dueDate}
          onChangeText={setDueDate}
        />

        {/* Invoice Status Selector - Only for Invoice documents */}
        {isInvoice() && (
          <>
            <Text style={styles.label}>Invoice Status</Text>
            <View style={styles.statusSelectorContainer}>
              <Pressable
                onPress={() => {
                  setInvoiceStatus("paid");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.statusOption,
                  invoiceStatus === "paid" && styles.statusOptionPaidActive,
                ]}
              >
                <View style={[
                  styles.statusDot,
                  { backgroundColor: invoiceStatus === "paid" ? "#10B981" : "#D1D5DB" }
                ]} />
                <Text style={[
                  styles.statusOptionText,
                  invoiceStatus === "paid" && styles.statusOptionTextActive,
                ]}>
                  Paid
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setInvoiceStatus("unpaid");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.statusOption,
                  invoiceStatus === "unpaid" && styles.statusOptionUnpaidActive,
                ]}
              >
                <View style={[
                  styles.statusDot,
                  { backgroundColor: invoiceStatus === "unpaid" ? "#EF4444" : "#D1D5DB" }
                ]} />
                <Text style={[
                  styles.statusOptionText,
                  invoiceStatus === "unpaid" && styles.statusOptionTextActive,
                ]}>
                  Unpaid
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {/* Reference No and Order No - ONLY for Credit Note, Purchase Order, Quote */}
        {needsReferenceAndOrder() && (
          <>
            <Text style={styles.label}>Reference No.</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter reference number"
              value={referenceNo}
              onChangeText={setReferenceNo}
            />

            <Text style={styles.label}>Order No.</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter order number"
              value={orderNo}
              onChangeText={setOrderNo}
            />
          </>
        )}

        {/* Items Section */}
        <View style={styles.itemsHeader}>
          <Text style={styles.label}>Items</Text>
          <Pressable onPress={addCustomItem} style={styles.addItemBtn}>
            <Feather name="plus" size={16} color="#3B82F6" />
            <Text style={styles.addItemBtnText}>Add Item</Text>
          </Pressable>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyItems}>
            <Text style={styles.emptyItemsText}>No items added</Text>
          </View>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <TextInput
                  style={styles.itemNameInput}
                  placeholder="Item name"
                  value={item.name}
                  onChangeText={(text) => updateItem(item.id, 'name', text)}
                />
                <Pressable onPress={() => removeItem(item.id)}>
                  <Feather name="trash-2" size={16} color="#EF4444" />
                </Pressable>
              </View>
              <View style={styles.itemRow}>
                <View style={styles.itemQty}>
                  <Text style={styles.itemLabel}>Qty</Text>
                  <TextInput
                    style={styles.qtyInput}
                    keyboardType="numeric"
                    value={item.quantity.toString()}
                    onChangeText={(text) => updateItem(item.id, 'quantity', Number(text) || 0)}
                  />
                </View>
                <View style={styles.itemPrice}>
                  <Text style={styles.itemLabel}>Price</Text>
                  <TextInput
                    style={styles.priceInput}
                    keyboardType="numeric"
                    value={item.price.toString()}
                    onChangeText={(text) => updateItem(item.id, 'price', Number(text) || 0)}
                  />
                </View>
                <View style={styles.itemTotal}>
                  <Text style={styles.itemLabel}>Total</Text>
                  <Text style={styles.totalText}>{formatAmount(item.total)}</Text>
                </View>
              </View>
            </View>
          ))
        )}

        {/* Totals Section */}
        {items.length > 0 && (
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text>{formatAmount(subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({taxRate}%)</Text>
              <Text>{formatAmount(tax)}</Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalAmount}>{formatAmount(total)}</Text>
            </View>
          </View>
        )}

        {/* Notes */}
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Additional notes..."
          multiline
          value={notes}
          onChangeText={setNotes}
        />

        {/* Save Button */}
        <Pressable onPress={handleSave} disabled={loading} style={[styles.saveButton, loading && styles.saveButtonDisabled]}>
          <LinearGradient colors={loading ? ['#9CA3AF', '#9CA3AF'] : ['#3B82F6', '#2563EB']} style={styles.saveGradient}>
            {loading ? (
              <Text style={styles.saveButtonText}>Saving...</Text>
            ) : (
              <Text style={styles.saveButtonText}>Create {selectedType}</Text>
            )}
          </LinearGradient>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "#000" },
  saveText: { fontSize: 16 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  subHeaderText: { fontSize: 14, color: "#6B7280", fontFamily: "Inter_400Regular", marginBottom: 20 },
  label: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#374151", marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontFamily: "Inter_400Regular", marginBottom: 8 },
  itemsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, marginBottom: 12 },
  addItemBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EFF6FF", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addItemBtnText: { fontSize: 12, color: "#3B82F6", fontFamily: "Inter_500Medium" },
  emptyItems: { padding: 20, alignItems: "center", backgroundColor: "#F9FAFB", borderRadius: 12 },
  emptyItemsText: { fontSize: 14, color: "#6B7280" },
  itemCard: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, marginBottom: 12 },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  itemNameInput: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", padding: 0 },
  itemRow: { flexDirection: "row", gap: 12 },
  itemQty: { flex: 1 },
  itemPrice: { flex: 1 },
  itemTotal: { flex: 1, alignItems: "flex-end" },
  itemLabel: { fontSize: 11, color: "#6B7280", marginBottom: 4 },
  qtyInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 14, backgroundColor: "#FFFFFF", textAlign: "center" },
  priceInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 14, backgroundColor: "#FFFFFF" },
  totalText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#000", marginTop: 4 },
  totalsSection: { backgroundColor: "#F9FAFB", borderRadius: 12, padding: 16, marginTop: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  totalLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#374151" },
  grandTotal: { borderTopWidth: 1, borderTopColor: "#E5E7EB", marginTop: 6, paddingTop: 10 },
  grandTotalLabel: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#000" },
  grandTotalAmount: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#3B82F6" },
  notesInput: { height: 80, textAlignVertical: "top" },
  saveButton: { marginTop: 24, borderRadius: 12, overflow: "hidden" },
  saveButtonDisabled: { opacity: 0.6 },
  saveGradient: { paddingVertical: 16, alignItems: "center" },
  saveButtonText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  autoGeneratedField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
    marginBottom: 8,
  },
  autoGeneratedText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "#1F2937",
  },
  autoGeneratedBadge: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  // Status Selector Styles
  statusSelectorContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    flex: 1,
    justifyContent: "center",
  },
  statusOptionPaidActive: {
    borderColor: "#10B981",
    backgroundColor: "#10B98115",
  },
  statusOptionUnpaidActive: {
    borderColor: "#EF4444",
    backgroundColor: "#EF444415",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusOptionText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#6B7280",
  },
  statusOptionTextActive: {
    fontWeight: "600",
    color: "#1F2937",
  },
  // Document Type Selector Styles
  docTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  docTypeOption: {
    width: '47%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  docTypeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  docTypeName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#111827',
  },
  docTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  docTypeBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  // AI Generate Styles
  aiGenerateOption: {
    backgroundColor: "#F3E8FF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E9D5FF",
    marginBottom: 20,
  },
  aiContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#8B5CF6",
    fontFamily: "Inter_700Bold",
  },
  aiSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    fontFamily: "Inter_400Regular",
  },
  aiRobotIcon: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
});
