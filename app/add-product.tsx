import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
  Alert,
  Image,
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
import * as ImagePicker from "expo-image-picker";
import { useApp, Product } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";
import { parseAmount, getCurrencyCode, getCurrencySymbol, subscribeToCurrencyChanges } from "@/utils/format";

export default function AddProductScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { products, addProduct, updateProduct, deleteProduct } = useApp();
  const { t } = useLanguage();
  const { editId } = useLocalSearchParams<{ editId?: string }>();

  const editProduct = useMemo(
    () => (editId ? products.find((p) => p.id === editId) : null),
    [editId, products]
  );

  const [name, setName] = useState(editProduct?.name ?? "");
  const [description, setDescription] = useState(editProduct?.description ?? "");
  const [price, setPrice] = useState(editProduct ? String(editProduct.price) : "");
  const [costPrice, setCostPrice] = useState(editProduct?.costPrice ? String(editProduct.costPrice) : "");
  const [quantity, setQuantity] = useState(editProduct?.quantity ? String(editProduct.quantity) : "0");
  const [category, setCategory] = useState(editProduct?.category ?? "");
  const [image, setImage] = useState(editProduct?.image ?? "");
  const [inStock, setInStock] = useState(editProduct?.inStock ?? true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
const [currencyRefreshKey, setCurrencyRefreshKey] = useState(0);
const currencyCode = getCurrencyCode();
const currencySymbol = getCurrencySymbol();

useEffect(() => {
  const unsubscribe = subscribeToCurrencyChanges(() => {
    console.log("Currency changed, refreshing add-product screen");
    setCurrencyRefreshKey(prev => prev + 1);
  });
  return unsubscribe;
}, []);
  const parsedPrice = useMemo(() => parseAmount(price), [price]);
  const parsedCostPrice = useMemo(() => parseAmount(costPrice), [costPrice]);
  const parsedQuantity = useMemo(() => parseInt(quantity) || 0, [quantity]);
  
  const totalStockValue = useMemo(() => {
    return (parsedQuantity || 0) * (parsedCostPrice || parsedPrice || 0);
  }, [parsedQuantity, parsedCostPrice, parsedPrice]);

  const isValid = useMemo(
  () => name.trim().length > 0 && parsedCostPrice !== null && parsedCostPrice > 0,
  [name, parsedCostPrice]
);

  const handleSave = useCallback(() => {
  if (!isValid || parsedCostPrice === null) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  const data = {
    name: name.trim(),
    description: description.trim(),
    price: parsedCostPrice, // Use costPrice as price
    costPrice: parsedCostPrice,
    quantity: parsedQuantity,
    category: category.trim(),
    image,
    inStock: parsedQuantity > 0 || inStock,
  };
  if (editProduct) {
    updateProduct(editProduct.id, data);
  } else {
    addProduct(data);
  }
  router.back();
}, [isValid, parsedCostPrice, parsedQuantity, name, description, category, image, inStock, editProduct, addProduct, updateProduct]);

  const handleConfirmDelete = useCallback(() => {
    if (!editProduct) return;
    deleteProduct(editProduct.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowDeleteConfirm(false);
    router.back();
  }, [editProduct, deleteProduct]);

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
        setImage(`data:image/jpeg;base64,${asset.base64}`);
      } else {
        setImage(asset.uri);
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
        setImage(`data:image/jpeg;base64,${asset.base64}`);
      } else {
        setImage(asset.uri);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  const removeImage = useCallback(() => {
    setImage("");
    Haptics.selectionAsync();
  }, []);

  const updateQuantity = (change: number) => {
    const newQuantity = Math.max(0, parsedQuantity + change);
    setQuantity(String(newQuantity));
    if (newQuantity === 0) {
      setInStock(false);
    } else {
      setInStock(true);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View key={currencyRefreshKey} style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Back" accessibilityRole="button">
          <Feather name="arrow-left" size={22} color={theme.textSecondary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {editProduct ? t("editProduct") : t("addProduct")}
        </Text>
        <View style={styles.headerRight}>
          {editProduct && (
            <Pressable
              onPress={() => setShowDeleteConfirm(true)}
              accessibilityLabel="Delete product"
              accessibilityRole="button"
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Feather name="trash-2" size={20} color={theme.expense} />
            </Pressable>
          )}
          {!editProduct && <View style={{ width: 20 }} />}
        </View>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 100 }]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {t("productName")} *
          </Text>
          <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Feather name="package" size={16} color={theme.textSecondary} />
            <TextInput
              style={[styles.inputText, { color: theme.text, fontFamily: "Inter_400Regular" }]}
              value={name}
              onChangeText={setName}
              placeholder="Enter product name"
              placeholderTextColor={theme.textSecondary + "88"}
              returnKeyType="next"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Description (optional)
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
              value={description}
              onChangeText={setDescription}
              placeholder="Add a description..."
              placeholderTextColor={theme.textSecondary + "88"}
              multiline
            />
          </View>
        </View>

        
        <View style={styles.section}>
  <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
    Cost Price (per unit) - Optional ({currencyCode})
  </Text>
  <View style={[styles.amountRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <Text style={[styles.egpSymbol, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
      {currencySymbol}
    </Text>
    <TextInput
      style={[styles.amountInput, { color: theme.text, fontFamily: "Inter_700Bold" }]}
      value={costPrice}
      onChangeText={setCostPrice}
      placeholder="0.00"
      placeholderTextColor={theme.textSecondary + "88"}
      keyboardType="decimal-pad"
      returnKeyType="done"
    />
  </View>
</View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Quantity
          </Text>
          <View style={[styles.quantityContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Pressable
              onPress={() => updateQuantity(-1)}
              style={({ pressed }) => [
                styles.quantityButton,
                { backgroundColor: theme.expense + '20', opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <Feather name="minus" size={20} color={theme.expense} />
            </Pressable>
            <TextInput
              style={[styles.quantityInput, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
              value={quantity}
              onChangeText={(text) => {
                const num = parseInt(text) || 0;
                setQuantity(String(Math.max(0, num)));
                if (num === 0) {
                  setInStock(false);
                } else {
                  setInStock(true);
                }
              }}
              keyboardType="number-pad"
              textAlign="center"
            />
            <Pressable
              onPress={() => updateQuantity(1)}
              style={({ pressed }) => [
                styles.quantityButton,
                { backgroundColor: theme.income + '20', opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <Feather name="plus" size={20} color={theme.income} />
            </Pressable>
          </View>
        </View>

        {parsedQuantity > 0 && (parsedCostPrice || parsedPrice) && (
  <View key={`total-${currencyRefreshKey}`} style={[styles.totalCostCard, { backgroundColor: theme.surface }]}>
    <Text style={[styles.totalCostLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
      Total Stock Value:
    </Text>
    <Text style={[styles.totalCostValue, { color: theme.tint, fontFamily: "Inter_700Bold" }]}>
      {currencyCode} {totalStockValue.toLocaleString()}
    </Text>
  </View>
)}

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Category (optional)
          </Text>
          <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Feather name="tag" size={16} color={theme.textSecondary} />
            <TextInput
              style={[styles.inputText, { color: theme.text, fontFamily: "Inter_400Regular" }]}
              value={category}
              onChangeText={setCategory}
              placeholder="e.g. Electronics, Food, Clothing"
              placeholderTextColor={theme.textSecondary + "88"}
              returnKeyType="done"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            Image (optional)
          </Text>
          {image ? (
            <View style={[styles.attachmentPreview, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Pressable onPress={() => setShowImagePreview(true)} style={styles.attachmentThumb}>
                <Image source={{ uri: image }} style={styles.thumbImage} resizeMode="cover" />
              </Pressable>
              <View style={styles.attachmentInfo}>
                <Feather name="image" size={14} color={theme.tint} />
                <Text style={[styles.attachmentText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  Image attached
                </Text>
              </View>
              <Pressable onPress={removeImage} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
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
              >
                <Feather name="image" size={20} color={theme.tint} />
                <Text style={[styles.attachBtnText, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {t("gallery")}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            {t("inStock")}
          </Text>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setInStock((prev) => !prev);
            }}
            style={[styles.toggleRow, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={styles.toggleInfo}>
              <Feather name="check-circle" size={18} color={inStock ? theme.income : theme.textSecondary} />
              <Text style={[styles.toggleLabel, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                {inStock ? t("inStock") : t("outOfStock")}
              </Text>
            </View>
            <View
              style={[
                styles.switchTrack,
                { backgroundColor: inStock ? theme.income + "44" : theme.border },
              ]}
            >
              <View
                style={[
                  styles.switchThumb,
                  {
                    backgroundColor: inStock ? theme.income : theme.textSecondary,
                    transform: [{ translateX: inStock ? 20 : 0 }],
                  },
                ]}
              />
            </View>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>

      <View style={[styles.bottomBar, { paddingBottom: bottomPad + 16, backgroundColor: theme.background }]}>
        <Pressable
          testID="save-product-btn"
          onPress={handleSave}
          disabled={!isValid}
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: isValid ? "#C9A84C" : "#C9A84C44",
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Feather name="check" size={20} color="#FFF" />
          <Text style={[styles.saveButtonText, { fontFamily: "Inter_600SemiBold" }]}>
            {editProduct ? t("update") : t("save")}
          </Text>
        </Pressable>
      </View>

      {showDeleteConfirm && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowDeleteConfirm(false)}>
            <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                Delete Product
              </Text>
              <Text style={[styles.modalMsg, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                Delete "{editProduct?.name}"? This cannot be undone.
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
                  testID="confirm-delete-product-btn"
                >
                  <Text style={[styles.modalDeleteTxt, { fontFamily: "Inter_600SemiBold" }]}>{t("delete")}</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>
      )}

      {showImagePreview && image ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowImagePreview(false)}>
          <Pressable style={styles.imagePreviewOverlay} onPress={() => setShowImagePreview(false)}>
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: image }} style={styles.fullImage} resizeMode="contain" />
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
  scroll: { paddingHorizontal: 20, gap: 20, paddingTop: 8 },
  section: { gap: 10 },
  label: { fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 10,
    height: 52,
  },
  inputText: { flex: 1, fontSize: 15, paddingVertical: 8 },
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
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityInput: {
    flex: 1,
    fontSize: 20,
    paddingVertical: 8,
    fontFamily: "Inter_600SemiBold",
  },
  totalCostCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  totalCostLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  totalCostValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  attachmentPreview: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    gap: 12,
  },
  attachmentThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: "hidden",
  },
  thumbImage: { width: "100%", height: "100%" },
  attachmentInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  attachmentText: { fontSize: 14 },
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
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  attachBtnText: { fontSize: 14 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleLabel: { fontSize: 15 },
  switchTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 4,
    justifyContent: "center",
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "transparent",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  saveButtonText: { color: "#FFF", fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 12,
  },
  modalTitle: { fontSize: 18, textAlign: "center" },
  modalMsg: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  modalCancelTxt: { fontSize: 15 },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  modalDeleteTxt: { color: "#FFF", fontSize: 15 },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreviewContainer: {
    width: "90%",
    height: "70%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: { width: "100%", height: "100%" },
  closePreviewBtn: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});