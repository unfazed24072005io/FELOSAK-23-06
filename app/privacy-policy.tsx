// app/privacy-policy.tsx
import React from "react";
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

export default function PrivacyPolicyScreen() {
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
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          Privacy Policy
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Header Info */}
        <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.infoText, { color: theme.textSecondary, textAlign: "center" }]}>
            Operated by FortyFi FZ LLC
          </Text>
          <Text style={[styles.infoText, { color: theme.textSecondary, textAlign: "center", marginTop: 4 }]}>
            Last Updated: May 2026
          </Text>
        </View>

        {/* Introduction */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            1. Introduction
          </Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            Felosak ("we," "us," "our") is a brand operated by FortyFi FZ LLC, registered in the Dubai Multi Commodities Centre (DMCC) Free Zone, Dubai, United Arab Emirates. This Privacy Policy explains how we collect, use, store, share, and protect your personal data when you use the Felosak platform.
          </Text>
        </View>

        {/* Data Controller */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            2. Data Controller
          </Text>
          <View style={styles.bulletPoint}>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Entity: FortyFi FZ LLC</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Address: DMCC Free Zone, Jumeirah Lakes Towers, Dubai, UAE</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Email: support@felosak.com</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Website: www.felosak.com</Text>
          </View>
        </View>

        {/* Data We Collect */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            3. Data We Collect
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold", marginTop: 12 }]}>
            3.1 Account Information
          </Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            Full name, email address, phone number (with country code), password (bcrypt-hashed), business name and type, tax registration number (TIN/TRN/VAT number), region selection, preferred language.
          </Text>

          <Text style={[styles.subsectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold", marginTop: 12 }]}>
            3.2 Financial Data
          </Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            Cash in/out transaction records, customer and supplier details, invoice data, bank account information (for integration only — we do not store full bank credentials), receipt images, payroll data.
          </Text>

          <Text style={[styles.subsectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold", marginTop: 12 }]}>
            3.3 Usage Data
          </Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            Device information (model, OS version), IP address and approximate geolocation (city-level), app usage patterns, crash reports, API call logs.
          </Text>
        </View>

        {/* How We Use Your Data */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            4. How We Use Your Data
          </Text>
          <View style={styles.bulletPoint}>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• To provide, maintain, and improve the Service</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• To process transactions, generate invoices, and calculate taxes</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• To submit e-invoices to tax authorities (ETA, FTA, ZATCA, OTA, NBR) on your behalf</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• To provide AI-powered financial insights and anomaly detection</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• To communicate with you about your account and service updates</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• To comply with legal and regulatory obligations</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• To detect, prevent, and address fraud and security issues</Text>
          </View>
        </View>

        {/* Data Sharing */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            5. Data Sharing
          </Text>
          <Text style={[styles.cardText, { color: theme.textSecondary, marginBottom: 8 }]}>
            Felosak does NOT sell your personal data. Ever.
          </Text>
          
          <View style={[styles.tableHeader, { backgroundColor: theme.surface }]}>
            <Text style={[styles.tableHeaderText, { color: theme.text, flex: 2 }]}>Recipient</Text>
            <Text style={[styles.tableHeaderText, { color: theme.text, flex: 3 }]}>Purpose</Text>
            <Text style={[styles.tableHeaderText, { color: theme.text, flex: 2 }]}>Safeguards</Text>
          </View>
          <View style={[styles.tableRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>AWS (Bahrain)</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 3 }]}>Data hosting</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>AES-256, TLS 1.3</Text>
          </View>
          <View style={[styles.tableRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>Tax Authorities</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 3 }]}>E-invoice submission</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>Official API</Text>
          </View>
          <View style={[styles.tableRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>Payment Processors</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 3 }]}>Subscription payments</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>PCI DSS Level 1</Text>
          </View>
          <View style={[styles.tableRow]}>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>Analytics (Firebase)</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 3 }]}>Usage analytics</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>Anonymized</Text>
          </View>
        </View>

        {/* Data Storage and Retention */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            6. Data Storage and Retention
          </Text>
          <View style={[styles.tableHeader, { backgroundColor: theme.surface }]}>
            <Text style={[styles.tableHeaderText, { color: theme.text, flex: 2 }]}>Data Category</Text>
            <Text style={[styles.tableHeaderText, { color: theme.text, flex: 2 }]}>Retention Period</Text>
          </View>
          <View style={[styles.tableRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>Financial records</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>7 years</Text>
          </View>
          <View style={[styles.tableRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>Account data</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>Duration + 2 years</Text>
          </View>
          <View style={[styles.tableRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>Usage/analytics data</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>24 months</Text>
          </View>
          <View style={[styles.tableRow]}>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>Deleted account data</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>Purged within 90 days</Text>
          </View>
          <Text style={[styles.cardText, { color: theme.textSecondary, marginTop: 12 }]}>
            Data Residency: Primary data storage in AWS Bahrain (me-south-1).
          </Text>
        </View>

        {/* Data Security */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            7. Data Security
          </Text>
          <View style={styles.bulletPoint}>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• AES-256 encryption for all data at rest</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• TLS 1.3 for all data in transit</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Bcrypt password hashing with salting</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Biometric authentication on mobile</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Role-based access controls (RBAC)</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Regular penetration testing (quarterly)</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• SOC 2 Type II compliance (target: Q4 2026)</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Two-factor authentication (2FA) available</Text>
          </View>
        </View>

        {/* Your Rights */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            8. Your Rights
          </Text>
          <View style={styles.bulletPoint}>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Right of Access</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Right to Rectification</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Right to Erasure</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Right to Data Portability</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Right to Restrict Processing</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Right to Object</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Right to Withdraw Consent</Text>
          </View>
          <Text style={[styles.cardText, { color: theme.textSecondary, marginTop: 8 }]}>
            To exercise any of these rights, contact: support@felosak.com. We will respond within 30 days.
          </Text>
        </View>

        {/* Children's Privacy */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            9. Children's Privacy
          </Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            The Service is intended for individuals aged 18 and older. We do not knowingly collect data from children under 18. If we discover that we have collected data from a child, we will delete it immediately.
          </Text>
        </View>

        {/* Cookies */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            10. Cookies and Tracking
          </Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            Our web application uses essential cookies for functionality (session management, language preference, region setting). Analytics cookies are used only with your explicit consent. We do not use advertising or tracking cookies.
          </Text>
        </View>

        {/* Contact */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            11. Contact Us
          </Text>
          <Pressable onPress={handleEmailPress} style={styles.contactRow}>
            <Feather name="mail" size={18} color={theme.tint} />
            <Text style={[styles.contactText, { color: theme.tint }]}>support@felosak.com</Text>
          </Pressable>
          <Pressable onPress={handleWebsitePress} style={styles.contactRow}>
            <Feather name="globe" size={18} color={theme.tint} />
            <Text style={[styles.contactText, { color: theme.tint }]}>www.felosak.com</Text>
          </Pressable>
          <View style={styles.contactRow}>
            <Feather name="map-pin" size={18} color={theme.textSecondary} />
            <Text style={[styles.contactText, { color: theme.textSecondary }]}>
              DMCC Free Zone, Jumeirah Lakes Towers, Dubai, UAE
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
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
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  
  infoCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  infoText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 12,
  },
  cardTitle: { fontSize: 18, marginBottom: 4 },
  cardText: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },
  subsectionTitle: { fontSize: 14, marginBottom: 4 },
  
  bulletPoint: { gap: 6, marginLeft: 4 },
  bulletText: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },
  
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  tableHeaderText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  tableCell: { fontSize: 11, fontFamily: "Inter_400Regular" },
  
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  contactText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
});