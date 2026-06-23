// app/(tabs)/invoices.tsx - WITH READ ONLY RESTRICTION
import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  useColorScheme,
  TextInput,
  Alert,
  Image,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useApp, Document, DocumentType } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";  // ADD THIS
import { useLanguage } from "@/context/LanguageContext";
import { formatEGP, formatDate, getCurrencySymbol, getCurrencyCode, subscribeToCurrencyChanges } from "@/utils/format";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

type FilterType = "All" | "Invoice" | "Quote" | "Credit Note" | "Purchase Order" | "Delivery Note";
type StatusFilter = "all" | "paid" | "unpaid" | "overdue";
const FILTERS: FilterType[] = ["All", "Invoice", "Quote", "Credit Note", "Purchase Order", "Delivery Note"];

const DOCUMENT_CONFIG: Record<string, { icon: string; color: string }> = {
  Invoice: { icon: "file-text", color: "#3B82F6" },
  Quote: { icon: "file", color: "#10B981" },
  "Credit Note": { icon: "credit-card", color: "#8B5CF6" },
  "Purchase Order": { icon: "package", color: "#EC4899" },
  "Delivery Note": { icon: "truck", color: "#14B8A6" },
};

// Document Stat Card with colored icon
function StatCard({ type, count, onPress }: { type: FilterType; count: number; onPress: () => void }) {
  let config;
  let iconName = "grid";
  let iconColor = "#6B7280";
  
  if (type === "All") {
    iconName = "grid";
    iconColor = "#6B7280";
  } else {
    config = DOCUMENT_CONFIG[type];
    iconName = config.icon;
    iconColor = config.color;
  }
  
  return (
    <Pressable onPress={onPress} style={styles.statCard}>
      <View style={[styles.statIconCircle, { backgroundColor: iconColor + "15" }]}>
        <Feather name={iconName as any} size={20} color={iconColor} />
      </View>
      <Text style={styles.statType}>{type}</Text>
      <Text style={[styles.statCount, { color: iconColor }]}>{count}</Text>
    </Pressable>
  );
}

// Document Icon with consistent colors
function DocumentIcon({ type, size = 40 }: { type: string; size?: number }) {
  const config = DOCUMENT_CONFIG[type];
  const defaultConfig = DOCUMENT_CONFIG.Invoice;
  const usedConfig = config || defaultConfig;
  
  return (
    <View style={[styles.docIconCircle, { backgroundColor: usedConfig.color + "15", width: size, height: size, borderRadius: size / 2 }]}>
      <Feather name={usedConfig.icon as any} size={size * 0.5} color={usedConfig.color} />
    </View>
  );
}

// Document Type Badge with consistent colors
function DocumentTypeBadge({ type }: { type: string }) {
  const config = DOCUMENT_CONFIG[type] || DOCUMENT_CONFIG.Invoice;
  return (
    <View style={[styles.typeBadge, { backgroundColor: config.color + "15" }]}>
      <Text style={[styles.typeBadgeText, { color: config.color }]}>{type}</Text>
    </View>
  );
}

// Status Badge for payment status - ONLY for Invoices
function StatusBadge({ status, documentType }: { status: "paid" | "unpaid" | "overdue"; documentType: string }) {
  if (documentType !== "Invoice") return null;
  
  const config = {
    paid: { color: "#10B981", text: "Paid", icon: "check-circle" },
    unpaid: { color: "#F59E0B", text: "Unpaid", icon: "clock" },
    overdue: { color: "#EF4444", text: "Overdue", icon: "alert-triangle" },
  };
  const current = config[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: current.color + "15" }]}>
      <Feather name={current.icon as any} size={12} color={current.color} />
      <Text style={[styles.statusBadgeText, { color: current.color }]}>{current.text}</Text>
    </View>
  );
}

// Recent Document Card with download button - HIDE edit/delete if canEdit is false
function RecentDocumentCard({ document, onPress, onDownload, canEdit }: { 
  document: Document; 
  onPress: () => void; 
  onDownload: () => void;
  canEdit: boolean;
}) {
  const getDocumentStatus = (doc: Document): "paid" | "unpaid" | "overdue" => {
    if (doc.status === "paid") return "paid";
    const today = new Date();
    const dueDate = new Date(doc.dueDate || doc.date);
    if (dueDate < today) return "overdue";
    return "unpaid";
  };

  const status = getDocumentStatus(document);

  return (
    <Pressable onPress={canEdit ? onPress : undefined} disabled={!canEdit} style={[styles.recentCard, { opacity: !canEdit ? 0.8 : 1 }]}>
      <DocumentIcon type={document.type} size={44} />
      <View style={styles.recentContent}>
        <Text style={styles.recentNumber} numberOfLines={1}>{document.number}</Text>
        <Text style={styles.recentParty} numberOfLines={1}>{document.partyName}</Text>
      </View>
      <View style={styles.badgeContainer}>
        <DocumentTypeBadge type={document.type} />
        <StatusBadge status={status} documentType={document.type} />
        <Pressable onPress={onDownload} style={styles.downloadBtn}>
          <Feather name="download" size={16} color="#3B82F6" />
        </Pressable>
      </View>
    </Pressable>
  );
}

// Document Detail Modal - HIDE mark as paid button if canEdit is false
function DocumentDetailModal({ visible, onClose, document, onUpdateDocument, onDownloadPDF, canEdit }: { 
  visible: boolean; 
  onClose: () => void; 
  document: Document | null;
  onUpdateDocument: (id: string, data: Partial<Document>) => Promise<void>;
  onDownloadPDF: (doc: Document) => void;
  canEdit: boolean;
}) {
  if (!document) return null;
  const config = DOCUMENT_CONFIG[document.type] || DOCUMENT_CONFIG.Invoice;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={[styles.modalContentFull, { backgroundColor: "#FFFFFF" }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="arrow-left" size={24} color="#000" />
            </Pressable>
            <Text style={styles.modalTitle}>Document Details</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[styles.detailStatusBadge, { backgroundColor: config.color + "15" }]}>
              <View style={[styles.detailStatusDot, { backgroundColor: config.color }]} />
              <Text style={[styles.detailStatusText, { color: config.color }]}>{document.type}</Text>
            </View>

            <Text style={styles.detailNumber}>{document.number}</Text>

            <View style={styles.detailRow}>
              <Feather name="user" size={18} color="#6B7280" />
              <Text style={styles.detailLabel}>Party Name</Text>
              <Text style={styles.detailValue}>{document.partyName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Feather name="dollar-sign" size={18} color="#6B7280" />
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={[styles.detailAmount, { color: config.color }]}>{getCurrencyCode()} {document.amount.toLocaleString('en-EG')}</Text>
            </View>

            <View style={styles.detailRow}>
              <Feather name="calendar" size={18} color="#6B7280" />
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(document.date)}</Text>
            </View>

            {document.dueDate && (
              <View style={styles.detailRow}>
                <Feather name="alert-circle" size={18} color="#6B7280" />
                <Text style={styles.detailLabel}>Due Date</Text>
                <Text style={styles.detailValue}>{formatDate(document.dueDate)}</Text>
              </View>
            )}

            {document.notes && (
              <View style={styles.detailRow}>
                <Feather name="file-text" size={18} color="#6B7280" />
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.detailValue}>{document.notes}</Text>
              </View>
            )}

            {document.items && document.items.length > 0 && (
              <View style={styles.itemsSection}>
                <Text style={styles.itemsTitle}>Items</Text>
                {document.items.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemQty}>x{item.quantity}</Text>
                    <Text style={styles.itemPrice}>{getCurrencyCode()} {item.price.toLocaleString('en-EG')}</Text>
                    <Text style={styles.itemTotal}>{getCurrencyCode()} {item.total.toLocaleString('en-EG')}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Download PDF Button - Always visible */}
            <Pressable
              onPress={() => onDownloadPDF(document)}
              style={styles.downloadPdfBtn}
            >
              <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.downloadPdfGradient}>
                <Feather name="download" size={20} color="#FFF" />
                <Text style={styles.downloadPdfText}>Download PDF</Text>
              </LinearGradient>
            </Pressable>

            {/* Mark as Paid Button - ONLY show if canEdit is true */}
            {canEdit && (document.type === "Invoice" && document.status !== "paid") && (
              <Pressable
                onPress={async () => {
                  try {
                    await onUpdateDocument(document.id, { status: "paid" });
                    Alert.alert("Success", "Invoice marked as paid");
                    onClose();
                  } catch (error) {
                    Alert.alert("Error", "Failed to mark as paid");
                  }
                }}
                style={styles.markPaidBtn}
              >
                <LinearGradient colors={['#10B981', '#059669']} style={styles.markPaidGradient}>
                  <Feather name="check-circle" size={20} color="#FFF" />
                  <Text style={styles.markPaidText}>Mark as Paid</Text>
                </LinearGradient>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Create Document Modal - DISABLED if canEdit is false
function CreateDocumentModal({ visible, onClose, canEdit }: { visible: boolean; onClose: () => void; canEdit: boolean }) {
  const handleSelectType = (type: string) => {
    if (!canEdit) return;
    onClose();
    router.push({ pathname: "/create-document", params: { type: type.toLowerCase().replace(/\s/g, "-") } });
  };

  const handleAIGenerate = () => {
    if (!canEdit) return;
    onClose();
    router.push("/ai-document-chat");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={[styles.modalContentFull, { backgroundColor: "#FFFFFF" }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Document</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={24} color="#000" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Pressable onPress={handleAIGenerate} disabled={!canEdit} style={[styles.aiGenerateOption, { opacity: !canEdit ? 0.6 : 1 }]}>
              <View style={styles.aiContent}>
                <View>
                  <Text style={styles.aiTitle}>Generate with AI</Text>
                  <Text style={styles.aiSubtitle}>Create any document using text or voice</Text>
                </View>
                <View style={styles.aiRobotIcon}>
                  <Image 
                    source={{ uri: "https://i.ibb.co/N6YschDX/Gemini-Generated-Image-aua6dsaua6dsaua6.png" }}
                    style={styles.aiRobotImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </Pressable>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: "#E5E7EB" }]} />
              <Text style={[styles.dividerText, { color: "#9CA3AF" }]}>OR CHOOSE DOCUMENT TYPE</Text>
              <View style={[styles.dividerLine, { backgroundColor: "#E5E7EB" }]} />
            </View>

            {Object.keys(DOCUMENT_CONFIG).map((type) => (
              <Pressable 
                key={type} 
                onPress={() => handleSelectType(type)} 
                disabled={!canEdit}
                style={[styles.typeOptionRow, { opacity: !canEdit ? 0.6 : 1 }]}
              >
                <View style={[styles.typeOptionIconRow, { backgroundColor: DOCUMENT_CONFIG[type].color + "15" }]}>
                  <Feather name={DOCUMENT_CONFIG[type].icon as any} size={24} color={DOCUMENT_CONFIG[type].color} />
                </View>
                <Text style={styles.typeOptionTextRow}>{type}</Text>
                <Feather name="chevron-right" size={20} color="#9CA3AF" />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Main Component
export default function DocumentsHub() {
  const insets = useSafeAreaInsets();
  const { documents, fetchDocuments, activeBook, updateDocument } = useApp();
  const { currentBookAccess, isBookRestricted } = useAuth();  // ADD THIS
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeFilter, setActiveFilter] = useState<FilterType>("All");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentDetail, setShowDocumentDetail] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Determine if user can edit
  const canEdit = !isBookRestricted || currentBookAccess?.accessLevel === "write";

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  // Load documents when component mounts or book changes
  const loadDocuments = async () => {
    if (activeBook) {
      console.log("Loading documents for book:", activeBook.id);
      await fetchDocuments(activeBook.id);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [activeBook]);

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
      return () => {};
    }, [activeBook])
  );
  
  const [currencyRefreshKey, setCurrencyRefreshKey] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToCurrencyChanges(() => {
      console.log("Currency changed, refreshing documents hub");
      setCurrencyRefreshKey(prev => prev + 1);
    });
    return unsubscribe;
  }, []);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadDocuments();
    setRefreshing(false);
  };

  // Generate PDF for a single document
  const generateDocumentPDF = async (document: Document) => {
    if (!document) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const config = DOCUMENT_CONFIG[document.type] || DOCUMENT_CONFIG.Invoice;
      const currencyCode = getCurrencyCode();
      
      const formatAmount = (amount: number) => `${currencyCode} ${amount.toLocaleString('en-EG')}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${document.number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; margin: 0; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid ${config.color}; padding-bottom: 20px; }
            .header h1 { color: ${config.color}; margin: 0; font-size: 24px; }
            .header p { color: #666; margin: 5px 0 0; font-size: 12px; }
            .doc-info { background: #F9FAFB; padding: 15px; border-radius: 10px; margin-bottom: 20px; }
            .doc-number { font-size: 16px; font-weight: bold; color: ${config.color}; margin-bottom: 10px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .label { font-weight: bold; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: ${config.color}; color: white; padding: 10px; text-align: left; font-size: 12px; }
            td { padding: 8px 10px; border-bottom: 1px solid #E5E7EB; font-size: 11px; }
            .total-row { margin-top: 20px; text-align: right; font-size: 16px; font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #E5E7EB; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${document.type}</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
          <div class="doc-info">
            <div class="doc-number">${document.number}</div>
            <div class="row"><span class="label">Party Name:</span><span>${document.partyName}</span></div>
            <div class="row"><span class="label">Date:</span><span>${formatDate(document.date)}</span></div>
            ${document.dueDate ? `<div class="row"><span class="label">Due Date:</span><span>${formatDate(document.dueDate)}</span></div>` : ''}
            <div class="row"><span class="label">Amount:</span><span style="color: ${config.color}; font-weight: bold;">${formatAmount(document.amount)}</span></div>
          </div>
          ${document.items && document.items.length > 0 ? `
          <table>
            <thead><tr><th>Item</th><th>Quantity</th><th>Price</th><th>Total</th></tr></thead>
            <tbody>
              ${document.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>${formatAmount(item.price)}</td>
                  <td>${formatAmount(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : ''}
          ${document.notes ? `<div class="row" style="margin-top: 20px;"><span class="label">Notes:</span><span>${document.notes}</span></div>` : ''}
          <div class="footer">
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
        Alert.alert("Success", "PDF generated and shared!");
      }
    } catch (error) {
      console.error("PDF Error:", error);
      Alert.alert("Error", "Failed to generate PDF");
    }
  };

  // Calculate stats with real document counts
  const getCountForType = (type: string) => {
    if (type === "All") return documents.length;
    return documents.filter(doc => doc.type === type).length;
  };
  
  const getDocumentStatus = (doc: Document): "paid" | "unpaid" | "overdue" => {
    if (doc.status === "paid") return "paid";
    const today = new Date();
    const dueDate = new Date(doc.dueDate || doc.date);
    if (dueDate < today) return "overdue";
    return "unpaid";
  };
  
  const filteredDocuments = useMemo(() => {
    let filtered = documents;
    if (activeFilter !== "All") {
      filtered = filtered.filter(doc => doc.type === activeFilter);
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter(doc => getDocumentStatus(doc) === statusFilter);
    }
    if (searchQuery) {
      filtered = filtered.filter(doc =>
        doc.partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.number.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [documents, activeFilter, searchQuery, statusFilter]);
  
  const counts = useMemo(() => {
    const counts = { all: documents.length, paid: 0, unpaid: 0, overdue: 0 };
    documents.forEach(doc => {
      const status = getDocumentStatus(doc);
      counts[status]++;
    });
    return counts;
  }, [documents]);
  
  const invoiceCounts = useMemo(() => {
    const invoices = documents.filter(doc => doc.type === "Invoice");
    const counts = { all: invoices.length, paid: 0, unpaid: 0, overdue: 0 };
    invoices.forEach(doc => {
      const status = getDocumentStatus(doc);
      counts[status]++;
    });
    return counts;
  }, [documents]);
  
  const handleStatPress = (type: FilterType) => {
    setActiveFilter(type);
    setStatusFilter("all");
  };

  const handleDocumentPress = (document: Document) => {
    setSelectedDocument(document);
    setShowDocumentDetail(true);
  };

  const renderRecentDocument = ({ item }: { item: Document }) => (
    <RecentDocumentCard 
      document={item} 
      onPress={() => handleDocumentPress(item)} 
      onDownload={() => generateDocumentPDF(item)}
      canEdit={canEdit}  // PASS canEdit
    />
  );

  const isInvoiceFilterActive = activeFilter === "Invoice";

  return (
    <View style={[styles.container, { backgroundColor: "#F9FAFB" }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={styles.headerTitle}>Documents Hub</Text>
        <View style={styles.headerRight}>
          <Pressable onPress={() => setShowSearchBar(!showSearchBar)} style={styles.iconBtn}>
            <Feather name="search" size={22} color={showSearchBar ? "#3B82F6" : "#6B7280"} />
          </Pressable>
        </View>
      </View>

      {/* Search Bar */}
      {showSearchBar && (
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search documents..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Feather name="x" size={20} color="#9CA3AF" />
            </Pressable>
          )}
        </View>
      )}

      {/* Filter Chips */}
      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
          {FILTERS.map((filter) => (
            <Pressable
              key={filter}
              onPress={() => handleStatPress(filter)}
              style={[styles.filterChip, activeFilter === filter && styles.activeFilterChip]}
            >
              <Text style={[styles.filterChipText, activeFilter === filter && styles.activeFilterChipText]}>
                {filter}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      
      {/* Status Filter Row */}
      {isInvoiceFilterActive && (
        <View style={styles.statusFilterRow}>
          {(["all", "unpaid", "paid", "overdue"] as StatusFilter[]).map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setStatusFilter(filter)}
              style={[styles.statusFilterTab, statusFilter === filter && styles.activeStatusFilterTab]}
            >
              <Text style={[styles.statusFilterText, statusFilter === filter && styles.activeStatusFilterText]}>
                {filter === "all" ? `All (${invoiceCounts.all})` : 
                 filter === "paid" ? `Paid (${invoiceCounts.paid})` :
                 filter === "unpaid" ? `Unpaid (${invoiceCounts.unpaid})` :
                 `Overdue (${invoiceCounts.overdue})`}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* AI Generate Banner - ONLY show if canEdit */}
      {canEdit && (
        <Pressable onPress={() => setShowCreateModal(true)} style={styles.aiBanner}>
          <View style={styles.aiBannerContent}>
            <View style={styles.aiBannerLeft}>
              <Text style={styles.aiBannerTitle}>Generate with AI</Text>
              <Text style={styles.aiBannerSubtitle}>Create any document in seconds using text or voice</Text>
            </View>
            <View style={styles.aiRobotIcon}>
              <Image 
                source={{ uri: "https://i.ibb.co/N6YschDX/Gemini-Generated-Image-aua6dsaua6dsaua6.png" }}
                style={styles.aiRobotImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </Pressable>
      )}

      {/* Document Stats Cards */}
      <View style={styles.statsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScrollContent}>
          <StatCard type="All" count={getCountForType("All")} onPress={() => handleStatPress("All")} />
          {Object.keys(DOCUMENT_CONFIG).map((type) => (
            <StatCard 
              key={type} 
              type={type as FilterType} 
              count={getCountForType(type)} 
              onPress={() => handleStatPress(type as FilterType)} 
            />
          ))}
        </ScrollView>
      </View>

      {/* Recent Documents Header */}
      <View style={styles.recentHeader}>
        <Text style={styles.recentTitle}>Recent Documents</Text>
        <Pressable onPress={() => handleStatPress("All")}>
          <Text style={styles.viewAllText}>View All</Text>
        </Pressable>
      </View>

      {/* Recent Documents List */}
      <FlatList
        data={filteredDocuments}
        keyExtractor={(item) => `${item.id}-${currencyRefreshKey}`}
        renderItem={renderRecentDocument}
        contentContainerStyle={[styles.recentList, { paddingBottom: bottomPad + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#3B82F6"]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <Feather name="file-text" size={44} color="#D1D5DB" />
            <Text style={styles.emptyText}>No documents found</Text>
            {canEdit && (
              <Pressable onPress={() => setShowCreateModal(true)} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnTxt}>Create Document</Text>
              </Pressable>
            )}
          </View>
        }
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: "#F0F0F0" }]} />}
      />
      
      {/* Create Document FAB - ONLY show if canEdit */}
      {canEdit && (
        <Pressable onPress={() => setShowCreateModal(true)} style={[styles.fab, { bottom: bottomPad + 80 }]}>
          <LinearGradient colors={['#3B82F6', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabGradient}>
            <Feather name="plus" size={28} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      )}

      {/* Modals */}
      <CreateDocumentModal visible={showCreateModal} onClose={() => setShowCreateModal(false)} canEdit={canEdit} />
      <DocumentDetailModal 
        visible={showDocumentDetail} 
        onClose={() => setShowDocumentDetail(false)} 
        document={selectedDocument}
        onUpdateDocument={updateDocument}
        onDownloadPDF={generateDocumentPDF}
        canEdit={canEdit}  // PASS canEdit
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // ... (keep all existing styles, they remain the same)
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#000" },
  headerRight: { flexDirection: "row", gap: 16, alignItems: "center" },
  iconBtn: { padding: 4, position: "relative" },
  notificationBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular" },
  filterWrapper: { marginBottom: 16 },
  filterScrollContent: { paddingHorizontal: 20, gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activeFilterChip: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  filterChipText: { fontSize: 14, color: "#000", fontFamily: "Inter_500Medium" },
  activeFilterChipText: { color: "#FFFFFF" },
  aiBanner: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: "#F3E8FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    overflow: "hidden",
  },
  aiBannerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  aiBannerLeft: { flex: 1 },
  aiBannerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#8B5CF6" },
  aiBannerSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B7280", marginTop: 4 },
  aiRobotIcon: { width: 60, height: 60, alignItems: "center", justifyContent: "center" },
  statsWrapper: { marginBottom: 20 },
  statsScrollContent: { paddingHorizontal: 20, gap: 12 },
  statCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    width: 90,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  statIconCircle: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    alignItems: "center", 
    justifyContent: "center", 
    marginBottom: 8 
  },
  statType: { fontSize: 12, color: "#6B7280", fontFamily: "Inter_500Medium", marginBottom: 4, textAlign: "center" },
  statCount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  recentTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#000" },
  viewAllText: { fontSize: 14, color: "#3B82F6", fontFamily: "Inter_600SemiBold" },
  recentList: { paddingHorizontal: 20 },
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
    flexWrap: "nowrap",
  },
  recentContent: { 
    flex: 1, 
    flexShrink: 1,
    minWidth: 0,
  },
  recentNumber: { 
    fontSize: 14, 
    fontFamily: "Inter_600SemiBold", 
    color: "#000",
    flexShrink: 1,
  },
  recentParty: { 
    fontSize: 12, 
    color: "#6B7280", 
    fontFamily: "Inter_400Regular", 
    marginTop: 2,
    flexShrink: 1,
  },
  badgeContainer: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    flexShrink: 0,
  },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  typeBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  docIconCircle: { alignItems: "center", justifyContent: "center" },
  separator: { height: 1 },
  emptyContent: { alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 60 },
  emptyText: { fontSize: 15, color: "#6B7280", fontFamily: "Inter_400Regular" },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: "#3B82F6" },
  emptyBtnTxt: { color: "#FFF", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  fab: { 
    position: "absolute", 
    right: 20, 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    overflow: "hidden", 
    shadowColor: "#3B82F6", 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 5 
  },
  fabGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContentFull: { width: "90%", maxHeight: "85%", borderRadius: 24, padding: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#000" },
  aiGenerateOption: { backgroundColor: "#F3E8FF", borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: "#E9D5FF" },
  aiContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20 },
  aiTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#8B5CF6" },
  aiSubtitle: { fontSize: 12, color: "#6B7280", marginTop: 4 },
  aiIconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, marginHorizontal: 12, fontFamily: "Inter_500Medium" },
  typeOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  typeOptionIconRow: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginRight: 16 },
  typeOptionTextRow: { flex: 1, fontSize: 16, fontFamily: "Inter_500Medium", color: "#000" },
  detailStatusBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16, gap: 6 },
  detailStatusDot: { width: 8, height: 8, borderRadius: 4 },
  detailStatusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  detailNumber: { fontSize: 14, color: "#6B7280", marginBottom: 16 },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 16, flexWrap: "wrap" },
  detailLabel: { fontSize: 14, color: "#6B7280", marginLeft: 8, flex: 1 },
  detailValue: { fontSize: 14, color: "#000", fontFamily: "Inter_500Medium" },
  detailAmount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  itemsSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#F0F0F0" },
  itemsTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#000", marginBottom: 12 },
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  itemName: { flex: 2, fontSize: 14, color: "#000" },
  itemQty: { flex: 1, fontSize: 14, color: "#6B7280", textAlign: "center" },
  itemPrice: { flex: 1, fontSize: 14, color: "#6B7280", textAlign: "right" },
  itemTotal: { flex: 1, fontSize: 14, fontWeight: "bold", textAlign: "right", color: "#3B82F6" },
  aiRobotImage: { width: 60, height: 60 },
  statusFilterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    marginBottom: 8,
  },
  statusFilterTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
  },
  activeStatusFilterTab: {
    backgroundColor: "#3B82F6",
  },
  statusFilterText: {
    fontSize: 13,
    color: "#6B7280",
    fontFamily: "Inter_500Medium",
  },
  activeStatusFilterText: {
    color: "#FFFFFF",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  markPaidBtn: {
    marginTop: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  markPaidGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  markPaidText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  downloadBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  downloadPdfBtn: {
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  downloadPdfGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  downloadPdfText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});