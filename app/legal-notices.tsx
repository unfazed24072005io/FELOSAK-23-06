// app/legal-notices.tsx
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

export default function LegalNoticesScreen() {
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

  const handleAuthorityLink = (url: string) => {
    Linking.openURL(url);
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
          Legal Notices
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Master Disclaimer */}
        <View style={[styles.warningCard, { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" }]}>
          <Feather name="alert-triangle" size={24} color="#D97706" />
          <Text style={[styles.warningTitle, { color: "#92400E", fontFamily: "Inter_700Bold" }]}>
            IMPORTANT NOTICE — PLEASE READ CAREFULLY
          </Text>
          <Text style={[styles.warningText, { color: "#92400E" }]}>
            Felosak is a technology service provider — NOT a tax authority, licensed tax advisor, certified accountant, legal advisor, or government entity.
          </Text>
        </View>

        {/* Service Provider Status */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            1. Master Disclaimer — Service Provider Status
          </Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            Felosak (operated by FortyFi FZ LLC, registered in the DMCC Free Zone, Dubai, United Arab Emirates) is a technology service provider that offers financial record-keeping, invoicing, and business intelligence software tools.
          </Text>
          
          <Text style={[styles.subsectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold", marginTop: 12 }]}>
            Felosak is NOT:
          </Text>
          <View style={styles.bulletPoint}>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• A tax authority, government agency, or regulatory body</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• A licensed tax advisor, CPA, CA, or registered tax agent</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• A certified auditor or audit firm</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• A licensed financial advisor or investment advisor</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• A legal advisor, solicitor, barrister, or law firm</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• An authorized representative of any government tax authority</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• An insurance provider, guarantor, or indemnifier</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• A banking institution or licensed financial institution</Text>
          </View>
          
          <Text style={[styles.cardText, { color: theme.textSecondary, marginTop: 12 }]}>
            Felosak provides software tools that assist users in organizing their financial data. All tax calculations, compliance features, VAT computations, corporate tax estimations, e-invoicing integrations, and regulatory compliance tools provided by Felosak are for informational and convenience purposes only and do not constitute tax advice, legal advice, financial advice, or any form of professional advisory service.
          </Text>
        </View>

        {/* Tax Calculation Disclaimer */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            2. Tax Calculation Disclaimer
          </Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            While Felosak makes commercially reasonable efforts to ensure the accuracy of its tax calculation engines, no guarantee of accuracy, completeness, or fitness for any particular purpose is made or implied.
          </Text>
          
          <View style={styles.bulletPoint}>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• VAT calculations are approximate estimates based on entered data</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Corporate tax, Zakat, and withholding tax calculations are estimates only</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• E-invoicing features are technology integration tools only</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Tax return summaries are organizational aids only</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• AI-generated insights do not constitute financial advice</Text>
          </View>
          
          <Text style={[styles.cardText, { color: theme.textSecondary, marginTop: 12 }]}>
            The User is solely responsible for reviewing, verifying, and submitting all tax returns to the relevant authorities.
          </Text>
        </View>

        {/* Government Authority Notices */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            3. Region-Specific Government Authority Notices
          </Text>
          <Text style={[styles.cardText, { color: theme.textSecondary, marginBottom: 12 }]}>
            For all official tax information, contact the relevant government authority directly:
          </Text>
          
          <View style={[styles.tableHeader, { backgroundColor: theme.surface }]}>
            <Text style={[styles.tableHeaderText, { color: theme.text, flex: 1.5 }]}>Region</Text>
            <Text style={[styles.tableHeaderText, { color: theme.text, flex: 2 }]}>Authority</Text>
            <Text style={[styles.tableHeaderText, { color: theme.text, flex: 2 }]}>Website</Text>
          </View>
          
          <Pressable onPress={() => handleAuthorityLink("https://www.eta.gov.eg")} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 1.5 }]}>Egypt</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>ETA</Text>
            <Text style={[styles.tableCell, { color: theme.tint, flex: 2 }]}>eta.gov.eg</Text>
          </Pressable>
          
          <Pressable onPress={() => handleAuthorityLink("https://www.tax.gov.ae")} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 1.5 }]}>UAE</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>FTA</Text>
            <Text style={[styles.tableCell, { color: theme.tint, flex: 2 }]}>tax.gov.ae</Text>
          </Pressable>
          
          <Pressable onPress={() => handleAuthorityLink("https://zatca.gov.sa")} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 1.5 }]}>Saudi Arabia</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>ZATCA</Text>
            <Text style={[styles.tableCell, { color: theme.tint, flex: 2 }]}>zatca.gov.sa</Text>
          </Pressable>
          
          <Pressable onPress={() => handleAuthorityLink("https://www.mof.gov.kw")} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 1.5 }]}>Kuwait</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>KTA/MoF</Text>
            <Text style={[styles.tableCell, { color: theme.tint, flex: 2 }]}>mof.gov.kw</Text>
          </Pressable>
          
          <Pressable onPress={() => handleAuthorityLink("https://www.gta.gov.qa")} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 1.5 }]}>Qatar</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>GTA</Text>
            <Text style={[styles.tableCell, { color: theme.tint, flex: 2 }]}>gta.gov.qa</Text>
          </Pressable>
          
          <Pressable onPress={() => handleAuthorityLink("https://taxoman.gov.om")} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 1.5 }]}>Oman</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>OTA</Text>
            <Text style={[styles.tableCell, { color: theme.tint, flex: 2 }]}>taxoman.gov.om</Text>
          </Pressable>
          
          <Pressable onPress={() => handleAuthorityLink("https://www.nbr.gov.bh")} style={[styles.tableRow]}>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 1.5 }]}>Bahrain</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>NBR</Text>
            <Text style={[styles.tableCell, { color: theme.tint, flex: 2 }]}>nbr.gov.bh</Text>
          </Pressable>
        </View>

        {/* Limitation of Liability */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            4. Limitation of Liability
          </Text>
          <Text style={[styles.cardText, { color: theme.textSecondary, marginBottom: 8 }]}>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, FORTYFI FZ LLC SHALL NOT BE LIABLE FOR:
          </Text>
          <View style={styles.bulletPoint}>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Any errors in tax calculations or VAT computations</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Any penalties, fines, or sanctions imposed by tax authorities</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Any rejection or non-acceptance of e-invoices</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Any loss of revenue, profit, or business opportunity</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Any interruption or failure of e-invoicing connectivity</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Any decisions made based on AI-generated insights</Text>
          </View>
          
          <View style={[styles.liabilityBox, { backgroundColor: theme.surface, borderColor: theme.expense }]}>
            <Text style={[styles.liabilityText, { color: theme.expense, fontFamily: "Inter_600SemiBold" }]}>
              Aggregate Liability Cap: Total amount paid in 12 months preceding the claim.
            </Text>
            <Text style={[styles.liabilityText, { color: theme.expense, fontFamily: "Inter_600SemiBold", marginTop: 8 }]}>
              Free Tier Users: ZERO monetary liability.
            </Text>
          </View>
        </View>

        {/* E-Invoicing Specific Disclaimers */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            5. E-Invoicing Specific Disclaimers
          </Text>
          
          <View style={[styles.tableHeader, { backgroundColor: theme.surface }]}>
            <Text style={[styles.tableHeaderText, { color: theme.text, flex: 1 }]}>Region</Text>
            <Text style={[styles.tableHeaderText, { color: theme.text, flex: 2 }]}>System</Text>
            <Text style={[styles.tableHeaderText, { color: theme.text, flex: 2 }]}>Felosak is NOT</Text>
          </View>
          
          <View style={[styles.tableRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 1 }]}>Egypt</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>ETA e-invoicing</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>ETA itself</Text>
          </View>
          
          <View style={[styles.tableRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 1 }]}>UAE</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>FTA Peppol CTC</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>FTA or ASP</Text>
          </View>
          
          <View style={[styles.tableRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 1 }]}>Saudi Arabia</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>ZATCA FATOORAH</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>ZATCA itself</Text>
          </View>
          
          <View style={[styles.tableRow]}>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 1 }]}>Oman</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>OTA Fawtara</Text>
            <Text style={[styles.tableCell, { color: theme.textSecondary, flex: 2 }]}>OTA or ASP</Text>
          </View>
        </View>

        {/* AI Disclaimer */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            6. AI and Automated Features Disclaimer
          </Text>
          <View style={styles.bulletPoint}>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• AI-generated outputs may contain errors or inaccuracies</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Cashflow forecasts are statistical projections, not guarantees</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Automated categorization may be incorrect</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• AI insights do not constitute financial advice</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• User is solely responsible for all business decisions</Text>
          </View>
        </View>

        {/* Professional Advice Notice */}
        <View style={[styles.infoCard, { backgroundColor: "#EFF6FF", borderColor: "#3B82F6" }]}>
          <Feather name="briefcase" size={20} color="#2563EB" />
          <Text style={[styles.infoTitle, { color: "#1E40AF", fontFamily: "Inter_700Bold" }]}>
            Recommendation to Seek Professional Advice
          </Text>
          <Text style={[styles.infoText, { color: "#1E3A8A" }]}>
            Felosak strongly recommends that all Users engage a licensed and qualified tax advisor, certified public accountant (CPA), or chartered accountant (CA) in their jurisdiction for all tax planning, compliance, and filing matters.
          </Text>
        </View>

        {/* Data Accuracy */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            7. Data Accuracy and User Responsibility
          </Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            Garbage in, garbage out. FortyFi FZ LLC is not responsible for inaccurate, incomplete, or misleading financial data entered by the User.
          </Text>
          <View style={styles.bulletPoint}>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• The User is solely responsible for all data entered</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Verify tax identification numbers (TIN/TRN/VAT)</Text>
            <Text style={[styles.bulletText, { color: theme.textSecondary }]}>• Maintain independent records as backup</Text>
          </View>
        </View>

        {/* Governing Law */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            8. Governing Law and Dispute Resolution
          </Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            This Disclaimer is governed by the laws of the DMCC Free Zone and the United Arab Emirates. Any dispute shall be submitted to binding arbitration under the rules of the Dubai International Arbitration Centre (DIAC).
          </Text>
        </View>

        {/* Contact */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            9. Contact Us
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

        {/* Acceptance Footer */}
        <View style={[styles.acceptCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.acceptText, { color: theme.textSecondary, textAlign: "center" }]}>
            By creating an account or using any feature of the Felosak platform, you acknowledge that you have read, understood, and agree to be bound by this Disclaimer.
          </Text>
          <Text style={[styles.versionText, { color: theme.textSecondary, textAlign: "center", marginTop: 12 }]}>
            Version 1.0 | Effective Date: May 1, 2026
          </Text>
          <Text style={[styles.versionText, { color: theme.textSecondary, textAlign: "center", marginTop: 8 }]}>
            FortyFi FZ LLC | DMCC Free Zone, Dubai, UAE
          </Text>
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
  
  warningCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  warningTitle: { fontSize: 16, textAlign: "center" },
  warningText: { fontSize: 13, lineHeight: 20, textAlign: "center" },
  
  infoCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 12,
  },
  infoTitle: { fontSize: 15, textAlign: "center" },
  infoText: { fontSize: 13, lineHeight: 20, textAlign: "center" },
  
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 12,
  },
  cardTitle: { fontSize: 18, marginBottom: 4 },
  cardText: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },
  subsectionTitle: { fontSize: 14, marginBottom: 4 },
  
  bulletPoint: { gap: 8, marginLeft: 4 },
  bulletText: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },
  
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  tableHeaderText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  tableCell: { fontSize: 12, fontFamily: "Inter_400Regular" },
  
  liabilityBox: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  liabilityText: { fontSize: 12, textAlign: "center" },
  
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  contactText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  
  acceptCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  acceptText: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },
  versionText: { fontSize: 11, fontFamily: "Inter_400Regular" },
});