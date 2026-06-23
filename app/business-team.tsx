import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import Colors from "@/constants/colors";

interface Member {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  role: string;
}

export default function BusinessTeamScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const { t } = useLanguage();
  const { bookId } = useLocalSearchParams<{ bookId: string }>();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"viewer" | "editor">("viewer");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [selectedRoleTab, setSelectedRoleTab] = useState<"primary" | "admin" | "employee">("primary");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const fetchMembers = useCallback(async () => {
    if (!bookId) {
      setLoading(false);
      return;
    }
    try {
      const url = new URL(`/api/books/${bookId}/members`, getApiUrl());
      const res = await fetch(url.toString(), { credentials: "include" });
      if (res.ok) setMembers(await res.json());
    } catch (_e) {}
    setLoading(false);
  }, [bookId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAddMember = useCallback(async () => {
    if (!addEmail.trim()) {
      setAddError(t("enterEmailToAdd"));
      return;
    }
    setAdding(true);
    setAddError("");
    try {
      await apiRequest("POST", `/api/books/${bookId}/members`, {
        username: addEmail.trim(),
        role: addRole,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAddEmail("");
      setShowAddModal(false);
      fetchMembers();
    } catch (e: any) {
      setAddError(e.message || t("failedToAddMember"));
    }
    setAdding(false);
  }, [addEmail, addRole, bookId, fetchMembers, t]);

  const roleColor = (role: string) => {
    if (role === "owner") return "#10B981";
    if (role === "editor") return "#F59E0B";
    return theme.textSecondary;
  };

  const permissionsMap = {
    primary: {
      permissions: [t("fullAccess"), t("fullAccessSettings"), t("addRemoveMembers")],
      info: t("everyBusinessOneAdmin"),
      restrictions: [],
    },
    admin: {
      permissions: [t("fullAccess"), t("fullAccessSettings"), t("addRemoveMembers")],
      info: "",
      restrictions: [t("cantDeleteBusiness"), t("cantRemovePrimaryAdmin")],
    },
    employee: {
      permissions: [t("limitedAccessBooks"), t("adminCanAssign")],
      info: "",
      restrictions: [t("noAccessOtherBooks"), t("noAccessBusinessSettings"), t("noOptionDeleteBooks")],
    },
  };

  const currentPerm = permissionsMap[selectedRoleTab];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: theme.border, backgroundColor: theme.background }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {t("businessTeam")}
        </Text>
        <Pressable onPress={() => setShowRolesModal(true)} hitSlop={8}>
          <Feather name="help-circle" size={20} color={theme.textSecondary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 100 }]}>
        <View style={[styles.infoBanner, { backgroundColor: theme.tint + "18" }]}>
          <View style={styles.infoBannerContent}>
            <Text style={[styles.infoBannerTitle, { color: theme.tint, fontFamily: "Inter_600SemiBold" }]}>
              {t("howToAddMembers")}
            </Text>
            <Text style={[styles.infoBannerSubtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {t("addMembersAssignRoles")}
            </Text>
          </View>
        </View>

        <View style={styles.hierarchySection}>
          <Text style={[styles.hierarchyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {t("addMembersAssignRoles")}
          </Text>
          <Text style={[styles.hierarchySubtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {t("addMembersRolesDesc")}
          </Text>

          <View style={styles.hierarchy}>
            <View style={[styles.hierarchyNode, { backgroundColor: "#10B981" + "22", borderColor: "#10B981" + "44" }]}>
              <Text style={[styles.hierarchyNodeText, { color: "#10B981", fontFamily: "Inter_600SemiBold" }]}>
                {t("owner")} ({t("primaryAdmin")})
              </Text>
            </View>
            <View style={styles.hierarchyLine}>
              <View style={[styles.hLine, { backgroundColor: theme.border }]} />
            </View>
            <View style={styles.hierarchyChildren}>
              <View style={[styles.hierarchyChild, { backgroundColor: "#F59E0B" + "15", borderColor: "#F59E0B" + "44" }]}>
                <Feather name="user" size={16} color="#F59E0B" />
                <Text style={[styles.hierarchyChildLabel, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {t("admin")}
                </Text>
                <Text style={[styles.hierarchyChildDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  ({t("fullAccess").toLowerCase()})
                </Text>
              </View>
              <View style={[styles.hierarchyChild, { backgroundColor: theme.tint + "15", borderColor: theme.tint + "44" }]}>
                <Feather name="user" size={16} color={theme.tint} />
                <Text style={[styles.hierarchyChildLabel, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                  {t("employee")}
                </Text>
                <Text style={[styles.hierarchyChildDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  ({t("limitedAccessBooks").toLowerCase()})
                </Text>
              </View>
            </View>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={theme.tint} style={{ marginTop: 30 }} />
        ) : (
          members.map((member) => (
            <View key={member.id} style={[styles.memberRow, { borderBottomColor: theme.border }]}>
              <View style={[styles.memberAvatar, { backgroundColor: roleColor(member.role) + "22" }]}>
                <Text style={[styles.memberInitial, { color: roleColor(member.role), fontFamily: "Inter_700Bold" }]}>
                  {member.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {member.userId === user?.id ? t("owner") : member.displayName}
                </Text>
                <Text style={[styles.memberEmail, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {member.username}
                </Text>
              </View>
              <View style={[styles.roleBadge, { backgroundColor: roleColor(member.role) + "18" }]}>
                <Text style={[styles.roleBadgeText, { color: roleColor(member.role), fontFamily: "Inter_500Medium" }]}>
                  {member.role === "owner" ? t("primaryAdmin") : member.role === "editor" ? t("admin") : t("employee")}
                </Text>
              </View>
            </View>
          ))
        )}

        <Pressable
          onPress={() => setShowRolesModal(true)}
          style={styles.viewRolesRow}
        >
          <Feather name="info" size={16} color={theme.tint} />
          <Text style={[styles.viewRolesText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
            {t("viewRolesPermissionsDetail")}
          </Text>
          <Feather name="chevron-right" size={16} color={theme.textSecondary} />
        </Pressable>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Platform.OS === "web" ? bottomPad + 4 : Math.max(insets.bottom, 12), backgroundColor: theme.background, borderTopColor: theme.border }]}>
        <Pressable
          onPress={() => setShowAddModal(true)}
          style={({ pressed }) => [
            styles.addTeamBtn,
            { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="user-plus" size={18} color="#FFF" />
          <Text style={[styles.addTeamBtnText, { fontFamily: "Inter_700Bold" }]}>
            {t("addTeamMember")}
          </Text>
        </Pressable>
      </View>

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.addModalContent, { backgroundColor: theme.card }]}>
            <View style={styles.addModalHeader}>
              <Pressable onPress={() => setShowAddModal(false)} hitSlop={8}>
                <Feather name="x" size={22} color={theme.textSecondary} />
              </Pressable>
              <Text style={[styles.addModalTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {t("addTeamMember")}
              </Text>
              <View style={{ width: 22 }} />
            </View>

            <TextInput
              style={[styles.addInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text, fontFamily: "Inter_400Regular" }]}
              value={addEmail}
              onChangeText={setAddEmail}
              placeholder={t("enterEmailToAdd")}
              placeholderTextColor={theme.textSecondary + "88"}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />

            <View style={styles.roleToggle}>
              {(["viewer", "editor"] as const).map((role) => (
                <Pressable
                  key={role}
                  onPress={() => setAddRole(role)}
                  style={[
                    styles.roleBtn,
                    {
                      backgroundColor: addRole === role ? theme.tint + "22" : "transparent",
                      borderColor: addRole === role ? theme.tint : theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.roleBtnText, { color: addRole === role ? theme.tint : theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                    {role === "editor" ? t("admin") : t("employee")}
                  </Text>
                </Pressable>
              ))}
            </View>

            {addError ? (
              <Text style={[styles.addError, { color: theme.expense, fontFamily: "Inter_400Regular" }]}>
                {addError}
              </Text>
            ) : null}

            <Pressable
              onPress={handleAddMember}
              disabled={adding}
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: theme.tint, opacity: pressed || adding ? 0.7 : 1 },
              ]}
            >
              {adding ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={[styles.submitBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  {t("addMember")}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showRolesModal} transparent animationType="slide" onRequestClose={() => setShowRolesModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.rolesModalContent, { backgroundColor: theme.card }]}>
            <View style={styles.addModalHeader}>
              <Pressable onPress={() => setShowRolesModal(false)} hitSlop={8}>
                <Feather name="x" size={22} color={theme.textSecondary} />
              </Pressable>
              <Text style={[styles.addModalTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {t("rolesAndPermissions")}
              </Text>
              <View style={{ width: 22 }} />
            </View>

            <View style={styles.roleTabRow}>
              {([
                { key: "primary" as const, label: `${t("primaryAdmin")} (You)` },
                { key: "admin" as const, label: t("admin") },
                { key: "employee" as const, label: t("employee") },
              ]).map((role) => (
                <Pressable
                  key={role.key}
                  onPress={() => setSelectedRoleTab(role.key)}
                  style={[
                    styles.roleTab,
                    {
                      borderColor: selectedRoleTab === role.key ? theme.tint : theme.border,
                      backgroundColor: selectedRoleTab === role.key ? theme.tint + "12" : "transparent",
                    },
                  ]}
                >
                  <Text style={[
                    styles.roleTabText,
                    {
                      color: selectedRoleTab === role.key ? theme.tint : theme.textSecondary,
                      fontFamily: selectedRoleTab === role.key ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}>
                    {role.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {currentPerm.info ? (
              <View style={[styles.permInfoBanner, { backgroundColor: theme.tint + "12" }]}>
                <Feather name="info" size={14} color={theme.tint} />
                <Text style={[styles.permInfoText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                  {currentPerm.info}
                </Text>
              </View>
            ) : null}

            <View style={[styles.permCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.permTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {t("permissions")}
              </Text>
              {currentPerm.permissions.map((p, i) => (
                <View key={i} style={styles.permRow}>
                  <Feather name="check-circle" size={18} color="#10B981" />
                  <Text style={[styles.permText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>{p}</Text>
                </View>
              ))}
              {currentPerm.restrictions.length > 0 && (
                <>
                  <Text style={[styles.permTitle, { color: theme.text, fontFamily: "Inter_600SemiBold", marginTop: 16 }]}>
                    {t("restrictions")}
                  </Text>
                  {currentPerm.restrictions.map((r, i) => (
                    <View key={i} style={styles.permRow}>
                      <Feather name="x-circle" size={18} color={theme.expense} />
                      <Text style={[styles.permText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>{r}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>

            <Pressable
              onPress={() => setShowRolesModal(false)}
              style={({ pressed }) => [
                styles.gotItBtn,
                { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[styles.gotItBtnText, { fontFamily: "Inter_700Bold" }]}>{t("okGotIt")}</Text>
            </Pressable>
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
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18 },
  scrollContent: { paddingTop: 0 },
  infoBanner: {
    padding: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  infoBannerContent: { gap: 4 },
  infoBannerTitle: { fontSize: 15, color: "#FFF" },
  infoBannerSubtitle: { fontSize: 13 },
  hierarchySection: { padding: 20, alignItems: "center" },
  hierarchyTitle: { fontSize: 17, textAlign: "center" },
  hierarchySubtitle: { fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: 24 },
  hierarchy: { alignItems: "center", gap: 12 },
  hierarchyNode: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  hierarchyNodeText: { fontSize: 14 },
  hierarchyLine: { height: 24, alignItems: "center" },
  hLine: { width: 2, flex: 1 },
  hierarchyChildren: { flexDirection: "row", gap: 16 },
  hierarchyChild: {
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    minWidth: 130,
  },
  hierarchyChildLabel: { fontSize: 14 },
  hierarchyChildDesc: { fontSize: 11 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  memberInitial: { fontSize: 16 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15 },
  memberEmail: { fontSize: 12, marginTop: 1 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleBadgeText: { fontSize: 11 },
  viewRolesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  viewRolesText: { flex: 1, fontSize: 14 },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addTeamBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  addTeamBtnText: { color: "#FFF", fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  addModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 14,
  },
  addModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  addModalTitle: { fontSize: 17, flex: 1, textAlign: "center" },
  addInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  roleToggle: { flexDirection: "row", gap: 8 },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  roleBtnText: { fontSize: 14 },
  addError: { fontSize: 13, textAlign: "center" },
  submitBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  submitBtnText: { color: "#FFF", fontSize: 15 },
  rolesModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  roleTabRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  roleTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
  },
  roleTabText: { fontSize: 11 },
  permInfoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  permInfoText: { fontSize: 13, flex: 1 },
  permCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  permTitle: { fontSize: 14, marginBottom: 12 },
  permRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  permText: { fontSize: 14, flex: 1, lineHeight: 20 },
  gotItBtn: { paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  gotItBtnText: { color: "#FFF", fontSize: 15 },
});
