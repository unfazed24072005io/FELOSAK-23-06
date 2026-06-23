// app/ai-document-chat.tsx - WITH SMOOTH FIXED HEIGHT ANIMATION
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Animated,
  TouchableWithoutFeedback,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { generateDocumentWithAI, AIGeneratedDocument } from "./services/aiService";
import { useApp } from "@/context/AppContext";
import { formatEGP, getCurrencyCode, getCurrencySymbol, subscribeToCurrencyChanges } from "@/utils/format";

const KEYBOARD_OFFSET = 280; // Fixed height to move up when keyboard opens

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  document?: AIGeneratedDocument;
}

export default function AIDocumentChat() {
  const insets = useSafeAreaInsets();
  const { addDocument, activeBook } = useApp();
  const [messages, setMessages] = useState<Message[]>([
    {
  id: "1",
  text: `👋 Hi! I can help you create any business document. Just tell me what you need!\n\nExamples:\n• 'Create an invoice for Ahmed for 5000 ${currencyCode}'\n• 'Generate a quote for 10 laptops at 25000 each'\n• 'Make a purchase order for office supplies'`,
  isUser: false,
  timestamp: new Date(),
}
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
const [currencyRefreshKey, setCurrencyRefreshKey] = useState(0);
const currencyCode = getCurrencyCode();
const currencySymbol = getCurrencySymbol();

useEffect(() => {
  const unsubscribe = subscribeToCurrencyChanges(() => {
    console.log("Currency changed, refreshing AI document chat");
    setCurrencyRefreshKey(prev => prev + 1);
  });
  return unsubscribe;
}, []);
  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Animate when keyboard opens/closes
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        // Smooth animation up
        Animated.timing(slideAnim, {
          toValue: -KEYBOARD_OFFSET,
          duration: 250,
          useNativeDriver: true,
        }).start();
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        // Smooth animation back down
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const typingId = "typing";
    setMessages(prev => [...prev, { id: typingId, text: "...", isUser: false, timestamp: new Date() }]);
    scrollToBottom();
    
    try {
      const generatedDoc = await generateDocumentWithAI(userMessage.text);
      
      setMessages(prev => prev.filter(m => m.id !== typingId));
      
      if (generatedDoc) {
        const aiMessage: Message = {
          id: Date.now().toString(),
          text: `I've created this ${generatedDoc.type} for you. Review and save:`,
          isUser: false,
          timestamp: new Date(),
          document: generatedDoc,
        };
        setMessages(prev => [...prev, aiMessage]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: "Sorry, I couldn't generate that document. Please try again.",
          isUser: false,
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== typingId));
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: "Sorry, something went wrong. Please try again.",
        isUser: false,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const handleSaveDocument = async (document: AIGeneratedDocument) => {
    if (!activeBook) {
      Alert.alert("Error", "No active book selected");
      return;
    }
    
    try {
      const docNumber = `${document.type === "Invoice" ? "INV" : document.type === "Quote" ? "Q" : document.type === "Purchase Order" ? "PO" : document.type === "Credit Note" ? "CN" : document.type === "Delivery Note" ? "DN" : "DOC"}-${Date.now().toString().slice(-6)}`;
      
      const newDocument = {
        number: docNumber,
        type: document.type,
        partyName: document.partyName,
        amount: document.amount,
        date: new Date().toISOString().split("T")[0],
        status: "draft" as const,
        dueDate: document.dueDate,
        notes: document.notes,
        items: document.items,
      };
      
      await addDocument(newDocument);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Success",
        `${document.type} created successfully!`,
        [
          { text: "OK", onPress: () => router.back() },
          { text: "Create Another", style: "cancel" }
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save document");
    }
  };

  const renderDocumentCard = (document: AIGeneratedDocument) => {
const currencyCode = getCurrencyCode();
    const config: Record<string, { color: string; icon: string }> = {
      Invoice: { color: "#3B82F6", icon: "file-text" },
      Quote: { color: "#10B981", icon: "file" },
      "Credit Note": { color: "#8B5CF6", icon: "credit-card" },
      "Purchase Order": { color: "#F59E0B", icon: "shopping-cart" },
      "Delivery Note": { color: "#14B8A6", icon: "truck" },
    };
    
    const docConfig = config[document.type] || config.Invoice;
    
    return (
      <View style={[styles.documentCard, { borderTopColor: docConfig.color }]}>
        <View style={styles.documentHeader}>
          <View style={[styles.documentTypeBadge, { backgroundColor: docConfig.color + "15" }]}>
            <Feather name={docConfig.icon as any} size={14} color={docConfig.color} />
            <Text style={[styles.documentTypeText, { color: docConfig.color }]}>{document.type}</Text>
          </View>
        </View>
        
        <Text style={styles.documentParty}>{document.partyName}</Text>
        
        <View style={styles.documentItems}>
          {document.items.slice(0, 2).map((item, idx) => (
            <Text key={idx} style={styles.documentItemText}>
              • {item.name} x{item.quantity} = {currencyCode} {item.total.toLocaleString('en-EG')}

            </Text>
          ))}
          {document.items.length > 2 && (
            <Text style={styles.documentItemText}>• +{document.items.length - 2} more items</Text>
          )}
        </View>
        
        <View style={styles.documentFooter}>
          <Text style={[styles.documentAmount, { color: docConfig.color }]}>
            {currencyCode} {document.amount.toLocaleString('en-EG')}

          </Text>
          {document.dueDate && (
            <Text style={styles.documentDue}>Due: {document.dueDate}</Text>
          )}
        </View>
        
        <Pressable onPress={() => handleSaveDocument(document)} style={styles.saveDocumentBtn}>
          <LinearGradient
            colors={[docConfig.color, docConfig.color + "CC"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveGradient}
          >
            <Feather name="save" size={16} color="#FFF" />
            <Text style={styles.saveDocumentBtnText}>Save {document.type}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.id === "typing") {
      return (
        <View style={styles.typingContainer}>
          <View style={styles.typingBubble}>
            <ActivityIndicator size="small" color="#8B5CF6" />
            <Text style={styles.typingText}>AI is thinking...</Text>
          </View>
        </View>
      );
    }
    
    return (
      <View style={[styles.messageRow, item.isUser ? styles.userRow : styles.aiRow]}>
        {!item.isUser && (
          <View style={styles.aiAvatar}>
            <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.aiAvatarGradient}>
              <Feather name="cpu" size={16} color="#FFF" />
            </LinearGradient>
          </View>
        )}
        <View style={[styles.messageBubble, item.isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, item.isUser ? styles.userText : styles.aiText]}>
            {item.text}
          </Text>
          {item.document && renderDocumentCard(item.document)}
          <Text style={styles.messageTime}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View key={currencyRefreshKey} style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Feather name="arrow-left" size={24} color="#000" />
          </Pressable>
          <View style={styles.headerCenter}>
            <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.headerIcon}>
              <Feather name="cpu" size={18} color="#FFF" />
            </LinearGradient>
            <Text style={styles.headerTitle}>AI Document Assistant</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onLayout={scrollToBottom}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />

        {/* Animated Input Container */}
        <Animated.View 
          style={[
            styles.inputContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.inputText}
              placeholder="Type your message..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              multiline
              editable={!isLoading}
            />
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            >
              <Feather name="send" size={18} color="#FFF" />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "#000" },
  messagesList: { padding: 16, paddingBottom: 20, flexGrow: 1 },
  messageRow: { flexDirection: "row", marginBottom: 16, alignItems: "flex-end" },
  userRow: { justifyContent: "flex-end" },
  aiRow: { justifyContent: "flex-start" },
  aiAvatar: { marginRight: 8, marginBottom: 4 },
  aiAvatarGradient: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  messageBubble: { maxWidth: "80%", padding: 12, borderRadius: 20 },
  userBubble: { backgroundColor: "#8B5CF6", borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: "#FFFFFF", borderBottomLeftRadius: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  messageText: { fontSize: 15, lineHeight: 20 },
  userText: { color: "#FFFFFF", fontFamily: "Inter_400Regular" },
  aiText: { color: "#000", fontFamily: "Inter_400Regular" },
  messageTime: { fontSize: 10, color: "#9CA3AF", marginTop: 4, alignSelf: "flex-end" },
  typingContainer: { flexDirection: "row", marginBottom: 16, marginLeft: 40 },
  typingBubble: { backgroundColor: "#FFFFFF", padding: 12, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 8 },
  typingText: { fontSize: 14, color: "#8B5CF6", fontFamily: "Inter_400Regular" },
  documentCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderTopWidth: 3,
  },
  documentHeader: { flexDirection: "row", justifyContent: "flex-start", marginBottom: 8 },
  documentTypeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  documentTypeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  documentParty: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#000", marginBottom: 8 },
  documentItems: { marginBottom: 8 },
  documentItemText: { fontSize: 12, color: "#6B7280", fontFamily: "Inter_400Regular", marginBottom: 2 },
  documentFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  documentAmount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  documentDue: { fontSize: 11, color: "#EF4444", fontFamily: "Inter_500Medium" },
  saveDocumentBtn: { borderRadius: 8, overflow: "hidden" },
  saveGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  saveDocumentBtnText: { color: "#FFF", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  inputContainer: {
    backgroundColor: "#F9FAFB",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingVertical: 10,
    paddingBottom: 53,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputText: {
    flex: 1,
    color: "#000",
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#8B5CF6",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
});