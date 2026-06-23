// app/members.tsx - WITH PERMISSION SELECTOR FOR PASSWORD
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
  Platform,
  Pressable,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp, CashBook } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/config/firebase";

interface Member {
  id: string;
  email: string;
  role: "owner" | "editor" | "viewer";
  addedAt: Date;
  bookId: string;
  name?: string;
  userId?: string;
  status?: string;
}

export default function MembersScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const { activeBook } = useApp();
  
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [selectedRole, setSelectedRole] = useState<"editor" | "viewer">("viewer");
  const [inviting, setInviting] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  
  // Password protection states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [bookPassword, setBookPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [settingPassword, setSettingPassword] = useState(false);
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [showRemovePasswordConfirm, setShowRemovePasswordConfirm] = useState(false);
  
  // NEW: Password permission state
  const [passwordAccessLevel, setPasswordAccessLevel] = useState<"read" | "write">("read");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  const isOwner = activeBook?.role === "owner";

  // Load members function
  const loadMembers = async () => {
    if (!activeBook || !isOwner) {
      setLoading(false);
      return;
    }
    
    try {
      const q = query(collection(db, 'bookMembers'), where('bookId', '==', activeBook.id));
      const snapshot = await getDocs(q);
      const loadedMembers: Member[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status !== 'pending') {
          loadedMembers.push({
            id: doc.id,
            email: data.email,
            role: data.role,
            addedAt: data.addedAt?.toDate() || new Date(),
            bookId: data.bookId,
            name: data.name,
            userId: data.userId,
            status: data.status,
          });
        }
      });
      setMembers(loadedMembers);
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setLoading(false);
    }
  };

  // Check if book has password protection
  const checkPasswordProtection = async () => {
    if (!activeBook) return;
    
    try {
      const bookRef = doc(db, 'books', activeBook.id);
      const bookSnap = await getDoc(bookRef);
      
      if (bookSnap.exists()) {
        const bookData = bookSnap.data();
        const hasPassword = bookData.accessPassword && bookData.accessPassword.length > 0;
        setPasswordProtected(hasPassword);
        // Also load the access level if exists
        if (bookData.passwordAccessLevel) {
          setPasswordAccessLevel(bookData.passwordAccessLevel);
        }
      }
    } catch (error) {
      console.error("Error checking password protection:", error);
    }
  };

  // Set or update book password with permission level
  const handleSetPassword = async () => {
    console.log("🔐 === HANDLE SET PASSWORD CALLED ===");
    console.log("activeBook:", activeBook);
    console.log("activeBook.id:", activeBook?.id);
    console.log("Access Level:", passwordAccessLevel);
    
    if (!bookPassword.trim()) {
      Alert.alert("Error", "Please enter a password");
      return;
    }
    
    if (bookPassword.length < 4) {
      Alert.alert("Error", "Password must be at least 4 characters");
      return;
    }
    
    if (bookPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    
    setSettingPassword(true);
    try {
      const bookRef = doc(db, 'books', activeBook!.id);
      
      await updateDoc(bookRef, {
        accessPassword: bookPassword,
        passwordProtected: true,
        passwordAccessLevel: passwordAccessLevel,
        passwordSetAt: new Date(),
        passwordSetBy: user?.id,
      });
      
      console.log("✅ Password set successfully for book:", activeBook!.id);
      console.log("✅ Access level:", passwordAccessLevel);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Success", 
        `Book password has been set!\n\nPassword: ${bookPassword}\nAccess: ${passwordAccessLevel === "write" ? "Read & Write" : "Read Only"}`
      );
      
      setBookPassword("");
      setConfirmPassword("");
      setShowPasswordModal(false);
      setPasswordProtected(true);
      
    } catch (error: any) {
      console.error("❌ Error setting password:", error);
      Alert.alert("Error", error.message || "Failed to set password");
    } finally {
      setSettingPassword(false);
    }
  };

  // Remove password protection
  const handleRemovePassword = async () => {
    setSettingPassword(true);
    try {
      const bookRef = doc(db, 'books', activeBook!.id);
      
      await updateDoc(bookRef, {
        accessPassword: null,
        passwordProtected: false,
        passwordAccessLevel: null,
      });
      
      console.log("✅ Password removed for book:", activeBook!.id);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Password protection removed.");
      
      setShowRemovePasswordConfirm(false);
      setPasswordProtected(false);
      setPasswordAccessLevel("read");
      
    } catch (error: any) {
      console.error("❌ Error removing password:", error);
      Alert.alert("Error", error.message || "Failed to remove password");
    } finally {
      setSettingPassword(false);
    }
  };

  // Load members and check password on mount
  useEffect(() => {
    loadMembers();
    checkPasswordProtection();
  }, [activeBook, isOwner]);

  const handleCreateAndInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert("Error", "Please enter an email address");
      return;
    }
    
    if (!inviteEmail.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setInviting(true);
    try {
      const normalizedEmail = inviteEmail.toLowerCase().trim();
      
      console.log("📧 Creating invitation for:", normalizedEmail);
      
      const existingInviteQuery = query(
        collection(db, 'pendingInvites'),
        where('email', '==', normalizedEmail),
        where('bookId', '==', activeBook!.id)
      );
      const existingInvite = await getDocs(existingInviteQuery);
      
      if (!existingInvite.empty) {
        Alert.alert("Info", "An invitation has already been sent to this email");
        setInviting(false);
        return;
      }
      
      await addDoc(collection(db, 'pendingInvites'), {
        email: normalizedEmail,
        bookId: activeBook!.id,
        bookName: activeBook!.name,
        role: selectedRole,
        invitedBy: user?.id,
        invitedByEmail: user?.email,
        invitedAt: new Date(),
        status: 'pending',
      });
      
      console.log("✅ Invitation created for book:", activeBook!.name);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      let message = `${inviteEmail} has been invited to join "${activeBook!.name}".\n\n`;
      if (passwordProtected) {
        message += `⚠️ This book is password protected. Share the book password with them for access.\n\nBook Password: (the one you set in Book Settings)`;
      } else {
        message += `They will see this book when they sign up.`;
      }
      
      Alert.alert("Invitation Sent", message);
      
      setInviteEmail("");
      setInviteName("");
      setShowInviteModal(false);
      
    } catch (error: any) {
      console.error("Error creating invitation:", error);
      Alert.alert("Error", error.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleInviteExisting = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert("Error", "Please enter an email address");
      return;
    }
    
    if (!inviteEmail.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }
    
    setInviting(true);
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', inviteEmail.toLowerCase().trim())
      );
      const userSnapshot = await getDocs(usersQuery);
      
      if (userSnapshot.empty) {
        Alert.alert("Error", "User not found. Please ask them to sign up first.");
        setInviting(false);
        return;
      }
      
      const userDoc = userSnapshot.docs[0];
      const userId = userDoc.id;
      const userName = userDoc.data().displayName;
      
      const existingQuery = query(
        collection(db, 'bookMembers'),
        where('bookId', '==', activeBook!.id),
        where('email', '==', inviteEmail.toLowerCase().trim())
      );
      const existingSnapshot = await getDocs(existingQuery);
      if (!existingSnapshot.empty) {
        Alert.alert("Error", "This user is already a member of this book");
        setInviting(false);
        return;
      }
      
      await addDoc(collection(db, 'bookMembers'), {
        bookId: activeBook!.id,
        email: inviteEmail.toLowerCase().trim(),
        role: selectedRole,
        addedAt: new Date(),
        addedBy: user?.id,
        userId: userId,
        name: userName,
        status: 'active',
      });
      
      await addDoc(collection(db, 'userBooks'), {
        userId: userId,
        bookId: activeBook!.id,
        role: selectedRole,
        addedAt: new Date(),
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", `${inviteEmail} has been added to the book!`);
      setInviteEmail("");
      setInviteName("");
      setShowInviteModal(false);
      await loadMembers();
      
    } catch (error: any) {
      console.error("Error inviting member:", error);
      Alert.alert("Error", error.message || "Failed to invite member");
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (member: Member, newRole: "editor" | "viewer") => {
    try {
      await updateDoc(doc(db, 'bookMembers', member.id), { role: newRole });
      
      if (member.userId) {
        const userBooksQuery = query(
          collection(db, 'userBooks'),
          where('userId', '==', member.userId),
          where('bookId', '==', activeBook!.id)
        );
        const snapshot = await getDocs(userBooksQuery);
        if (!snapshot.empty) {
          await updateDoc(snapshot.docs[0].ref, { role: newRole });
        }
      }
      
      setMembers(members.map(m => m.id === member.id ? { ...m, role: newRole } : m));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", `Role updated to ${newRole}`);
    } catch (error) {
      console.error("Error updating role:", error);
      Alert.alert("Error", "Failed to update role");
    }
  };

  const handleRemoveMember = async (member: Member) => {
    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${member.email} from this book?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'bookMembers', member.id));
              
              if (member.userId) {
                const userBooksQuery = query(
                  collection(db, 'userBooks'),
                  where('userId', '==', member.userId),
                  where('bookId', '==', activeBook!.id)
                );
                const snapshot = await getDocs(userBooksQuery);
                if (!snapshot.empty) {
                  await deleteDoc(snapshot.docs[0].ref);
                }
              }
              
              setMembers(members.filter(m => m.id !== member.id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Success", "Member removed successfully");
            } catch (error) {
              console.error("Error removing member:", error);
              Alert.alert("Error", "Failed to remove member");
            }
          }
        }
      ]
    );
  };

  const MemberCard = ({ member }: { member: Member }) => {
    const roleColors = {
      owner: "#3B82F6",
      editor: "#10B981",
      viewer: "#F59E0B"
    };
    
    return (
      <View style={[styles.memberCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.memberAvatar}>
          <Feather name="user" size={20} color={theme.textSecondary} />
        </View>
        <View style={styles.memberInfo}>
          <Text style={[styles.memberEmail, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
            {member.email}
          </Text>
          {member.name && (
            <Text style={[styles.memberName, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {member.name}
            </Text>
          )}
        </View>
        <View style={styles.memberActions}>
          <Pressable
            onPress={() => {
              setSelectedMember(member);
              setShowRoleModal(true);
            }}
            style={[styles.roleBadge, { backgroundColor: roleColors[member.role] + "20" }]}
          >
            <Text style={[styles.roleText, { color: roleColors[member.role], fontFamily: "Inter_500Medium" }]}>
              {member.role === "owner" ? "Owner" : member.role === "editor" ? "Editor" : "Viewer"}
            </Text>
            {member.role !== "owner" && <Feather name="chevron-down" size={14} color={roleColors[member.role]} />}
          </Pressable>
          {member.role !== "owner" && (
            <Pressable onPress={() => handleRemoveMember(member)} style={styles.removeBtn}>
              <Feather name="x" size={18} color={theme.expense} />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  if (!activeBook) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }]}>
        <Feather name="users" size={44} color={theme.textSecondary} />
        <Text style={[styles.emptyText, { color: theme.textSecondary, marginTop: 16 }]}>
          Select a book to manage members
        </Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { marginTop: 20 }]}>
          <Text style={{ color: theme.tint }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!isOwner) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }]}>
        <Feather name="lock" size={44} color={theme.textSecondary} />
        <Text style={[styles.emptyText, { color: theme.textSecondary, marginTop: 16, textAlign: "center" }]}>
          Only the book owner can manage members
        </Text>
        <Text style={[styles.emptySubtext, { color: theme.textSecondary, marginTop: 8, textAlign: "center" }]}>
          Contact the owner to change member permissions
        </Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { marginTop: 20 }]}>
          <Text style={{ color: theme.tint }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
          Members
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={[styles.bookName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
        {activeBook.name}
      </Text>

      {/* Book Password Section */}
      <View style={[styles.passwordSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.passwordSectionHeader}>
          <Feather name="shield" size={20} color={passwordProtected ? "#10B981" : theme.textSecondary} />
          <Text style={[styles.passwordSectionTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            Book Password Protection
          </Text>
        </View>
        
        <Text style={[styles.passwordSectionDesc, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          {passwordProtected 
            ? `This book has a password. Members will get ${passwordAccessLevel === "write" ? "Read & Write" : "Read Only"} access.`
            : "Set a password so members can access this book using their email + this password."}
        </Text>
        
        {!passwordProtected ? (
          <Pressable
            onPress={() => setShowPasswordModal(true)}
            style={[styles.setPasswordBtn, { borderColor: theme.tint }]}
          >
            <Feather name="lock" size={16} color={theme.tint} />
            <Text style={[styles.setPasswordBtnText, { color: theme.tint, fontFamily: "Inter_500Medium" }]}>
              Set Book Password
            </Text>
          </Pressable>
        ) : (
          <>
            {/* Show current access level when password is set */}
            <View style={styles.currentAccessContainer}>
              <Text style={[styles.currentAccessLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                Current Access Level:
              </Text>
              <View style={[styles.currentAccessBadge, { backgroundColor: passwordAccessLevel === "write" ? "#10B98120" : "#F59E0B20" }]}>
                <Feather name={passwordAccessLevel === "write" ? "edit-2" : "eye"} size={14} color={passwordAccessLevel === "write" ? "#10B981" : "#F59E0B"} />
                <Text style={[styles.currentAccessText, { color: passwordAccessLevel === "write" ? "#10B981" : "#F59E0B", fontFamily: "Inter_500Medium" }]}>
                  {passwordAccessLevel === "write" ? "Read & Write" : "Read Only"}
                </Text>
              </View>
            </View>
            
            <Pressable
              onPress={() => setShowRemovePasswordConfirm(true)}
              style={[styles.removePasswordBtn, { borderColor: theme.expense }]}
            >
              <Feather name="unlock" size={16} color={theme.expense} />
              <Text style={[styles.removePasswordBtnText, { color: theme.expense, fontFamily: "Inter_500Medium" }]}>
                Remove Password
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.membersList, { paddingBottom: bottomPad + 20 }]}>
          <View style={[styles.memberCard, { backgroundColor: theme.card, borderColor: theme.tint, borderWidth: 2 }]}>
            <View style={styles.memberAvatar}>
              <Feather name="user" size={20} color={theme.tint} />
            </View>
            <View style={styles.memberInfo}>
              <Text style={[styles.memberEmail, { color: theme.text, fontFamily: "Inter_500Medium" }]}>
                {user?.email || "You"} <Text style={{ color: theme.tint }}>(You - Owner)</Text>
              </Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: "#3B82F6" + "20" }]}>
              <Text style={[styles.roleText, { color: "#3B82F6", fontFamily: "Inter_500Medium" }]}>Owner</Text>
            </View>
          </View>
          
          {members.map(member => (
            <MemberCard key={member.id} member={member} />
          ))}
          
          {members.length === 0 && (
            <View style={styles.emptyContainer}>
              <Feather name="users" size={44} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No members yet
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                Invite team members to collaborate
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Set Password Modal - WITH PERMISSION SELECTOR */}
      <Modal visible={showPasswordModal} transparent animationType="slide" onRequestClose={() => setShowPasswordModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                Set Book Password
              </Text>
              <Pressable onPress={() => setShowPasswordModal(false)} hitSlop={8}>
                <Feather name="x" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>
            
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Set a password for this book. Members can access it using their email + this password.
            </Text>
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              placeholder="Enter book password"
              placeholderTextColor={theme.textSecondary}
              value={bookPassword}
              onChangeText={setBookPassword}
              autoCapitalize="none"
            />
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              placeholder="Confirm password"
              placeholderTextColor={theme.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
            />
            
            {/* NEW: Permission Selector */}
            <View style={styles.permissionSection}>
              <Text style={[styles.permissionLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
                Member Access Level
              </Text>
              <View style={styles.permissionRow}>
                <Pressable
                  onPress={() => setPasswordAccessLevel("read")}
                  style={[
                    styles.permissionOption,
                    passwordAccessLevel === "read" && { backgroundColor: theme.tint + "20", borderColor: theme.tint },
                    { borderColor: theme.border }
                  ]}
                >
                  <Feather name="eye" size={18} color={passwordAccessLevel === "read" ? theme.tint : theme.textSecondary} />
                  <Text style={[styles.permissionOptionText, { color: passwordAccessLevel === "read" ? theme.tint : theme.textSecondary }]}>
                    Read Only
                  </Text>
                  <Text style={[styles.permissionOptionDesc, { color: theme.textSecondary }]}>
                    Can view, cannot edit
                  </Text>
                </Pressable>
                
                <Pressable
                  onPress={() => setPasswordAccessLevel("write")}
                  style={[
                    styles.permissionOption,
                    passwordAccessLevel === "write" && { backgroundColor: theme.tint + "20", borderColor: theme.tint },
                    { borderColor: theme.border }
                  ]}
                >
                  <Feather name="edit-2" size={18} color={passwordAccessLevel === "write" ? theme.tint : theme.textSecondary} />
                  <Text style={[styles.permissionOptionText, { color: passwordAccessLevel === "write" ? theme.tint : theme.textSecondary }]}>
                    Read & Write
                  </Text>
                  <Text style={[styles.permissionOptionDesc, { color: theme.textSecondary }]}>
                    Can view, add, edit, delete
                  </Text>
                </Pressable>
              </View>
            </View>
            
            <Pressable
              onPress={handleSetPassword}
              disabled={settingPassword}
              style={[styles.setupPasswordBtn, { backgroundColor: theme.tint, opacity: settingPassword ? 0.7 : 1 }]}
            >
              {settingPassword ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={[styles.setupPasswordBtnText, { color: "#FFF", fontFamily: "Inter_600SemiBold" }]}>
                  Set Password
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Remove Password Confirmation Modal */}
      <Modal visible={showRemovePasswordConfirm} transparent animationType="fade" onRequestClose={() => setShowRemovePasswordConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              Remove Password Protection
            </Text>
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
              Are you sure you want to remove the password? Members will no longer be able to access this book with a password.
            </Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowRemovePasswordConfirm(false)} style={[styles.modalBtn, { backgroundColor: theme.surface }]}>
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleRemovePassword} style={[styles.modalBtn, { backgroundColor: theme.expense }]}>
                <Text style={[styles.modalBtnText, { color: "#FFF" }]}>Remove</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Invite Modal */}
      <Modal visible={showInviteModal} transparent animationType="slide" onRequestClose={() => setShowInviteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
                Invite Member
              </Text>
              <Pressable onPress={() => setShowInviteModal(false)} hitSlop={8}>
                <Feather name="x" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              placeholder="Email address"
              placeholderTextColor={theme.textSecondary}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
              placeholder="Name (optional)"
              placeholderTextColor={theme.textSecondary}
              value={inviteName}
              onChangeText={setInviteName}
            />
            
            <View style={styles.roleSelector}>
              <Text style={[styles.roleSelectorLabel, { color: theme.textSecondary }]}>Role:</Text>
              <Pressable
                onPress={() => setSelectedRole("viewer")}
                style={[styles.roleOption, selectedRole === "viewer" && styles.roleOptionSelected, { borderColor: theme.border }]}
              >
                <Text style={[styles.roleOptionText, { color: selectedRole === "viewer" ? "#3B82F6" : theme.textSecondary }]}>
                  Viewer (Read only)
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSelectedRole("editor")}
                style={[styles.roleOption, selectedRole === "editor" && styles.roleOptionSelected, { borderColor: theme.border }]}
              >
                <Text style={[styles.roleOptionText, { color: selectedRole === "editor" ? "#3B82F6" : theme.textSecondary }]}>
                  Editor (Read & Write)
                </Text>
              </Pressable>
            </View>
            
            {passwordProtected && (
              <View style={[styles.passwordWarning, { backgroundColor: "#F59E0B20", borderColor: "#F59E0B" }]}>
                <Feather name="alert-triangle" size={14} color="#F59E0B" />
                <Text style={[styles.passwordWarningText, { color: "#F59E0B", fontFamily: "Inter_400Regular" }]}>
                  This book is password protected. Share the book password with invited members.
                </Text>
              </View>
            )}
            
            <Pressable
              onPress={handleCreateAndInvite}
              disabled={inviting}
              style={[styles.inviteSubmitBtn, { backgroundColor: theme.tint, opacity: inviting ? 0.7 : 1 }]}
            >
              {inviting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={[styles.inviteSubmitText, { color: "#FFF", fontFamily: "Inter_600SemiBold" }]}>
                  Send Invitation
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Change Role Modal */}
      <Modal visible={showRoleModal} transparent animationType="fade" onRequestClose={() => setShowRoleModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              Change Role
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              {selectedMember?.email}
            </Text>
            
            <Pressable
              onPress={() => {
                if (selectedMember) handleUpdateRole(selectedMember, "viewer");
                setShowRoleModal(false);
              }}
              style={[styles.roleSelectOption]}
            >
              <Text style={[styles.roleSelectText, { color: theme.text }]}>Viewer</Text>
              <Text style={[styles.roleSelectDesc, { color: theme.textSecondary }]}>Can view transactions and reports, cannot edit</Text>
            </Pressable>
            
            <Pressable
              onPress={() => {
                if (selectedMember) handleUpdateRole(selectedMember, "editor");
                setShowRoleModal(false);
              }}
              style={[styles.roleSelectOption]}
            >
              <Text style={[styles.roleSelectText, { color: theme.text }]}>Editor</Text>
              <Text style={[styles.roleSelectDesc, { color: theme.textSecondary }]}>Can add, edit, and delete transactions</Text>
            </Pressable>
            
            <Pressable
              onPress={() => setShowRoleModal(false)}
              style={[styles.cancelBtn, { borderColor: theme.border }]}
            >
              <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 24, flex: 1, textAlign: "center" },
  inviteBtn: { padding: 4 },
  bookName: { fontSize: 14, textAlign: "center", marginBottom: 16, opacity: 0.7 },
  membersList: { paddingHorizontal: 20, gap: 12 },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  memberInfo: { flex: 1 },
  memberEmail: { fontSize: 14 },
  memberName: { fontSize: 12, marginTop: 2 },
  memberActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 4 },
  roleText: { fontSize: 12 },
  removeBtn: { padding: 4 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, textAlign: "center" },
  emptySubtext: { fontSize: 13, textAlign: "center" },
  backBtn: { padding: 8 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { width: "100%", maxWidth: 400, borderRadius: 24, padding: 20, gap: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 20 },
  modalSubtitle: { fontSize: 14, marginTop: -8 },
  modalMessage: { fontSize: 14, lineHeight: 20 },
  modalActions: { flexDirection: "row", gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  modalBtnText: { fontSize: 15 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  roleSelector: { gap: 8 },
  roleSelectorLabel: { fontSize: 14, marginBottom: 4 },
  roleOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  roleOptionSelected: { borderColor: "#3B82F6", backgroundColor: "#3B82F620" },
  roleOptionText: { fontSize: 14 },
  inviteSubmitBtn: { paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  inviteSubmitText: { fontSize: 16 },
  roleSelectOption: { padding: 14, borderRadius: 12, gap: 4 },
  roleSelectText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  roleSelectDesc: { fontSize: 12 },
  cancelBtn: { paddingVertical: 12, borderRadius: 12, alignItems: "center", borderWidth: 1, marginTop: 8 },
  cancelBtnText: { fontSize: 15 },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 8 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, marginHorizontal: 12 },
  backButton: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  backButtonText: { fontSize: 14 },
  // Password section styles
  passwordSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  passwordSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  passwordSectionTitle: {
    fontSize: 16,
  },
  passwordSectionDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  setPasswordBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  setPasswordBtnText: {
    fontSize: 14,
  },
  removePasswordBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  removePasswordBtnText: {
    fontSize: 14,
  },
  setupPasswordBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  setupPasswordBtnText: {
    fontSize: 16,
  },
  passwordWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  passwordWarningText: {
    fontSize: 12,
    flex: 1,
  },
  // NEW: Permission selector styles
  permissionSection: {
    marginTop: 8,
    gap: 12,
  },
  permissionLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  permissionRow: {
    flexDirection: "row",
    gap: 12,
  },
  permissionOption: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  permissionOptionText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  permissionOptionDesc: {
    fontSize: 10,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
  currentAccessContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  currentAccessLabel: {
    fontSize: 13,
  },
  currentAccessBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  currentAccessText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
});