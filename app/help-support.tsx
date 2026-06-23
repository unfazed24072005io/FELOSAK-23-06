// app/help-support.tsx
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
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

type SupportSection = {
  title: string;
  icon: string;
  content: string[];
  subsections?: { title: string; items: string[] }[];
};

const SUPPORT_SECTIONS: SupportSection[] = [
  {
    title: "Getting Started",
    icon: "rocket",
    content: [
      "How to create your Felosak account",
      "Choosing your region (Egypt / UAE / Saudi / Kuwait / Qatar / Oman / Bahrain)",
      "Setting up your first business profile",
      "Adding your first cash in / cash out entry",
      "Understanding the dashboard",
      "Switching between Arabic and English",
      "Enabling offline mode",
      "Importing data from other apps (Wafeq, Zoho, Excel)",
    ],
  },
  {
    title: "Cash In / Cash Out",
    icon: "dollar-sign",
    content: [
      "Recording a cash in transaction",
      "Recording a cash out transaction",
      "Editing or deleting a transaction",
      "Categorizing transactions (sales, rent, salaries, etc.)",
      "Adding a note or receipt photo to a transaction",
      "Viewing transaction history and filters",
      "Understanding the cash balance summary",
      "Using voice entry in Arabic",
    ],
  },
  {
    title: "Customers & Suppliers",
    icon: "users",
    content: [
      "Adding a new customer",
      "Tracking who owes you (receivables)",
      "Tracking what you owe (payables)",
      "Sending payment reminders via WhatsApp",
      "Customer trust scores — how they work",
      "Importing contacts from phone",
    ],
  },
  {
    title: "Invoicing & E-Invoicing",
    icon: "file-text",
    content: [
      "Creating a new invoice",
      "Adding line items, discounts, and taxes",
      "Sending invoices via WhatsApp, email, or SMS",
      "Understanding e-invoicing compliance by region",
      "Egypt: ETA e-invoice setup and digital signature",
      "UAE: FTA tax invoice requirements",
      "Saudi: ZATCA FATOORAH Phase 2 setup",
      "Oman: Fawtara e-invoicing preparation",
      "Duplicate, void, or credit an invoice",
      "Recurring invoices setup",
    ],
    subsections: [
      {
        title: "E-Invoicing by Region",
        items: [
          "Egypt (ETA): Real-time API submission, digital signature required",
          "UAE (FTA): Tax invoices with Peppol CTC readiness",
          "Saudi (ZATCA): FATOORAH Phase 2 with clearance",
          "Oman (OTA): Fawtara preparation for 2026 rollout",
          "Kuwait/Qatar/Bahrain: Following GCC standards",
        ],
      },
    ],
  },
  {
    title: "Tax & Compliance",
    icon: "shield",
    content: [
      "Understanding your region's VAT rate",
      "VAT calculation — how Felosak computes it",
      "Generating a VAT return summary",
      "Corporate tax estimation by region",
      "Egypt: ETA registration and e-invoice submission",
      "UAE: FTA VAT registration and 2026 amendments",
      "Saudi: ZATCA registration and FATOORAH integration",
      "Withholding tax tracking (Egypt, Saudi, Qatar, Oman)",
      "Zakat calculation (Saudi)",
      "Social insurance calculations by region",
    ],
  },
  {
    title: "AI Insights",
    icon: "cpu",
    content: [
      "Asking Felosak AI a question (Arabic or English)",
      "Understanding the Variance AI analysis",
      "Cashflow forecast — how to read it",
      "AI-generated expense alerts",
      "Limitations of AI insights (disclaimer)",
    ],
  },
  {
    title: "Reports & Analytics",
    icon: "bar-chart-2",
    content: [
      "Generating a profit & loss report",
      "Cash flow statement",
      "Customer aging report",
      "Category breakdown analysis",
      "Exporting reports as PDF or Excel",
      "Sharing reports with your accountant",
    ],
  },
  {
    title: "Account & Settings",
    icon: "settings",
    content: [
      "Changing your region",
      "Updating business information",
      "Managing users and permissions",
      "Changing language (Arabic / English)",
      "Subscription management — upgrade, downgrade, cancel",
      "Exporting all your data",
      "Deleting your account",
      "Two-factor authentication (2FA) setup",
    ],
  },
  {
    title: "Billing & Payments",
    icon: "credit-card",
    content: [
      "Understanding your subscription plan",
      "Payment methods by region (cards, Fawry, mobile wallets)",
      "Viewing your billing history",
      "Requesting a refund (14-day policy)",
      "Switching between monthly and annual billing",
      "Applying a promo code or referral credit",
    ],
  },
];

const CHANNELS = [
  {
    name: "Email Support",
    channel: "support@felosak.com",
    icon: "mail",
    availability: "24/7 intake",
    response: "Free: 48hr | Starter: 24hr | Business: 12hr | Enterprise: 4hr",
    action: "email",
  },
  {
    name: "In-App Chat",
    channel: "AI-Powered Chat",
    icon: "message-circle",
    availability: "24/7",
    response: "Instant (AI) | Human: 2-8 hours",
    action: "chat",
  },
  {
    name: "WhatsApp Support",
    channel: "+971 XX XXX XXXX",
    icon: "message-square",
    availability: "Sun-Thu 9AM-6PM GST",
    response: "4-12 hours",
    action: "whatsapp",
  },
  {
    name: "Phone Support",
    channel: "Callback request",
    icon: "phone",
    availability: "Sun-Thu 9AM-6PM GST",
    response: "Immediate (Enterprise only)",
    action: "phone",
  },
  {
    name: "Community Forum",
    channel: "forum.felosak.com",
    icon: "users",
    availability: "24/7 (peer-to-peer)",
    response: "Staff responds within 24h",
    action: "link",
  },
];

const SLAS = [
  { tier: "Free", firstResponse: "48 hrs", resolution: "5 business days", channels: "Email + AI Chat" },
  { tier: "Starter", firstResponse: "24 hrs", resolution: "3 business days", channels: "Email + AI Chat + WhatsApp" },
  { tier: "Business", firstResponse: "12 hrs", resolution: "1 business day", channels: "All channels + Priority Queue" },
  { tier: "Enterprise", firstResponse: "4 hrs", resolution: "4-8 hrs (P1/P2)", channels: "All channels + Dedicated CSM + Phone + Video" },
];

const PRIORITIES = [
  { priority: "P1 — Critical", definition: "Service down. All users affected. Data loss risk.", examples: "App crashes for all users. E-invoice API down. Data breach detected.", sla: "15 min response / 4 hours resolution" },
  { priority: "P2 — High", definition: "Major feature broken. Significant user impact.", examples: "VAT calculation error. Invoice generation fails.", sla: "1 hour response / 8-24 hours resolution" },
  { priority: "P3 — Medium", definition: "Feature partially working. Workaround available.", examples: "Report not exporting. Slow performance.", sla: "4-12 hours response / 2 business days resolution" },
  { priority: "P4 — Low", definition: "Cosmetic issue. Feature request.", examples: "Typo in translation. Color mismatch.", sla: "24 hours response / Next release cycle" },
];

export default function HelpSupportScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { user } = useAuth();
  
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketPriority, setTicketPriority] = useState("P3 — Medium");
  const [submitting, setSubmitting] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const handleChannelPress = (channel: string, action: string, value: string) => {
    Haptics.selectionAsync();
    if (action === "email") {
      Linking.openURL(`mailto:${value}?subject=Felosak Support Request`);
    } else if (action === "whatsapp") {
      Linking.openURL(`https://wa.me/${value.replace(/[^0-9]/g, '')}`);
    } else if (action === "link") {
      Linking.openURL(`https://${value}`);
    } else if (action === "chat") {
      setShowTicketModal(true);
    } else if (action === "phone") {
      Alert.alert("Phone Support", "Enterprise customers can request a callback. Please contact support@felosak.com to schedule.");
    }
  };

  const handleSubmitTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    
    setSubmitting(true);
    try {
      // Here you would send to your backend/support system
      // For now, we'll just email
      const emailBody = `Priority: ${ticketPriority}\nUser: ${user?.email || 'Guest'}\n\nMessage: ${ticketMessage}`;
      await Linking.openURL(`mailto:support@felosak.com?subject=${encodeURIComponent(ticketSubject)}&body=${encodeURIComponent(emailBody)}`);
      Alert.alert("Success", "Your support request has been submitted. We'll respond within the SLA timeframe.");
      setShowTicketModal(false);
      setTicketSubject("");
      setTicketMessage("");
      setTicketPriority("P3 — Medium");
    } catch (error) {
      Alert.alert("Error", "Failed to submit ticket. Please email support@felosak.com directly.");
    } finally {
      setSubmitting(false);
    }
  };

  const SectionCard = ({ section }: { section: SupportSection }) => {
    const isExpanded = expandedSection === section.title;
    
    return (
      <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Pressable
          onPress={() => setExpandedSection(isExpanded ? null : section.title)}
          style={styles.sectionHeader}
        >
          <View style={styles.sectionHeaderLeft}>
            <Feather name={section.icon as any} size={22} color={theme.tint} />
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {section.title}
            </Text>
          </View>
          <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.textSecondary} />
        </Pressable>
        
        {isExpanded && (
          <View style={styles.sectionContent}>
            {section.content.map((item, idx) => (
              <View key={idx} style={styles.bulletItem}>
                <Feather name="check" size={14} color={theme.tint} />
                <Text style={[styles.bulletText, { color: theme.textSecondary }]}>{item}</Text>
              </View>
            ))}
            {section.subsections?.map((sub, idx) => (
              <View key={idx} style={styles.subsection}>
                <Text style={[styles.subsectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold", marginTop: 12, marginBottom: 8 }]}>
                  {sub.title}
                </Text>
                {sub.items.map((item, itemIdx) => (
                  <View key={itemIdx} style={[styles.bulletItem, { marginLeft: 8 }]}>
                    <Feather name="chevron-right" size={12} color={theme.tint} />
                    <Text style={[styles.bulletText, { color: theme.textSecondary }]}>{item}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          Help & Support
        </Text>
        <Pressable onPress={() => setShowTicketModal(true)} style={styles.ticketBtn}>
          <Feather name="file-text" size={22} color={theme.tint} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Support Channels Banner */}
        <View style={[styles.channelsBanner, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.bannerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            📞 How can we help?
          </Text>
          <Text style={[styles.bannerSubtitle, { color: theme.textSecondary }]}>
            Choose your preferred channel
          </Text>
          
          <View style={styles.channelsGrid}>
            {CHANNELS.map((channel, idx) => (
              <Pressable
                key={idx}
                onPress={() => handleChannelPress(channel.name, channel.action, channel.channel)}
                style={[styles.channelCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Feather name={channel.icon as any} size={24} color={theme.tint} />
                <Text style={[styles.channelName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {channel.name}
                </Text>
                <Text style={[styles.channelAvailability, { color: theme.textSecondary }]}>
                  {channel.availability}
                </Text>
                <View style={[styles.responseBadge, { backgroundColor: theme.tint + "20" }]}>
                  <Text style={[styles.responseText, { color: theme.tint, fontSize: 10 }]}>
                    {channel.response}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* SLA Matrix */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitleLarge, { color: theme.text, fontFamily: "Inter_700Bold", marginBottom: 12 }]}>
            📊 Service Level Agreements (SLA)
          </Text>
          
          <View style={styles.slaHeader}>
            <Text style={[styles.slaCell, { color: theme.text, fontFamily: "Inter_600SemiBold", flex: 1.2 }]}>Plan</Text>
            <Text style={[styles.slaCell, { color: theme.text, fontFamily: "Inter_600SemiBold", flex: 1.5 }]}>First Response</Text>
            <Text style={[styles.slaCell, { color: theme.text, fontFamily: "Inter_600SemiBold", flex: 1.5 }]}>Resolution</Text>
            <Text style={[styles.slaCell, { color: theme.text, fontFamily: "Inter_600SemiBold", flex: 2 }]}>Channels</Text>
          </View>
          
          {SLAS.map((sla, idx) => (
            <View key={idx} style={[styles.slaRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.slaCell, { color: sla.tier === "Enterprise" ? theme.tint : theme.text, flex: 1.2, fontFamily: "Inter_600SemiBold" }]}>
                {sla.tier}
              </Text>
              <Text style={[styles.slaCell, { color: theme.textSecondary, flex: 1.5 }]}>{sla.firstResponse}</Text>
              <Text style={[styles.slaCell, { color: theme.textSecondary, flex: 1.5 }]}>{sla.resolution}</Text>
              <Text style={[styles.slaCell, { color: theme.textSecondary, flex: 2, fontSize: 11 }]}>{sla.channels}</Text>
            </View>
          ))}
        </View>

        {/* Priority System */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitleLarge, { color: theme.text, fontFamily: "Inter_700Bold", marginBottom: 12 }]}>
            🚨 Ticket Priority System
          </Text>
          
          {PRIORITIES.map((priority, idx) => (
            <View key={idx} style={[styles.priorityCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.priorityTitle, { color: priority.priority.includes("Critical") ? theme.expense : theme.tint, fontFamily: "Inter_700Bold" }]}>
                {priority.priority}
              </Text>
              <Text style={[styles.priorityText, { color: theme.textSecondary, marginTop: 4 }]}>
                {priority.definition}
              </Text>
              <Text style={[styles.priorityText, { color: theme.textSecondary, marginTop: 4 }]}>
                <Text style={{ fontFamily: "Inter_600SemiBold" }}>Examples:</Text> {priority.examples}
              </Text>
              <View style={[styles.slaBadge, { backgroundColor: theme.tint + "20", marginTop: 8, alignSelf: "flex-start" }]}>
                <Text style={[styles.slaBadgeText, { color: theme.tint }]}>SLA: {priority.sla}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Escalation Procedures */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitleLarge, { color: theme.text, fontFamily: "Inter_700Bold", marginBottom: 12 }]}>
            📈 Escalation Procedures
          </Text>
          
          {[
            { level: "L1 — AI Bot", handler: "Felosak AI", trigger: "All initial contacts", action: "Auto-answer from KB. Resolve or escalate." },
            { level: "L2 — Support Agent", handler: "Support Team", trigger: "AI cannot resolve or user requests human", action: "Human agent via email/chat. Read-only access." },
            { level: "L3 — Senior Support", handler: "Team Lead", trigger: "P1/P2 tickets or 2+ failed L2 attempts", action: "Senior agent with write access. Can issue credits/refunds." },
            { level: "L4 — Engineering", handler: "Dev Team", trigger: "Bug confirmed or system issue", action: "Engineering triage. Hotfix for P1 within 4 hours." },
            { level: "L5 — Management", handler: "Head of Support / VP Product", trigger: "Unresolved after 48 hours or customer churn risk", action: "Executive intervention. Personal outreach." },
          ].map((esc, idx) => (
            <View key={idx} style={[styles.escalationItem, { borderBottomColor: theme.border }]}>
              <Text style={[styles.escalationLevel, { color: theme.tint, fontFamily: "Inter_700Bold" }]}>{esc.level}</Text>
              <Text style={[styles.escalationHandler, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{esc.handler}</Text>
              <Text style={[styles.escalationTrigger, { color: theme.textSecondary }]}>Trigger: {esc.trigger}</Text>
              <Text style={[styles.escalationAction, { color: theme.textSecondary }]}>Action: {esc.action}</Text>
            </View>
          ))}
        </View>

        {/* Knowledge Base Sections */}
        <Text style={[styles.kbTitle, { color: theme.text, fontFamily: "Inter_700Bold", marginTop: 16, marginBottom: 12 }]}>
          📚 Knowledge Base
        </Text>
        <Text style={[styles.kbSubtitle, { color: theme.textSecondary, marginBottom: 16 }]}>
          help.felosak.com — Bilingual (Arabic + English)
        </Text>
        
        {SUPPORT_SECTIONS.map((section, idx) => (
          <SectionCard key={idx} section={section} />
        ))}
      </ScrollView>

      {/* Submit Ticket Modal */}
      <Modal visible={showTicketModal} transparent animationType="slide" onRequestClose={() => setShowTicketModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                Submit Support Ticket
              </Text>
              <Pressable onPress={() => setShowTicketModal(false)} hitSlop={8}>
                <Feather name="x" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              placeholder="Subject"
              placeholderTextColor={theme.textSecondary}
              value={ticketSubject}
              onChangeText={setTicketSubject}
            />
            
            <View style={styles.prioritySelector}>
              <Text style={[styles.priorityLabel, { color: theme.textSecondary }]}>Priority:</Text>
              {["P3 — Medium", "P2 — High", "P4 — Low"].map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setTicketPriority(p)}
                  style={[styles.priorityOption, ticketPriority === p && styles.priorityOptionSelected, { borderColor: theme.border }]}
                >
                  <Text style={[styles.priorityOptionText, { color: ticketPriority === p ? theme.tint : theme.textSecondary }]}>
                    {p}
                  </Text>
                </Pressable>
              ))}
            </View>
            
            <TextInput
              style={[styles.textArea, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              placeholder="Describe your issue in detail..."
              placeholderTextColor={theme.textSecondary}
              value={ticketMessage}
              onChangeText={setTicketMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            
            <Pressable
              onPress={handleSubmitTicket}
              disabled={submitting}
              style={[styles.submitBtn, { backgroundColor: theme.tint, opacity: submitting ? 0.7 : 1 }]}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={[styles.submitBtnText, { color: "#FFF", fontFamily: "Inter_600SemiBold" }]}>Submit Ticket</Text>
              )}
            </Pressable>
            
            <Text style={[styles.noteText, { color: theme.textSecondary, textAlign: "center", marginTop: 12 }]}>
              Response within SLA timeframe based on your plan
            </Text>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 24, flex: 1, textAlign: "center" },
  ticketBtn: { padding: 4 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, gap: 20 },
  
  channelsBanner: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  bannerTitle: { fontSize: 18, textAlign: "center" },
  bannerSubtitle: { fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: 16 },
  channelsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" },
  channelCard: {
    width: "48%",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  channelName: { fontSize: 14, marginTop: 4 },
  channelAvailability: { fontSize: 10, textAlign: "center" },
  responseBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 6 },
  responseText: { fontSize: 9 },
  
  sectionCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  sectionTitle: { fontSize: 16 },
  sectionTitleLarge: { fontSize: 18 },
  sectionContent: { marginTop: 12, gap: 8 },
  bulletItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  bulletText: { fontSize: 13, flex: 1, lineHeight: 20 },
  subsection: { marginTop: 4 },
  subsectionTitle: { fontSize: 14 },
  
  slaHeader: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1 },
  slaRow: { flexDirection: "row", paddingVertical: 12, borderBottomWidth: 1 },
  slaCell: { fontSize: 12, flexWrap: "wrap" },
  
  priorityCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  priorityTitle: { fontSize: 14 },
  priorityText: { fontSize: 12, lineHeight: 18 },
  slaBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  slaBadgeText: { fontSize: 10 },
  
  escalationItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 4,
  },
  escalationLevel: { fontSize: 12 },
  escalationHandler: { fontSize: 13 },
  escalationTrigger: { fontSize: 11 },
  escalationAction: { fontSize: 11 },
  
  kbTitle: { fontSize: 20 },
  kbSubtitle: { fontSize: 13 },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { width: "100%", maxWidth: 400, borderRadius: 24, padding: 20, gap: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 20 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  textArea: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, minHeight: 120 },
  prioritySelector: { flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" },
  priorityLabel: { fontSize: 14, marginRight: 8 },
  priorityOption: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  priorityOptionSelected: { borderColor: "#3B82F6", backgroundColor: "#3B82F620" },
  priorityOptionText: { fontSize: 12 },
  submitBtn: { paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  submitBtnText: { fontSize: 16 },
  noteText: { fontSize: 11 },
});