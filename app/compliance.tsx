// app/compliance.tsx - Dynamic region-based compliance
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useFocusEffect } from 'expo-router';
import { loadCurrency } from '@/utils/format';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
  Platform,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";
import { formatEGP, getCurrencySymbol, subscribeToCurrencyChanges } from "@/utils/format";
import AsyncStorage from "@react-native-async-storage/async-storage";

const REGION_KEY = "user_selected_region";

// Complete region data based on your documentation
interface RegionInfo {
  id: string;
  n: string;
  ar: string;
  fl: string;
  cur: string;
  vr: number;
  vl: string;
  auth: string;
  ct: number;
  ctT: number;
  eM: boolean;
  fmt: string;
  sig: string;
  arch: number;
  pc: string;
  rt: boolean;
  tin?: string;
  profVat?: number;
  vatThreshold?: number;
  wht?: string;
  eInvModel?: string;
  eInvFields?: { l: string; d: string }[];
  smeTiers?: { max: number; rate: string }[];
  smeThreshold?: number;
  uinLen?: number;
  socialIns?: string;
  implSteps?: string[];
  cal: { e: string; d: string; r: boolean }[];
  v26: { t: string; d: string }[] | null;
  pays: string[];
  ctDescription?: string;
  registrationThreshold?: string;
  filingFrequency?: string;
  recordRetention?: number;
  whtEnabled?: boolean;
  zakatEnabled?: boolean;
}

// Complete region data for all 7 regions
const RG: Record<string, RegionInfo> = {
  EG: {
    id: "EG", n: "Egypt", ar: "مصر", fl: "🇪🇬", cur: "EGP",
    vr: 0.14, vl: "VAT 14%", auth: "ETA", ct: 0.225, ctT: 0,
    eM: true, fmt: "XML/JSON", sig: "E-Signature/E-Seal", arch: 5,
    pc: "GS1 GPC", rt: true, tin: "9-digit TIN", profVat: 0.10,
    vatThreshold: 500000, wht: "1%–3% on services",
    eInvModel: "Clearance (real-time ETA validation)",
    registrationThreshold: "EGP 500,000/year",
    filingFrequency: "Monthly (within 30 days after period end)",
    recordRetention: 7,
    whtEnabled: true,
    zakatEnabled: false,
    eInvFields: [
      { l: "UUID", d: "Unique Universal Identifier per invoice" },
      { l: "Seller & Buyer TIN", d: "Validated 9-digit Tax ID for both parties (B2B)" },
      { l: "Buyer Info", d: "Name, Address, Phone number" },
      { l: "Item Codes", d: "GS1 or GPC coding standards for each line item" },
      { l: "UIN", d: "39-character Unique Identification Number (since Nov 2024)" },
      { l: "QR Code", d: "Machine-readable code for verification" },
      { l: "E-Signature", d: "Digital signature via licensed provider" },
    ],
    smeTiers: [
      { max: 250000, rate: "0.4%" }, { max: 500000, rate: "0.5%" },
      { max: 1000000, rate: "0.75%" }, { max: 2000000, rate: "1.0%" },
      { max: 3000000, rate: "1.25%" }, { max: 10000000, rate: "1.5%" },
      { max: 20000000, rate: "1.5%" },
    ],
    smeThreshold: 20000000, uinLen: 39,
    socialIns: "11% employee + 18.75% employer",
    implSteps: [
      "Obtain Digital Signature/Seal from licensed provider",
      "Register on ETA Portal & set up company profile",
      "Integrate billing system (API) with ETA SDK",
      "Map all products/services to GS1/GPC codes",
      "Enable automated VAT (14%) & WHT (1%–3%) calculation",
      "Implement B2B buyer TIN + UIN (39-char) validation",
    ],
    pays: ["Fawry", "Vodafone Cash", "InstaPay", "Paymob", "Meeza"],
    cal: [
      { e: "Monthly VAT Return", d: "Within 30 days after tax period end", r: true },
      { e: "Annual Corporate Tax Return", d: "April 30", r: true },
      { e: "Withholding Tax Filing", d: "Quarterly", r: true },
      { e: "Payroll Tax Reconciliation", d: "Annual", r: true },
    ],
    v26: [
      { t: "Law 5 & 6 of 2025 — SME Incentives", d: "Turnover ≤ EGP 20M: simplified fixed-rate tax (0.4%–1.5% of revenue)" },
      { t: "UIN Validation (Nov 2024)", d: "39-character Unique Identification Number required for all B2B transactions" },
      { t: "E-Receipts (B2C) Expansion", d: "Mandatory POS integration with ETA for B2C transactions" },
    ],
  },
  AE: {
    id: "AE", n: "UAE", ar: "الإمارات", fl: "🇦🇪", cur: "AED",
    vr: 0.05, vl: "VAT 5%", auth: "FTA", ct: 0.09, ctT: 375000,
    eM: false, fmt: "Peppol CTC", sig: "Digital Cert", arch: 5,
    pc: "TBD", rt: false, tin: "TRN (15-digit)",
    registrationThreshold: "AED 375,000/year (mandatory), AED 187,500/year (voluntary)",
    filingFrequency: "Quarterly (default), Monthly (optional)",
    recordRetention: 5,
    whtEnabled: false,
    zakatEnabled: false,
    pays: ["Apple Pay", "Google Pay", "Tabby", "Tamara", "PayTabs"],
    cal: [
      { e: "VAT Return", d: "28 days after period", r: true },
      { e: "Corporate Tax", d: "9 months after FY", r: true },
      { e: "E-Invoice Pilot", d: "July 2026", r: false },
      { e: "E-Invoice Mandatory", d: "2027", r: false },
    ],
    v26: [
      { t: "Reverse Charge Simplified", d: "No self-invoices required. Retain supplier documentation for reverse charge mechanism." },
      { t: "5-Year Refund Deadline", d: "Unclaimed VAT expires after 5 years. Must claim older credits before Dec 31, 2026." },
      { t: "Anti-Evasion", d: "FTA can deny input VAT linked to evasion. Supplier due diligence required." },
      { t: "Supplier Due Diligence", d: "Verify supplier TRN before claiming input VAT." },
      { t: "Late Payment Penalty", d: "Now 14% per annum (replaced daily rate)." },
    ],
  },
  SA: {
    id: "SA", n: "Saudi Arabia", ar: "السعودية", fl: "🇸🇦", cur: "SAR",
    vr: 0.15, vl: "VAT 15%", auth: "ZATCA", ct: 0.20, ctT: 0,
    eM: true, fmt: "FATOORAH", sig: "Crypto Stamp", arch: 6,
    pc: "GS1", rt: true, tin: "VAT Registration Number",
    registrationThreshold: "SAR 375,000/year (mandatory), SAR 187,500/year (voluntary)",
    filingFrequency: "Monthly (revenue > SAR 40M), Quarterly (revenue < SAR 40M)",
    recordRetention: 6,
    whtEnabled: true,
    zakatEnabled: true,
    pays: ["Mada", "Apple Pay", "STC Pay", "Tabby", "Tamara"],
    cal: [
      { e: "VAT Return", d: "Last day of month following period", r: true },
      { e: "Zakat Return", d: "Based on Hijri calendar", r: true },
      { e: "Corporate Tax Return", d: "120 days after year end", r: true },
    ],
    v26: [
      { t: "Phase 2 E-Invoicing", d: "API integration with ZATCA platform. Wave 23 (SAR 750k+) due March 2026, Wave 24 (SAR 375k+) due June 2026." },
      { t: "B2B Clearance", d: "Real-time API clearance BEFORE sharing invoice with buyer." },
      { t: "B2C Reporting", d: "Simplified invoices reported within 24 hours." },
      { t: "QR Code Mandatory", d: "Contains seller TIN, timestamp, total, VAT, crypto hash." },
    ],
  },
  KW: {
    id: "KW", n: "Kuwait", ar: "الكويت", fl: "🇰🇼", cur: "KWD",
    vr: 0, vl: "VAT Coming Soon", auth: "KTA", ct: 0.15, ctT: 0,
    eM: false, fmt: "", sig: "", arch: 5,
    pc: "", rt: false, tin: "Tax Card Number",
    registrationThreshold: "VAT expected 2026-2027 (5% per GCC agreement)",
    filingFrequency: "TBD",
    recordRetention: 5,
    whtEnabled: false,
    zakatEnabled: false,
    pays: ["KNET", "Apple Pay", "Google Pay"],
    cal: [
      { e: "Corporate Tax (Foreign)", d: "15% on Kuwait-source income for foreign entities", r: true },
    ],
    v26: [
      { t: "VAT Expected 2026-2027", d: "5% VAT rate per GCC agreement. Build infrastructure now." },
      { t: "Domestic Corporate Tax", d: "0% for Kuwaiti/GCC entities. No corporate tax for local companies." },
      { t: "Foreign Corporate Tax", d: "15% on Kuwait-source income for non-GCC entities." },
    ],
  },
  QA: {
    id: "QA", n: "Qatar", ar: "قطر", fl: "🇶🇦", cur: "QAR",
    vr: 0, vl: "VAT Coming Soon", auth: "GTA", ct: 0.10, ctT: 0,
    eM: false, fmt: "", sig: "", arch: 5,
    pc: "", rt: false, tin: "Tax Identification Number",
    registrationThreshold: "VAT Law No. 25 of 2018 enacted - no go-live date yet",
    filingFrequency: "TBD",
    recordRetention: 5,
    whtEnabled: true,
    zakatEnabled: false,
    pays: ["Apple Pay", "Google Pay", "Vodafone Cash", "Ooredoo Money"],
    cal: [
      { e: "Corporate Tax", d: "10% flat rate on Qatar-source income", r: true },
      { e: "Withholding Tax", d: "5% on royalties, technical fees, interest, dividends", r: true },
    ],
    v26: [
      { t: "VAT Implementation (Expected 2026-2027)", d: "5% VAT rate per GCC agreement. System preparations ongoing." },
      { t: "Excise Tax", d: "100% on tobacco/energy drinks, 50% on carbonated drinks/sugar." },
    ],
  },
  OM: {
    id: "OM", n: "Oman", ar: "عمان", fl: "🇴🇲", cur: "OMR",
    vr: 0.05, vl: "VAT 5%", auth: "OTA", ct: 0.15, ctT: 0,
    eM: false, fmt: "PEPPOL", sig: "Digital Signature", arch: 5,
    pc: "", rt: false, tin: "Tax Identification Number",
    registrationThreshold: "OMR 38,500/year",
    filingFrequency: "Quarterly (within 30 days after quarter end)",
    recordRetention: 5,
    whtEnabled: true,
    zakatEnabled: false,
    pays: ["Apple Pay", "Google Pay", "Omantel Money"],
    cal: [
      { e: "VAT Return", d: "30 days after quarter end", r: true },
      { e: "Corporate Tax", d: "15% flat rate on net taxable income", r: true },
    ],
    v26: [
      { t: "SME Incentive", d: "3% tax rate for qualifying SMEs with income under OMR 100,000." },
      { t: "E-Invoicing 'Fawtara'", d: "Peppol model. Phased rollout 2026-2027." },
      { t: "Q3 2026 Exchange Begins", d: "Transaction exchange with OTA begins in Q3 2026." },
    ],
  },
  BH: {
    id: "BH", n: "Bahrain", ar: "البحرين", fl: "🇧🇭", cur: "BHD",
    vr: 0.10, vl: "VAT 10%", auth: "NBR", ct: 0, ctT: 0,
    eM: false, fmt: "", sig: "", arch: 5,
    pc: "", rt: false, tin: "VAT Registration Number",
    registrationThreshold: "BHD 37,500/year (mandatory), BHD 18,750/year (voluntary)",
    filingFrequency: "Monthly (revenue > BHD 3M), Quarterly (revenue < BHD 3M)",
    recordRetention: 5,
    whtEnabled: false,
    zakatEnabled: false,
    pays: ["Benefit", "Apple Pay", "Google Pay"],
    cal: [
      { e: "VAT Return", d: "28 days after period end", r: true },
      { e: "DMTT (MNE)", d: "15% for MNEs with global revenue > EUR 750M", r: false },
    ],
    v26: [
      { t: "VAT 10% Implemented", d: "Increased from 5% effective January 1, 2022." },
      { t: "No Corporate Tax", d: "No corporate income tax for most businesses. DMTT 15% only for large MNEs." },
      { t: "E-Invoicing Expected", d: "Following GCC neighbors. NBR preparing infrastructure." },
    ],
  },
};

export default function ComplianceScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const { t, isAr } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>("EG");
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [totals, setTotals] = useState({ income: 0, expense: 0 });
useFocusEffect(
  useCallback(() => {
    loadCurrency();
  }, [])
);
  // Load selected region from storage
  useEffect(() => {
    const loadRegion = async () => {
      try {
        const savedRegion = await AsyncStorage.getItem(REGION_KEY);
        if (savedRegion && RG[savedRegion]) {
          setSelectedRegion(savedRegion);
        }
      } catch (error) {
        console.error("Error loading region:", error);
      }
    };
    loadRegion();
  }, []);

  // Listen for region changes from Settings
  React.useEffect(() => {
    const interval = setInterval(async () => {
      const savedRegion = await AsyncStorage.getItem(REGION_KEY);
      if (savedRegion && RG[savedRegion] && savedRegion !== selectedRegion) {
        setSelectedRegion(savedRegion);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [selectedRegion]);

  // Fetch ALL transactions from Firestore
  useEffect(() => {
    const fetchAllTransactions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const q = query(collection(db, 'transactions'), where('userId', '==', user.id));
        const snapshot = await getDocs(q);
        const transactions: any[] = [];
        let totalIncome = 0;
        let totalExpense = 0;
        
        snapshot.forEach(doc => {
          const data = doc.data();
          const amount = data.amount || 0;
          if (data.type === 'income') {
            totalIncome += amount;
          } else if (data.type === 'expense') {
            totalExpense += amount;
          }
          transactions.push({ id: doc.id, ...data });
        });
        
        setAllTransactions(transactions);
        setTotals({ income: totalIncome, expense: totalExpense });
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllTransactions();
  }, [user]);

  const R = RG[selectedRegion] || RG.EG;
  const c = R.cur;

  const tI = totals.income;
  const tO = totals.expense;
  const pr = tI - tO;
  const oV = Math.round(tI * R.vr);
  const iV = Math.round(tO * R.vr);
  const nV = oV - iV;
  const ct = Math.round(Math.max(0, pr) * R.ct);
  const rev = tI;
  const smeEligible = R.id === "EG" && R.smeThreshold && rev <= R.smeThreshold;
  const smeTier = smeEligible && R.smeTiers ? R.smeTiers.find(t => rev <= t.max) : null;
  const smeTax = smeTier ? Math.round(rev * parseFloat(smeTier.rate) / 100) : 0;

  const formatCurrency = (amount: number) => `${getCurrencySymbol()} ${amount.toLocaleString()}`;

  const topPad = insets.top + (Platform.OS === "web" ? 20 : 10);
  const bottomPad = insets.bottom + 20;

  // Show VAT notice for regions without VAT
  const showVatNotice = R.id === "KW" || R.id === "QA";
  const showEInvoiceComing = R.id === "KW" || R.id === "QA" || R.id === "BH";

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={theme.tint} />
        <Text style={{ marginTop: 16, color: theme.textSecondary }}>Loading compliance data...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 80 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            {R.fl} Compliance — {R.n}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Tax & Regulatory Compliance Dashboard
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* VAT Coming Soon Notice */}
        {showVatNotice && (
          <View style={[styles.infoCard, { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" }]}>
            <Feather name="clock" size={16} color="#D97706" />
            <Text style={[styles.infoText, { color: "#92400E" }]}>
              {R.id === "KW" ? "VAT expected 2026-2027 (5% per GCC agreement)" : "VAT Law No. 25 of 2018 enacted — implementation expected 2026-2027"}
            </Text>
          </View>
        )}

        {/* E-Invoicing Coming Soon Notice */}
        {showEInvoiceComing && (
          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Feather name="alert-circle" size={16} color={theme.textSecondary} />
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              E-invoicing expected to follow GCC neighbors — infrastructure preparation in progress
            </Text>
          </View>
        )}

        {/* Show transaction count */}
        <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Feather name="database" size={16} color={theme.textSecondary} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            Based on {allTransactions.length} transaction(s) across all books
          </Text>
        </View>

        {/* Core Tax Identifiers */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: theme.surface }]}>
              <Text style={styles.cardIconText}>🏛️</Text>
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                Core Tax Identifiers
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                {R.auth} Requirements
              </Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Taxpayer ID</Text>
              <Text style={[styles.statValue, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{R.tin || "TIN"}</Text>
              <Text style={[styles.statSub, { color: theme.textSecondary }]}>Registered with {R.auth}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Registration Threshold</Text>
              <Text style={[styles.statValue, { color: theme.text, fontFamily: "Inter_700Bold", fontSize: 11 }]}>{R.registrationThreshold || "N/A"}</Text>
              <Text style={[styles.statSub, { color: theme.textSecondary }]}>Mandatory Registration</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Record Retention</Text>
              <Text style={[styles.statValue, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{R.recordRetention || 5} years</Text>
              <Text style={[styles.statSub, { color: theme.textSecondary }]}>Minimum retention period</Text>
            </View>
          </View>
        </View>

        {/* VAT Summary - Only show if VAT is enabled */}
        {(R.vr > 0 || showVatNotice) && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: theme.surface }]}>
                <Text style={styles.cardIconText}>🧾</Text>
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  VAT Summary
                </Text>
                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                  {R.vr > 0 ? R.vl : "VAT Coming Soon"}
                </Text>
              </View>
            </View>

            {R.vr > 0 ? (
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
                  <Text style={[styles.statLabel, { color: "#065F46" }]}>Output VAT</Text>
                  <Text style={[styles.statValue, { color: "#064E3B", fontFamily: "Inter_700Bold" }]}>{formatCurrency(oV)}</Text>
                  <Text style={[styles.statSub, { color: "#059669" }]}>On Sales</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
                  <Text style={[styles.statLabel, { color: "#991B1B" }]}>Input VAT</Text>
                  <Text style={[styles.statValue, { color: "#7F1D1D", fontFamily: "Inter_700Bold" }]}>{formatCurrency(iV)}</Text>
                  <Text style={[styles.statSub, { color: "#DC2626" }]}>On Purchases</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
                  <Text style={[styles.statLabel, { color: "#92400E" }]}>Net VAT Payable</Text>
                  <Text style={[styles.statValue, { color: "#78350F", fontFamily: "Inter_700Bold" }]}>{formatCurrency(nV)}</Text>
                  <Text style={[styles.statSub, { color: "#D97706" }]}>Due to {R.auth}</Text>
                </View>
              </View>
            ) : (
              <Text style={[styles.noteText, { color: theme.textSecondary, backgroundColor: theme.surface, textAlign: "center" }]}>
                VAT has not yet been implemented in {R.n}. Expected rate: 5% per GCC agreement.
              </Text>
            )}
          </View>
        )}

        {/* E-Invoicing Requirements - Show based on region */}
        {R.eM && R.eInvFields && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: theme.surface }]}>
                <Text style={styles.cardIconText}>📄</Text>
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  E-Invoicing Requirements
                </Text>
                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                  {R.fmt} • {R.eInvModel || "Mandatory"}
                </Text>
              </View>
            </View>

            <Text style={[styles.noteText, { color: theme.textSecondary, backgroundColor: theme.surface }]}>
              {R.eInvModel || "Real-time API submission required before sharing invoices with buyers"}
            </Text>

            <View style={styles.smallGrid}>
              {[
                ["Format", R.fmt],
                ["Model", R.eInvModel || "Clearance"],
                ["Coding", R.pc],
                ["Filing", R.filingFrequency || "Monthly"],
              ].map(([l, v], i) => (
                <View key={i} style={[styles.smallCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.smallLabel, { color: theme.textSecondary }]}>{l}</Text>
                  <Text style={[styles.smallValue, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{v}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Mandatory Invoice Fields:</Text>
            {R.eInvFields.map((f, i) => (
              <View key={i} style={[styles.fieldItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.fieldNumber, { backgroundColor: theme.border }]}>
                  <Text style={[styles.fieldNumberText, { color: theme.textSecondary }]}>{i + 1}</Text>
                </View>
                <View style={styles.fieldContent}>
                  <Text style={[styles.fieldTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{f.l}</Text>
                  <Text style={[styles.fieldDesc, { color: theme.textSecondary }]}>{f.d}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Corporate Tax Card */}
        {R.ct > 0 && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: theme.surface }]}>
                <Text style={styles.cardIconText}>🏢</Text>
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  Corporate Tax
                </Text>
                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                  {R.id === "AE" ? "0% on first AED 375K, 9% above" : 
                   R.id === "SA" ? "20% / Zakat 2.5%" :
                   R.id === "KW" ? "0% (domestic), 15% (foreign)" :
                   `${(R.ct * 100)}% flat rate`}
                </Text>
              </View>
            </View>

            <View style={styles.rowGrid}>
              <View style={[styles.rowCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Taxable Profit</Text>
                <Text style={[styles.rowValue, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{formatCurrency(Math.max(0, pr))}</Text>
                {R.id === "AE" && pr <= R.ctT && <Text style={[styles.rowSub, { color: "#10B981" }]}>✓ Below threshold (AED 375K)</Text>}
              </View>
              <View style={[styles.rowCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Est. CIT</Text>
                <Text style={[styles.rowValue, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{formatCurrency(ct)}</Text>
                <Text style={[styles.rowSub, { color: theme.textSecondary }]}>Estimated Liability</Text>
              </View>
            </View>

            {R.id === "SA" && (
              <View style={[styles.smeCard, { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" }]}>
                <Text style={[styles.smeText, { color: "#92400E" }]}>
                  💰 Zakat (2.5%) applies to Saudi/GCC nationals. Foreign entities pay 20% income tax.
                </Text>
              </View>
            )}

            {R.id === "KW" && (
              <View style={[styles.smeCard, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
                <Text style={[styles.smeText, { color: "#065F46" }]}>
                  💰 Domestic entities: 0% corporate tax. Foreign entities: 15% on Kuwait-source income.
                </Text>
              </View>
            )}
            
            {smeEligible && R.id === "EG" && (
              <View style={[styles.smeCard, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
                <Text style={[styles.smeText, { color: "#065F46" }]}>
                  💰 SME Simplified Tax Rate: {smeTier?.rate} → {formatCurrency(smeTax)} instead of {formatCurrency(ct)}
                </Text>
              </View>
            )}

            {R.id === "OM" && rev <= 100000 && (
              <View style={[styles.smeCard, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
                <Text style={[styles.smeText, { color: "#065F46" }]}>
                  💰 SME Incentive: 3% tax rate applies (revenue under OMR 100,000)
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Legal Updates */}
        {R.v26 && R.v26.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: theme.surface }]}>
                <Text style={styles.cardIconText}>⚠️</Text>
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {R.id === "EG" ? "Egypt 2025–2026 Legal Updates" : 
                   R.id === "AE" ? "UAE 2026 VAT Amendments" :
                   R.id === "SA" ? "Saudi ZATCA Updates" :
                   R.id === "KW" ? "Kuwait Tax Updates" :
                   R.id === "QA" ? "Qatar Tax Updates" :
                   R.id === "OM" ? "Oman Tax Updates" :
                   "Recent Regulatory Changes"}
                </Text>
                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                  Recent Regulatory Changes
                </Text>
              </View>
            </View>

            {R.v26.map((a, i) => (
              <View key={i} style={[styles.updateItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.updateTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{a.t}</Text>
                <Text style={[styles.updateDesc, { color: theme.textSecondary }]}>{a.d}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Implementation Checklist - Only for Egypt */}
        {R.id === "EG" && R.implSteps && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: theme.surface }]}>
                <Text style={styles.cardIconText}>🚀</Text>
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  Implementation Checklist
                </Text>
                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                  {R.auth}-Compliant Setup Steps
                </Text>
              </View>
            </View>

            {R.implSteps.map((s, i) => (
              <View key={i} style={[styles.checklistItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.checklistNumber, { backgroundColor: theme.border }]}>
                  <Text style={[styles.checklistNumberText, { color: theme.textSecondary }]}>{i + 1}</Text>
                </View>
                <Text style={[styles.checklistText, { color: theme.text }]}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tax Calendar */}
        {R.cal && R.cal.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: theme.surface }]}>
                <Text style={styles.cardIconText}>📅</Text>
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  Tax Calendar
                </Text>
                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                  Important Filing Deadlines
                </Text>
              </View>
            </View>

            {R.cal.map((ev, i) => (
              <View key={i} style={[styles.calendarItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={styles.calendarIcon}>{ev.r ? "🔄" : "⏰"}</Text>
                <View style={styles.calendarContent}>
                  <Text style={[styles.calendarTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{ev.e}</Text>
                  <Text style={[styles.calendarDate, { color: theme.textSecondary }]}>Deadline: {ev.d}</Text>
                </View>
                <View style={[styles.calendarBadge, { backgroundColor: ev.r ? "#EFF6FF" : "#F3F4F6" }]}>
                  <Text style={[styles.calendarBadgeText, { color: ev.r ? "#2563EB" : "#6B7280" }]}>
                    {ev.r ? "Recurring" : "One-time"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={styles.disclaimerIcon}>⚠️</Text>
          <Text style={[styles.disclaimerText, { color: theme.textSecondary }]}>
            <Text style={{ fontFamily: "Inter_700Bold" }}>Disclaimer:</Text> Tax calculations are based on your transaction data ({allTransactions.length} transactions) and are estimates only. Consult a tax professional for actual filing.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    paddingHorizontal: 20, 
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: { fontSize: 24 },
  subtitle: { fontSize: 13, marginTop: 4 },
  content: { paddingHorizontal: 20, gap: 16 },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 16,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardIconText: { fontSize: 22 },
  cardTitle: { fontSize: 16 },
  cardSubtitle: { fontSize: 11, marginTop: 2 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { flex: 1, minWidth: "30%", padding: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  statLabel: { fontSize: 10, textTransform: "uppercase", marginBottom: 4 },
  statValue: { fontSize: 14, marginBottom: 2, textAlign: "center" },
  statSub: { fontSize: 9, textAlign: "center" },
  rowGrid: { flexDirection: "row", gap: 12 },
  rowCard: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1 },
  rowLabel: { fontSize: 10, textTransform: "uppercase", marginBottom: 4 },
  rowValue: { fontSize: 16, marginBottom: 2 },
  rowSub: { fontSize: 9 },
  noteText: { padding: 12, borderRadius: 12, fontSize: 11, lineHeight: 16 },
  smeCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  smeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  disclaimer: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, marginTop: 8, marginBottom: 20 },
  disclaimerIcon: { fontSize: 18 },
  disclaimerText: { flex: 1, fontSize: 11, lineHeight: 16 },
  smallGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  smallCard: { flex: 1, minWidth: "40%", padding: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  smallLabel: { fontSize: 9, textTransform: "uppercase", marginBottom: 2 },
  smallValue: { fontSize: 12, textAlign: "center" },
  sectionTitle: { fontSize: 11, textTransform: "uppercase", marginTop: 4, marginBottom: 8 },
  fieldItem: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  fieldNumber: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  fieldNumberText: { fontSize: 12 },
  fieldContent: { flex: 1 },
  fieldTitle: { fontSize: 13, marginBottom: 2 },
  fieldDesc: { fontSize: 10, lineHeight: 14 },
  updateItem: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  updateTitle: { fontSize: 13 },
  updateDesc: { fontSize: 11, lineHeight: 16 },
  checklistItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  checklistNumber: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  checklistNumberText: { fontSize: 12 },
  checklistText: { flex: 1, fontSize: 12, lineHeight: 16 },
  calendarItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  calendarIcon: { fontSize: 20 },
  calendarContent: { flex: 1 },
  calendarTitle: { fontSize: 13 },
  calendarDate: { fontSize: 10, marginTop: 2 },
  calendarBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  calendarBadgeText: { fontSize: 9 },
});