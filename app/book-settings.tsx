import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
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
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "@/context/AppContext";
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

export default function BookSettingsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { activeBook, updateBook, deleteBook, setActiveBook } = useApp();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [bookName, setBookName] = useState(activeBook?.name || "");
  const [renaming, setRenaming] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showRolesModal, setShowRolesModal] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const isOwner = !activeBook?.isCloud || activeBook?.role === "owner";
  const canManage = isOwner;

  useEffect(() => {
    if (activeBook?.isCloud && user) {
      const url = new URL(`/api/books/${activeBook.id}/members`, getApiUrl());
      fetch(url.toString(), { credentials: "include" })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setMembers(data))
        .catch(() => {});
    }
  }, [activeBook, user]);

  const handleRename = useCallback(async () => {
    if (!bookName.trim() || !activeBook) return;
    setRenaming(true);
    try {
      await updateBook(activeBook.id, { name: bookName.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_e) {
      Alert.alert("Error", "Failed to rename book");
    } finally {
      setRenaming(false);
    }
  }, [bookName, activeBook, updateBook]);

  const handleDeleteBook = useCallback(async () => {
    if (!activeBook) return;
    if (deleteConfirmText !== activeBook.name) return;
    try {
      await deleteBook(activeBook.id);
      setShowDeleteModal(false);
      setActiveBook(null);
      router.back();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_e) {
      Alert.alert("Error", "Failed to delete book");
    }
  }, [activeBook, deleteConfirmText, deleteBook, setActiveBook]);

  const roleColor = (role: string) => {
    if (role === "owner") return "#10B981";
    if (role === "editor") return "#F59E0B";
    return theme.textSecondary;
  };

  const roleBadgeLabel = (role: string) => {
    if (role === "owner") return t("primaryAdmin");
    if (role === "editor") return t("admin");
    return t("viewer");
  };

  if (!activeBook) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, borderBottomColor: theme.border, backgroundColor: theme.background },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
          {t("bookSettings")}
        </Text>
        {canManage ? (
          <Pressable onPress={() => setShowDeleteModal(true)} hitSlop={8}>
            <Feather name="more-vertical" size={20} color={theme.textSecondary} />
          </Pressable>
        ) : (
          <View style={{ width: 22 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}>
        <View style={[styles.renameSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.renameLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {t("cashbookName")}
          </Text>
          <View style={styles.renameRow}>
            <TextInput
              style={[styles.renameInput, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}
              value={bookName}
              onChangeText={setBookName}
              placeholder={t("bookName")}
              placeholderTextColor={theme.textSecondary}
            />
            <Pressable
              onPress={handleRename}
              disabled={renaming || !bookName.trim() || bookName.trim() === activeBook.name}
              style={({ pressed }) => [
                styles.renameBtn,
                {
                  borderColor: theme.tint,
                  opacity: pressed || renaming || !bookName.trim() || bookName.trim() === activeBook.name ? 0.5 : 1,
                },
              ]}
            >
              <Text style={[styles.renameBtnText, { color: theme.tint, fontFamily: "Inter_700Bold" }]}>
                {t("rename")}
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
          {t("generalBookSettings")}
        </Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <SettingsRow
            icon="grid"
            iconColor="#3B82F6"
            title={t("entryFieldSettings")}
            subtitle={t("entryFieldSettingsDesc")}
            theme={theme}
            onPress={() => Alert.alert(t("comingSoon"), t("comingSoonMessage"))}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow
            icon="user-check"
            iconColor="#3B82F6"
            title={t("editDataOperatorRole")}
            subtitle={t("editDataOperatorRoleDesc")}
            theme={theme}
            onPress={() => Alert.alert(t("comingSoon"), t("comingSoonMessage"))}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow
            icon="clock"
            iconColor="#3B82F6"
            title={t("bookActivity")}
            subtitle={t("bookActivityDesc")}
            theme={theme}
            onPress={() => Alert.alert(t("comingSoon"), t("comingSoonMessage"))}
          />
        </View>

        {activeBook.isCloud && (
          <>
            <View style={styles.membersHeader}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium", marginBottom: 0 }]}>
                {t("members")}
              </Text>
              <Pressable onPress={() => setShowRolesModal(true)}>
                <Text style={[styles.viewRolesLink, { color: theme.tint, fontFamily: "Inter_500Medium" }]}>
                  {t("viewRoles")}
                </Text>
              </Pressable>
            </View>

            {members.map((member) => (
              <View key={member.id} style={styles.memberRow}>
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
                  {member.userId === user?.id && (
                    <Pressable onPress={() => setShowRolesModal(true)}>
                      <Text style={[styles.viewPermLink, { color: theme.tint, fontFamily: "Inter_500Medium" }]}>
                        {t("viewYourRolePermissions")}
                      </Text>
                    </Pressable>
                  )}
                </View>
                <View style={[styles.roleBadge, { backgroundColor: roleColor(member.role) + "18", borderColor: roleColor(member.role) + "44" }]}>
                  <Text style={[styles.roleBadgeText, { color: roleColor(member.role), fontFamily: "Inter_500Medium" }]}>
                    {roleBadgeLabel(member.role)}
                  </Text>
                </View>
              </View>
            ))}

            <Pressable
              onPress={() => router.push({ pathname: "/business-team", params: { bookId: activeBook.id } })}
              style={({ pressed }) => [
                styles.addMembersBtn,
                { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Feather name="user-plus" size={18} color="#FFF" />
              <Text style={[styles.addMembersBtnText, { fontFamily: "Inter_700Bold" }]}>
                {t("addMembers")}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowDeleteModal(false)} hitSlop={8}>
                <Feather name="x" size={22} color={theme.textSecondary} />
              </Pressable>
              <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                {t("deleteBook")} {activeBook.name} ?
              </Text>
              <View style={{ width: 22 }} />
            </View>

            <View style={[styles.warningBanner, { backgroundColor: theme.expense + "12", borderColor: theme.expense + "33" }]}>
              <Feather name="alert-circle" size={18} color={theme.expense} />
              <Text style={[styles.warningText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                {t("deleteBookWarning")}
              </Text>
            </View>

            <Text style={[styles.confirmLabel, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
              {t("typeBookNameConfirm", { name: activeBook.name })}
            </Text>

            <View style={[styles.confirmInputWrap, { borderColor: theme.tint }]}>
              <Text style={[styles.confirmInputLabel, { color: theme.tint, fontFamily: "Inter_400Regular" }]}>
                {t("bookName")}
              </Text>
              <TextInput
                style={[styles.confirmInput, { color: theme.text, fontFamily: "Inter_400Regular" }]}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder={activeBook.name}
                placeholderTextColor={theme.textSecondary + "66"}
              />
            </View>

            <Pressable
              onPress={handleDeleteBook}
              disabled={deleteConfirmText !== activeBook.name}
              style={({ pressed }) => [
                styles.deleteBtn,
                {
                  backgroundColor: theme.expense,
                  opacity: pressed ? 0.85 : deleteConfirmText !== activeBook.name ? 0.4 : 1,
                },
              ]}
            >
              <Text style={[styles.deleteBtnText, { fontFamily: "Inter_700Bold" }]}>
                {t("delete").toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <RolesPermissionsModal
        visible={showRolesModal}
        onClose={() => setShowRolesModal(false)}
        theme={theme}
        t={t}
      />
    </View>
  );
}

function RolesPermissionsModal({
  visible,
  onClose,
  theme,
  t,
}: {
  visible: boolean;
  onClose: () => void;
  theme: typeof Colors.dark;
  t: (key: string) => string;
}) {
  const [activeRole, setActiveRole] = useState<"primary" | "admin" | "employee">("primary");

  const roles = [
    { key: "primary" as const, label: t("primaryAdmin"), suffix: " (You)" },
    { key: "admin" as const, label: t("admin"), suffix: "" },
    { key: "employee" as const, label: t("employee"), suffix: "" },
  ];

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

  const current = permissionsMap[activeRole];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.rolesModalContent, { backgroundColor: theme.card }]}>
          <View style={styles.rolesModalHeader}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={22} color={theme.textSecondary} />
            </Pressable>
            <Text style={[styles.rolesModalTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {t("rolesAndPermissions")}
            </Text>
            <View style={{ width: 22 }} />
          </View>

          <View style={styles.roleTabRow}>
            {roles.map((role) => (
              <Pressable
                key={role.key}
                onPress={() => setActiveRole(role.key)}
                style={[
                  styles.roleTab,
                  {
                    borderColor: activeRole === role.key ? theme.tint : theme.border,
                    backgroundColor: activeRole === role.key ? theme.tint + "12" : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.roleTabText,
                    {
                      color: activeRole === role.key ? theme.tint : theme.textSecondary,
                      fontFamily: activeRole === role.key ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {role.label}{role.suffix}
                </Text>
              </Pressable>
            ))}
          </View>

          {current.info ? (
            <View style={[styles.infoBanner, { backgroundColor: theme.tint + "12", borderColor: theme.tint + "33" }]}>
              <Feather name="info" size={14} color={theme.tint} />
              <Text style={[styles.infoText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                {current.info}
              </Text>
            </View>
          ) : null}

          <View style={[styles.permCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.permSectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              {t("permissions")}
            </Text>
            {current.permissions.map((perm, i) => (
              <View key={i} style={styles.permRow}>
                <Feather name="check-circle" size={18} color="#10B981" />
                <Text style={[styles.permText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                  {perm}
                </Text>
              </View>
            ))}

            {current.restrictions.length > 0 && (
              <>
                <Text style={[styles.permSectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold", marginTop: 16 }]}>
                  {t("restrictions")}
                </Text>
                {current.restrictions.map((rest, i) => (
                  <View key={i} style={styles.permRow}>
                    <Feather name="x-circle" size={18} color={theme.expense} />
                    <Text style={[styles.permText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>
                      {rest}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.gotItBtn,
              { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.gotItBtnText, { fontFamily: "Inter_700Bold" }]}>
              {t("okGotIt")}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function SettingsRow({
  icon,
  iconColor,
  title,
  subtitle,
  theme,
  onPress,
}: {
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
  theme: typeof Colors.dark;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.settingsRow, { opacity: pressed ? 0.6 : 1 }]}>
      <View style={[styles.rowIcon, { backgroundColor: iconColor + "18" }]}>
        <Feather name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: theme.text, fontFamily: "Inter_500Medium" }]}>{title}</Text>
        <Text style={[styles.rowSubtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={theme.textSecondary} />
    </Pressable>
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
  scrollContent: { paddingTop: 16 },
  renameSection: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  renameLabel: { fontSize: 12, marginBottom: 4 },
  renameRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  renameInput: { flex: 1, fontSize: 17, paddingVertical: 4 },
  renameBtn: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  renameBtnText: { fontSize: 13 },
  sectionLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 15 },
  rowSubtitle: { fontSize: 12, marginTop: 1 },
  membersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  viewRolesLink: { fontSize: 13 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  memberInitial: { fontSize: 16 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15 },
  memberEmail: { fontSize: 12, marginTop: 1 },
  viewPermLink: { fontSize: 12, marginTop: 2 },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: { fontSize: 11 },
  addMembersBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
  },
  addMembersBtnText: { color: "#FFF", fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, flex: 1, textAlign: "center" },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  warningText: { fontSize: 13, flex: 1, lineHeight: 19 },
  confirmLabel: { fontSize: 14, marginBottom: 12, lineHeight: 20 },
  confirmInputWrap: {
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 10,
    marginBottom: 20,
  },
  confirmInputLabel: { fontSize: 11 },
  confirmInput: { fontSize: 16, paddingVertical: 4 },
  deleteBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  deleteBtnText: { color: "#FFF", fontSize: 15 },
  rolesModalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  rolesModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  rolesModalTitle: { fontSize: 17, flex: 1, textAlign: "center" },
  roleTabRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  roleTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
  },
  roleTabText: { fontSize: 12 },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoText: { fontSize: 13, flex: 1 },
  permCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  permSectionTitle: { fontSize: 14, marginBottom: 12 },
  permRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  permText: { fontSize: 14, flex: 1, lineHeight: 20 },
  gotItBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  gotItBtnText: { color: "#FFF", fontSize: 15 },
});
