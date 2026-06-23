// app/faq.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
  Platform,
  Pressable,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

type FAQItem = {
  question: string;
  answer: string;
};

const FAQ_DATA: FAQItem[] = [
  {
    question: "What is Felosak?",
    answer: "Felosak is an AI-powered finance and bookkeeping app for businesses in the Middle East and North Africa. It combines cash tracking, e-invoicing, VAT automation, and AI insights in Arabic and English. Felosak is a brand of FortyFi FZ LLC.",
  },
  {
    question: "Which countries does Felosak support?",
    answer: "Egypt, UAE, Saudi Arabia, Kuwait, Qatar, Oman, and Bahrain. Each region has its own tax rules, VAT rates, currency, and compliance requirements built in.",
  },
  {
    question: "Is Felosak free?",
    answer: "Yes — the Free plan is free forever with no credit card required. It includes unlimited cash tracking, up to 10-20 customers, and basic invoicing. Paid plans unlock advanced features like e-invoicing, AI insights, and multi-branch support.",
  },
  {
    question: "Does Felosak work offline?",
    answer: "Yes. Felosak is built offline-first. All transactions are stored locally on your device. When internet is available, data syncs automatically to the cloud. You never lose data due to connectivity issues.",
  },
  {
    question: "Is my data safe?",
    answer: "Yes. We use AES-256 encryption, TLS 1.3, bcrypt password hashing, and biometric authentication. Data is stored in AWS Bahrain with SOC 2-level security. See our Privacy Policy for full details.",
  },
  {
    question: "Is Felosak compliant with ETA / FTA / ZATCA?",
    answer: "Yes. Egypt: full ETA e-invoicing with real-time API submission. UAE: FTA tax invoices with Peppol CTC readiness. Saudi: ZATCA FATOORAH Phase 2 with real-time clearance, crypto stamps, and QR codes.",
  },
  {
    question: "Can I use Felosak for multiple businesses?",
    answer: "Yes. Free plan supports 1 business. Starter supports 2. Business supports 5-10 branches. Enterprise supports unlimited businesses and branches.",
  },
  {
    question: "How do I switch my region?",
    answer: "Go to Settings, tap Region, select your new region. Note: switching regions changes VAT rates, tax rules, currency, and compliance features. Your existing data will be preserved but recalculated.",
  },
  {
    question: "Can my accountant access my data?",
    answer: "Yes. Business and Enterprise plans include an Accountant Portal where your accountant can view reports, download data, and help with tax filing — all under your control.",
  },
  {
    question: "How do I contact support?",
    answer: "Email: support@felosak.com. In-app: tap Help and Support, then Contact Us. WhatsApp: available for Starter+ plans. Phone and video: Enterprise only.",
  },
  {
    question: "What languages does Felosak support?",
    answer: "Arabic (Egyptian dialect for Egypt, MSA for Gulf) and English. The AI assistant understands both languages and Egyptian Arabic colloquial.",
  },
  {
    question: "Can I export my data?",
    answer: "Yes. Go to Settings, then Export Data. You can export as CSV, JSON, or PDF. This is available on all plans, including Free. Your data belongs to you.",
  },
  {
    question: "What payment methods are accepted?",
    answer: "Visa/Mastercard (all regions), Fawry (Egypt), Vodafone Cash (Egypt), Apple Pay (UAE/Saudi), mada (Saudi), Tabby BNPL (UAE/Saudi), bank transfer (Enterprise).",
  },
  {
    question: "What is the refund policy?",
    answer: "14-day full refund from initial subscription. Cancel within 14 days for a complete refund, no questions asked. After 14 days, your plan continues until the end of the billing period.",
  },
  {
    question: "How do I delete my account?",
    answer: "Settings, then Delete Account. You'll have 30 days to export your data. After 30 days, all personal data is permanently deleted. Legally required records (invoices) are retained per local law.",
  },
  {
    question: "Does Felosak handle payroll?",
    answer: "Payroll Lite is available on Business and Enterprise plans. It includes basic salary calculations, social insurance deductions (per region), and payment tracking. Full payroll (WPS/GOSI) is on the Enterprise plan.",
  },
  {
    question: "What is the AI assistant?",
    answer: "Felosak AI answers your financial questions in Arabic or English. Ask 'How much did I spend on rent this month?' or 'Who owes me the most?' and get instant answers. Business and Enterprise plans get unlimited AI queries.",
  },
  {
    question: "Can I use Felosak on desktop?",
    answer: "Yes. Felosak is available as a web app at app.felosak.com, plus native iOS and Android apps. All platforms sync automatically.",
  },
  {
    question: "How do I report a bug?",
    answer: "In-app: Help and Support, then Report a Bug. Include a screenshot if possible. Or email support@felosak.com with subject 'Bug Report'. We triage all bugs within 24 hours.",
  },
  {
    question: "Where can I suggest a feature?",
    answer: "In-app: Help and Support, then Feature Request. Or post in our community forum at forum.felosak.com. We review all suggestions quarterly and the most-voted features get prioritized.",
  },
];

function FAQAccordionItem({ item, isDark, theme }: { item: FAQItem; isDark: boolean; theme: typeof Colors.dark }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.faqItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.faqQuestionContainer}>
        <Text style={[styles.faqQuestion, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {item.question}
        </Text>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={20} color={theme.textSecondary} />
      </Pressable>
      {expanded && (
        <Text style={[styles.faqAnswer, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          {item.answer}
        </Text>
      )}
    </View>
  );
}

export default function FAQScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;

  const topPad = insets.top + (Platform.OS === "web" ? 20 : 10);
  const bottomPad = insets.bottom + 20;

  const handleEmailPress = () => {
    Linking.openURL("mailto:support@felosak.com");
  };

  const handleWebsitePress = () => {
    Linking.openURL("https://www.felosak.com");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          FAQ
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Search/Categories Row */}
        <View style={styles.categoriesContainer}>
          <View style={[styles.categoryChip, { backgroundColor: theme.tint }]}>
            <Text style={[styles.categoryChipText, { color: "#FFF" }]}>All Questions</Text>
          </View>
          <Pressable onPress={handleEmailPress} style={[styles.contactChip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Feather name="mail" size={14} color={theme.tint} />
            <Text style={[styles.contactChipText, { color: theme.tint }]}>Contact Support</Text>
          </Pressable>
        </View>

        {/* FAQ List */}
        <View style={styles.faqList}>
          {FAQ_DATA.map((item, index) => (
            <FAQAccordionItem key={index} item={item} isDark={isDark} theme={theme} />
          ))}
        </View>

        {/* Still Have Questions */}
        <View style={[styles.stillHaveQuestions, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Feather name="message-circle" size={28} color={theme.tint} />
          <Text style={[styles.stillTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            Still have questions?
          </Text>
          <Text style={[styles.stillText, { color: theme.textSecondary, textAlign: "center" }]}>
            Can't find the answer you're looking for? Please contact our support team.
          </Text>
          <View style={styles.contactButtons}>
            <Pressable onPress={handleEmailPress} style={[styles.emailBtn, { backgroundColor: theme.tint }]}>
              <Feather name="mail" size={18} color="#FFF" />
              <Text style={[styles.emailBtnText, { color: "#FFF", fontFamily: "Inter_600SemiBold" }]}>
                Email Support
              </Text>
            </Pressable>
            <Pressable onPress={handleWebsitePress} style={[styles.websiteBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Feather name="globe" size={18} color={theme.tint} />
              <Text style={[styles.websiteBtnText, { color: theme.tint, fontFamily: "Inter_600SemiBold" }]}>
                Visit Website
              </Text>
            </Pressable>
          </View>
        </View>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 24, flex: 1, textAlign: "center" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  
  categoriesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryChipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  contactChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  contactChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  
  faqList: { gap: 12, marginBottom: 24 },
  faqItem: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  faqQuestionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  faqQuestion: { fontSize: 15, flex: 1, marginRight: 12 },
  faqAnswer: { fontSize: 13, lineHeight: 20, paddingHorizontal: 16, paddingBottom: 16 },
  
  stillHaveQuestions: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  stillTitle: { fontSize: 18, marginTop: 4 },
  stillText: { fontSize: 13, lineHeight: 20 },
  contactButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  emailBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emailBtnText: { fontSize: 14 },
  websiteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  websiteBtnText: { fontSize: 14 },
});