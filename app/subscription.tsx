import React, { useState } from "react";
import { getCurrencyCode, getCurrencySymbol, subscribeToCurrencyChanges } from "@/utils/format";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  businesses: string;
  members: string;
  recommended?: boolean;
  locked?: boolean;
}

const PLANS: Plan[] = [
  { id: "starter", name: "starter", monthlyPrice: 8.99, yearlyPrice: 86.99, businesses: "1", members: "2", locked: true },
  { id: "essentials", name: "essentials", monthlyPrice: 17.99, yearlyPrice: 174.99, businesses: "2", members: "4", locked: true },
  { id: "professional", name: "professional", monthlyPrice: 26.99, yearlyPrice: 259.99, businesses: "3", members: "8", locked: true },
  { id: "business", name: "business", monthlyPrice: 66.99, yearlyPrice: 649.99, businesses: "10", members: "15", recommended: true },
  { id: "enterprise", name: "enterprise", monthlyPrice: 224.99, yearlyPrice: 2199.99, businesses: "unlimited", members: "unlimited" },
];

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { t } = useLanguage();

  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState("business");
const [refreshKey, setRefreshKey] = useState(0);
const currencyCode = getCurrencyCode();

useEffect(() => {
  const unsubscribe = subscribeToCurrencyChanges(() => {
    console.log("Currency changed, refreshing subscription screen");
    setRefreshKey(prev => prev + 1);
  });
  return unsubscribe;
}, []);
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const today = new Date();
  const trialEnd = new Date(today);
  trialEnd.setDate(trialEnd.getDate() + 14);
  const afterTrial = new Date(trialEnd);
  afterTrial.setDate(afterTrial.getDate() + 1);

  const formatDate = (d: Date) =>
    `${d.getDate()} ${d.toLocaleString("en", { month: "short" })} ${d.getFullYear()}`;

  const currency = getCurrencyCode();

  const handleSubscribe = () => {
  const plan = PLANS.find((p) => p.id === selectedPlan);
  if (plan?.id === "enterprise") {
    Linking.openURL("mailto:support@feloosak.com?subject=Enterprise%20Plan%20Inquiry");
    return;
  }
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  Alert.alert("Coming Soon", `Subscription with ${currency} will be available soon.`);
};

  return (
    <View key={refreshKey} style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: theme.border, backgroundColor: theme.background }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {t("chooseYourPlan")}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 100 }]}>
        <View style={styles.billingToggle}>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setBilling("monthly"); }}
            style={[
              styles.billingBtn,
              {
                backgroundColor: billing === "monthly" ? theme.tint : "transparent",
                borderColor: billing === "monthly" ? theme.tint : theme.border,
              },
            ]}
          >
            <Text style={[styles.billingBtnText, { color: billing === "monthly" ? "#FFF" : theme.textSecondary, fontFamily: billing === "monthly" ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
              {t("monthly")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setBilling("yearly"); }}
            style={[
              styles.billingBtn,
              {
                backgroundColor: billing === "yearly" ? theme.tint : "transparent",
                borderColor: billing === "yearly" ? theme.tint : theme.border,
              },
            ]}
          >
            <Text style={[styles.billingBtnText, { color: billing === "yearly" ? "#FFF" : theme.textSecondary, fontFamily: billing === "yearly" ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
              {t("yearlyDiscount")}
            </Text>
          </Pressable>
        </View>

        {PLANS.filter((p) => !p.locked).map((plan) => {
          const price = billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
          const isSelected = selectedPlan === plan.id;
          const afterPrice = billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;

          return (
            <Pressable
              key={plan.id}
              onPress={() => { Haptics.selectionAsync(); setSelectedPlan(plan.id); }}
              style={[
                styles.planCard,
                {
                  backgroundColor: theme.card,
                  borderColor: isSelected ? theme.tint : theme.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
            >
              {plan.recommended && (
                <View style={[styles.recommendedBadge, { backgroundColor: theme.tint }]}>
                  <Text style={[styles.recommendedText, { fontFamily: "Inter_500Medium" }]}>
                    {t("recommendedForYou")}
                  </Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <View style={styles.planRadio}>
                  <View style={[styles.radioOuter, { borderColor: isSelected ? theme.tint : theme.border }]}>
                    {isSelected && <View style={[styles.radioInner, { backgroundColor: theme.tint }]} />}
                  </View>
                  <Text style={[styles.planName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    {t(plan.name as any)}
                  </Text>
                </View>
                <Text style={[styles.planPrice, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                  {currency} {price.toFixed(2)}
                  <Text style={[styles.planPeriod, { fontFamily: "Inter_400Regular" }]}>
                    {" "}/{billing === "monthly" ? t("perMonth") : t("perYear")}
                  </Text>
                </Text>
              </View>

              <View style={styles.trialInfo}>
                <Text style={[styles.trialLabel, { color: theme.tint, fontFamily: "Inter_600SemiBold" }]}>
                  {t("freeTrialWeeks")}
                </Text>
                <Text style={[styles.trialDate, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {t("startDate")}: <Text style={{ fontFamily: "Inter_600SemiBold", color: theme.text }}>{formatDate(today)}</Text>
                </Text>
                <Text style={[styles.trialDate, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {t("endDate")}: <Text style={{ fontFamily: "Inter_600SemiBold", color: theme.text }}>{formatDate(trialEnd)}</Text>
                </Text>
              </View>

              <View style={[styles.afterTrialDivider, { borderColor: theme.border }]}>
                <Feather name="arrow-down" size={14} color={theme.textSecondary} />
              </View>

              <View style={styles.afterTrial}>
                <Text style={[styles.afterPrice, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {currency} {afterPrice.toFixed(2)}
                  <Text style={[styles.afterPeriod, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {" "}{billing === "monthly" ? t("monthAfterwards") : t("yearAfterwards")}
                  </Text>
                </Text>
                <Text style={[styles.afterDate, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {t("startDate")}: <Text style={{ fontFamily: "Inter_600SemiBold", color: theme.text }}>{formatDate(afterTrial)}</Text>
                </Text>
              </View>

              <View style={styles.planLimits}>
                <View style={styles.limitRow}>
                  <Text style={[styles.limitLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {t("business")}
                  </Text>
                  <Text style={[styles.limitValue, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    {plan.businesses}
                  </Text>
                </View>
                <View style={styles.limitRow}>
                  <Text style={[styles.limitLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {t("membersInBusiness")}
                  </Text>
                  <Text style={[styles.limitValue, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                    {plan.members}
                  </Text>
                </View>
              </View>

              {plan.recommended && (
                <View style={[styles.offerBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.offerLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {t("limitedTimeOffer")}
                  </Text>
                  <Text style={[styles.offerText, { color: theme.tint, fontFamily: "Inter_600SemiBold" }]}>
                    {t("freeTrialText")}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}

        {PLANS.some((p) => p.locked) && (
          <>
            <Text style={[styles.lockedTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {t("lockedExtraUsage")}
            </Text>
            <View style={[styles.lockedInfoBox, { backgroundColor: "#F59E0B" + "12", borderColor: "#F59E0B" + "33" }]}>
              <Feather name="info" size={16} color="#F59E0B" />
              <Text style={[styles.lockedInfoText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                {t("lockedExtraUsageDesc")}
              </Text>
            </View>
            {PLANS.filter((p) => p.locked).map((plan) => {
              const price = billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
              return (
                <View key={plan.id} style={[styles.lockedPlanCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.lockedPlanHeader}>
                    <Feather name="lock" size={14} color="#F59E0B" />
                    <Text style={[styles.lockedPlanName, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                      {t(plan.name as any)}
                    </Text>
                    <Text style={[styles.lockedPlanPrice, { color: theme.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
                      {currency} {price.toFixed(2)} /{billing === "monthly" ? t("perMonth") : t("perYear")}
                    </Text>
                  </View>
                  <View style={styles.planLimits}>
                    <View style={styles.limitRow}>
                      <Text style={[styles.limitLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                        {t("business")}
                      </Text>
                      <Text style={[styles.limitValue, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                        {plan.businesses}
                      </Text>
                    </View>
                    <View style={styles.limitRow}>
                      <Text style={[styles.limitLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                        {t("membersInBusiness")}
                      </Text>
                      <Text style={[styles.limitValue, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                        {plan.members}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={styles.commonSection}>
          <Text style={[styles.commonTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {t("commonFeatures")}
          </Text>
          <View style={styles.commonItem}>
            <Feather name="check" size={14} color={theme.textSecondary} />
            <Text style={[styles.commonText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {t("unlimitedBooksAllPlans")}
            </Text>
          </View>
          <View style={styles.commonItem}>
            <Feather name="check" size={14} color={theme.textSecondary} />
            <Text style={[styles.commonText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {t("downloadReports")}
            </Text>
          </View>
        </View>

        <View style={[styles.enterpriseContact, { backgroundColor: theme.tint + "08", borderColor: theme.tint + "22" }]}>
          <Text style={[styles.enterpriseText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {t("enterpriseContactDesc")}
          </Text>
          <Pressable onPress={() => Linking.openURL("mailto:support@feloosak.com")}>
            <Text style={[styles.enterpriseEmail, { color: theme.tint, fontFamily: "Inter_600SemiBold" }]}>
              {t("supportEmail")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Platform.OS === "web" ? bottomPad + 4 : Math.max(insets.bottom, 12), backgroundColor: theme.background, borderTopColor: theme.border }]}>
        <View style={[styles.cancelNotice, { backgroundColor: theme.tint + "08" }]}>
          <Feather name="info" size={14} color={theme.tint} />
          <Text style={[styles.cancelText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {t("cancelAnytime")}
          </Text>
        </View>
        <Pressable
          onPress={handleSubscribe}
          style={({ pressed }) => [
            styles.subscribeBtn,
            { backgroundColor: "#10B981", opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.subscribeBtnText, { fontFamily: "Inter_700Bold" }]}>
            {t("subscribe")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18 },
  scrollContent: { paddingTop: 16, paddingHorizontal: 16 },
  billingToggle: {
    flexDirection: "row",
    gap: 0,
    marginBottom: 20,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.2)",
  },
  billingBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 0,
  },
  billingBtnText: { fontSize: 14 },
  planCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    overflow: "hidden",
  },
  recommendedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: { color: "#FFF", fontSize: 11 },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  planRadio: { flexDirection: "row", alignItems: "center", gap: 10 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  planName: { fontSize: 17 },
  planPrice: { fontSize: 16 },
  planPeriod: { fontSize: 13 },
  trialInfo: { gap: 4, marginBottom: 8 },
  trialLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  trialDate: { fontSize: 13 },
  afterTrialDivider: {
    alignItems: "center",
    paddingVertical: 6,
  },
  afterTrial: { gap: 4, marginBottom: 12 },
  afterPrice: { fontSize: 15 },
  afterPeriod: { fontSize: 12 },
  afterDate: { fontSize: 13 },
  planLimits: { gap: 6, marginTop: 4 },
  limitRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  limitLabel: { fontSize: 14 },
  limitValue: { fontSize: 14 },
  offerBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  offerLabel: { fontSize: 12 },
  offerText: { fontSize: 14, marginTop: 2 },
  lockedTitle: { fontSize: 15, marginTop: 8, marginBottom: 8 },
  lockedInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  lockedInfoText: { fontSize: 13, flex: 1, lineHeight: 19 },
  lockedPlanCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    opacity: 0.7,
  },
  lockedPlanHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  lockedPlanName: { fontSize: 15, flex: 1 },
  lockedPlanPrice: { fontSize: 14 },
  commonSection: { marginTop: 16, marginBottom: 16 },
  commonTitle: { fontSize: 15, marginBottom: 10 },
  commonItem: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  commonText: { fontSize: 14 },
  enterpriseContact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  enterpriseText: { fontSize: 13 },
  enterpriseEmail: { fontSize: 13 },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  cancelNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  cancelText: { fontSize: 12, flex: 1, lineHeight: 17 },
  subscribeBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  subscribeBtnText: { color: "#FFF", fontSize: 16 },
});
