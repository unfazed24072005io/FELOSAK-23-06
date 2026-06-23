import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from 'expo-linear-gradient';
import {
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp, Product } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";  // ADD THIS
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";
import { formatEGP, getCurrencyCode, subscribeToCurrencyChanges } from "@/utils/format";

export default function StoreScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { products, activeBook, updateProduct, deleteProduct } = useApp();
  const { currentBookAccess, isBookRestricted } = useAuth();  // ADD THIS
  const { t } = useLanguage();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterStock, setFilterStock] = useState<"all" | "inStock" | "outOfStock">("all");
  const [currencyRefreshKey, setCurrencyRefreshKey] = useState(0);

  // Determine if user can edit
  const canEdit = !isBookRestricted || currentBookAccess?.accessLevel === "write";

  useEffect(() => {
    const unsubscribe = subscribeToCurrencyChanges(() => {
      console.log("Currency changed, refreshing store screen");
      setCurrencyRefreshKey(prev => prev + 1);
    });
    return unsubscribe;
  }, []);
  
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const filteredProducts = products.filter(product => {
    // Search filter
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    // Stock filter
    const matchesStock = 
      filterStock === "all" ? true :
      filterStock === "inStock" ? (product.quantity || 0) > 0 :
      (product.quantity || 0) === 0;
    return matchesSearch && matchesStock;
  });

  const handleShare = useCallback(async () => {
    if (!activeBook) return;
    alert("Store sharing will be available soon");
  }, [activeBook]);

  const handleLongPress = useCallback((product: Product) => {
    if (!canEdit) return;  // ADD THIS - Prevent delete if read only
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setDeleteTargetId(product.id);
    setShowDeleteConfirm(true);
  }, [canEdit]);

  const handleConfirmDelete = useCallback(() => {
    if (deleteTargetId) {
      deleteProduct(deleteTargetId);
    }
    setShowDeleteConfirm(false);
    setDeleteTargetId(null);
  }, [deleteTargetId, deleteProduct]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setDeleteTargetId(null);
  }, []);

  const handleUpdateQuantity = useCallback((product: Product, change: number) => {
    if (!canEdit) return;  // ADD THIS - Prevent quantity change if read only
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newQuantity = Math.max(0, (product.quantity || 0) + change);
    updateProduct(product.id, { quantity: newQuantity, inStock: newQuantity > 0 });
  }, [updateProduct, canEdit]);

  const toggleSearchBar = () => {
    Haptics.selectionAsync();
    setShowSearchBar(!showSearchBar);
    if (showSearchBar) {
      setSearchQuery("");
    }
  };

  const openFilterModal = () => {
    Haptics.selectionAsync();
    setShowFilterModal(true);
  };

  const applyFilter = (stock: "all" | "inStock" | "outOfStock") => {
    Haptics.selectionAsync();
    setFilterStock(stock);
    setShowFilterModal(false);
  };

  const calculateTotalCost = useCallback((product: Product) => {
    return (product.quantity || 0) * (product.costPrice || product.price);
  }, []);

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => {
      const currencyCode = getCurrencyCode();
      
      return (
        <Pressable
          onPress={() => {
            if (!canEdit) return;  // ADD THIS - Prevent edit if read only
            router.push({ pathname: "/add-product", params: { editId: item.id } });
          }}
          onLongPress={() => handleLongPress(item)}
          disabled={!canEdit}  // ADD THIS - Disable if read only
          style={({ pressed }) => [
            styles.productCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              opacity: pressed && canEdit ? 0.85 : !canEdit ? 0.7 : 1,
            },
          ]}
        >
          {/* Left - Image */}
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.productImage} />
          ) : (
            <View style={[styles.productImagePlaceholder, { backgroundColor: theme.surface }]}>
              <Feather name="package" size={40} color={theme.textSecondary} />
            </View>
          )}
          
          {/* Middle - Product Details */}
          <View style={styles.productInfo}>
            <Text
              style={[styles.productName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
              numberOfLines={2}
            >
              {item.name}
            </Text>
            
            <View style={styles.priceRow}>
              {item.costPrice && (
                <Text style={[styles.costPrice, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  Cost: {currencyCode} {item.costPrice.toLocaleString()}
                </Text>
              )}
            </View>
            
            {/* Total Cost Card */}
            <View style={[styles.totalCostCard, { backgroundColor: theme.surface + '80' }]}>
              <Text style={[styles.totalCostLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                Total Value:
              </Text>
              <Text style={[styles.totalCostValue, { color: theme.tint, fontFamily: "Inter_700Bold" }]}>
                {currencyCode} {calculateTotalCost(item).toLocaleString()}
              </Text>
            </View>

            <View style={styles.stockControls}>
              <View style={styles.quantityControls}>
                <Pressable
                  onPress={() => handleUpdateQuantity(item, -1)}
                  disabled={!canEdit}  // ADD THIS - Disable if read only
                  style={({ pressed }) => [
                    styles.quantityBtn,
                    {
                      backgroundColor: theme.expense + '20',
                      opacity: (pressed || !canEdit) ? 0.7 : 1,
                    },
                  ]}
                >
                  <Feather name="minus" size={16} color={theme.expense} />
                </Pressable>
                <Text style={[styles.quantityText, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {(item.quantity || 0)}
                </Text>
                <Pressable
                  onPress={() => handleUpdateQuantity(item, 1)}
                  disabled={!canEdit}  // ADD THIS - Disable if read only
                  style={({ pressed }) => [
                    styles.quantityBtn,
                    {
                      backgroundColor: theme.income + '20',
                      opacity: (pressed || !canEdit) ? 0.7 : 1,
                    },
                  ]}
                >
                  <Feather name="plus" size={16} color={theme.income} />
                </Pressable>
              </View>
              <Text
                style={[
                  styles.stockStatus,
                  {
                    color: (item.quantity || 0) > 0 ? theme.income : theme.expense,
                    fontFamily: "Inter_500Medium",
                  },
                ]}
              >
                {(item.quantity || 0) > 0 ? `${t("inStock")} (${item.quantity})` : t("outOfStock")}
              </Text>
            </View>
          </View>
        </Pressable>
      );
    },
    [theme, t, handleLongPress, handleUpdateQuantity, calculateTotalCost, canEdit]
  );

  if (!activeBook) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View
          style={[
            styles.header,
            {
              paddingTop: topPad + 8,
              borderBottomColor: theme.border,
              backgroundColor: theme.background,
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {t("store")}
          </Text>
        </View>
        <View style={styles.emptyContent}>
          <Feather name="book-open" size={44} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {t("selectBookTransactions")}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            marginTop: topPad + 8,
            borderBottomColor: theme.border,
            backgroundColor: theme.background,
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          Inventory
        </Text>
        <View style={styles.headerRight}>
          <Pressable
            onPress={toggleSearchBar}
            style={({ pressed }) => [
              styles.iconBtn,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Feather name="search" size={22} color={showSearchBar ? theme.tint : theme.textSecondary} />
          </Pressable>
          <Pressable
            onPress={openFilterModal}
            style={({ pressed }) => [
              styles.iconBtn,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Feather name="filter" size={22} color={filterStock !== "all" ? theme.tint : theme.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Search Bar */}
      {showSearchBar && (
        <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Feather name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search products..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>
      )}

      {/* Filter Chip */}
      {filterStock !== "all" && (
        <Pressable 
          onPress={() => setFilterStock("all")}
          style={[styles.filterChip, { backgroundColor: theme.tint + '20', borderColor: theme.tint }]}
        >
          <Text style={[styles.filterChipText, { color: theme.tint }]}>
            {filterStock === "inStock" ? "In Stock" : "Out of Stock"}
          </Text>
          <Feather name="x" size={14} color={theme.tint} />
        </Pressable>
      )}

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => `${item.id}-${currencyRefreshKey}`}
        renderItem={renderProduct}
        scrollEnabled={filteredProducts.length > 0}
        contentContainerStyle={[
          styles.list,
          {
            paddingBottom: bottomPad + 100,
          },
          !filteredProducts.length && styles.emptyContainer,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContent}>
            <Feather name="shopping-bag" size={44} color={theme.textSecondary} />
            <Text
              style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}
            >
              {searchQuery || filterStock !== "all" ? "No matching products" : t("noProducts")}
            </Text>
            <Text
              style={[styles.emptySubtext, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}
            >
              {t("addFirstProduct")}
            </Text>
          </View>
        }
      />

      {/* Add Product Button - ONLY show if canEdit */}
      {canEdit && (
        <View style={{ position: "absolute", bottom: bottomPad + 55, left: 20, right: 20 }}>
          <Pressable
            testID="add-product-btn"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/add-product");
            }}
            style={({ pressed }) => ({ 
              opacity: pressed ? 0.85 : 1,
              borderRadius: 12,
              overflow: "hidden",
              backgroundColor: '#3B82F6',
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 14,
              gap: 8,
            })}
          >
            <Feather name="plus" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Product</Text>
          </Pressable>
        </View>
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowFilterModal(false)}>
          <View style={[styles.filterModalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.filterModalTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              Filter by Stock Status
            </Text>
            
            <Pressable
              onPress={() => applyFilter("all")}
              style={[
                styles.filterOption,
                { borderColor: theme.border, backgroundColor: filterStock === "all" ? theme.tint + '20' : 'transparent' }
              ]}
            >
              <Text style={[styles.filterOptionText, { color: filterStock === "all" ? theme.tint : theme.text }]}>
                All Products
              </Text>
              {filterStock === "all" && <Feather name="check" size={18} color={theme.tint} />}
            </Pressable>

            <Pressable
              onPress={() => applyFilter("inStock")}
              style={[
                styles.filterOption,
                { borderColor: theme.border, backgroundColor: filterStock === "inStock" ? theme.tint + '20' : 'transparent' }
              ]}
            >
              <Text style={[styles.filterOptionText, { color: filterStock === "inStock" ? theme.tint : theme.text }]}>
                In Stock Only
              </Text>
              {filterStock === "inStock" && <Feather name="check" size={18} color={theme.tint} />}
            </Pressable>

            <Pressable
              onPress={() => applyFilter("outOfStock")}
              style={[
                styles.filterOption,
                { borderColor: theme.border, backgroundColor: filterStock === "outOfStock" ? theme.tint + '20' : 'transparent' }
              ]}
            >
              <Text style={[styles.filterOptionText, { color: filterStock === "outOfStock" ? theme.tint : theme.text }]}>
                Out of Stock Only
              </Text>
              {filterStock === "outOfStock" && <Feather name="check" size={18} color={theme.tint} />}
            </Pressable>

            <Pressable
              onPress={() => setShowFilterModal(false)}
              style={[styles.filterCloseBtn, { backgroundColor: theme.tint }]}
            >
              <Text style={[styles.filterCloseBtnText, { color: "#FFF" }]}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Delete Modal - ONLY show if canEdit */}
      <Modal
        visible={showDeleteConfirm && canEdit}
        transparent
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              {t("confirmDelete")}
            </Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {t("confirmDeleteMessage")}
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
                testID="confirm-delete-btn"
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  headerRight: {
    flexDirection: "row",
    gap: 16,
  },
  iconBtn: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyContainer: { flex: 1 },
  emptyContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 80,
  },
  emptyText: { fontSize: 15, textAlign: "center" },
  emptySubtext: { fontSize: 13, textAlign: "center" },
  productCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    resizeMode: "cover",
  },
  productImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  productInfo: {
    flex: 1,
    gap: 6,
  },
  productName: {
    fontSize: 15,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  productPrice: {
    fontSize: 16,
  },
  costPrice: {
    fontSize: 12,
  },
  totalCostCard: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  totalCostLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  totalCostValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  stockControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quantityBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    fontSize: 16,
    minWidth: 30,
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
  },
  stockStatus: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
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
  customSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  switchDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  filterModalContent: {
    width: "85%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    gap: 12,
  },
  filterModalTitle: {
    fontSize: 18,
    marginBottom: 8,
    textAlign: "center",
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  filterCloseBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  filterCloseBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});