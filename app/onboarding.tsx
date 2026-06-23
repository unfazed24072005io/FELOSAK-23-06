import { useAuth } from "@/context/AuthContext";
import { auth } from "@/config/firebase";
import favicon from '@/assets/images/favicon.png';
import { doc, setDoc, collection, query, where, getDocs, addDoc, updateDoc } from "firebase/firestore";
import { Image } from "react-native";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { db } from "@/config/firebase";

const STORAGE_KEY = "user_profile_data";
const ORGANIZATION_KEY = "user_organization_data";

const COUNTRY_CODES = [
  { code: "+1", country: "US", name: "United States" },
  { code: "+44", country: "UK", name: "United Kingdom" },
  { code: "+91", country: "IN", name: "India" },
  { code: "+61", country: "AU", name: "Australia" },
  { code: "+86", country: "CN", name: "China" },
  { code: "+81", country: "JP", name: "Japan" },
  { code: "+49", country: "DE", name: "Germany" },
  { code: "+33", country: "FR", name: "France" },
  { code: "+39", country: "IT", name: "Italy" },
  { code: "+34", country: "ES", name: "Spain" },
  { code: "+55", country: "BR", name: "Brazil" },
  { code: "+20", country: "EG", name: "Egypt" },
  { code: "+971", country: "AE", name: "UAE" },
  { code: "+966", country: "SA", name: "Saudi Arabia" },
];

const INDUSTRIES = [
  "Accounting firm",
  "Administrative and support services",
  "Agriculture",
  "Arts & recreational services",
  "Contracting-construction",
  "Contracting-other",
  "Consulting",
  "Education & training",
  "Financial services",
  "Food & beverages",
  "Healthcare",
  "Hospitality & tourism",
  "Information Technology",
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showAccountFields, setShowAccountFields] = useState(false);

  // Stage 1: Personal Profile
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [description, setDescription] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Stage 2: Organization
  const [organizationName, setOrganizationName] = useState("");
  const [industry, setIndustry] = useState("");
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);

  // Account Creation
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleNext = () => {
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) {
        Alert.alert("Error", "Please enter your first and last name");
        return;
      }
      if (!phoneNumber.trim()) {
        Alert.alert("Error", "Please enter your phone number");
        return;
      }
      setStep(2);
      Haptics.selectionAsync();
    } else if (step === 2) {
      if (!organizationName.trim() || !industry) {
        Alert.alert("Error", "Please enter organization name and industry");
        return;
      }
      setShowAccountFields(true);
      Haptics.selectionAsync();
    }
  };

  const handleCreateAccount = async () => {
  if (!email.trim() || !password.trim()) {
    Alert.alert("Error", "Please enter email and password");
    return;
  }
  if (password !== confirmPassword) {
    Alert.alert("Error", "Passwords do not match");
    return;
  }
  if (password.length < 6) {
    Alert.alert("Error", "Password must be at least 6 characters");
    return;
  }

  setLoading(true);
  try {
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const fullPhoneNumber = `${selectedCountryCode.code}${phoneNumber.trim()}`;
    const normalizedEmail = email.trim().toLowerCase();
    
    console.log("🔵 Registering user via AuthContext:", normalizedEmail);
    
    // ✅ USE THE REGISTER FUNCTION FROM AUTHCONTEXT
    await register(normalizedEmail, password, fullName);
    
    console.log("✅ User registered successfully");
    
    // Save profile data to AsyncStorage (optional - for app-specific data)
    const profileData = {
      name: fullName,
      phoneNumber: fullPhoneNumber,
      address: "",
      taxId: "",
      bankAccount: "",
      paymentLink: "",
      photo: "",
    };
    
    const orgData = {
      organizationName: organizationName.trim(),
      industry: industry,
    };
    
    // Option 2: Get the current user from auth
const currentUser = auth.currentUser;
if (currentUser) {
  await AsyncStorage.setItem(`${STORAGE_KEY}_${currentUser.uid}`, JSON.stringify(profileData));
  await AsyncStorage.setItem(`${ORGANIZATION_KEY}_${currentUser.uid}`, JSON.stringify(orgData));
}
    
    console.log("✅ All done! Redirecting...");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)");
    
  } catch (error: any) {
    console.error("❌ Error creating account:", error);
    Alert.alert("Error", error.message || "Failed to create account");
  } finally {
    setLoading(false);
  }
};
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  if (showAccountFields) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={styles.logoContainer}>
          <Image source={favicon} style={styles.headerLogo} resizeMode="contain" />
        </View>
        
        <Text style={styles.headerTitle}>Create Your Account</Text>
        <Text style={styles.headerSubtitle}>Almost there! Set up your login credentials</Text>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="•••••••• (min. 6 characters)"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password *</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <Pressable onPress={() => setShowAccountFields(false)} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#3B82F6" />
          </Pressable>
          
          <Pressable onPress={handleCreateAccount} disabled={loading} style={[styles.nextButton, styles.nextButtonFull]}>
            <LinearGradient colors={["#3B82F6", "#2563EB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientButton}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.nextButtonText}>Create Account</Text>}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.logoContainer}>
        <Image source={favicon} style={styles.headerLogo} resizeMode="contain" />
      </View>

      <View style={styles.stepContainer}>
        <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
        <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
        <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {step === 1 ? (
            <>
              <Text style={styles.headerTitle}>Set up your personal profile</Text>
              <Text style={styles.headerSubtitle}>Help us tailor Felosak to your needs</Text>

              <View style={styles.form}>
                <View style={styles.row}>
                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <Text style={styles.label}>First Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Enter your first name"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <Text style={styles.label}>Last Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Enter your last name"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>What best describes you?</Text>
                  <TextInput
                    style={styles.input}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="e.g., Business Owner, Freelancer, Accountant"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Phone Number *</Text>
                  <View style={styles.phoneContainer}>
                    <Pressable
                      onPress={() => setShowCountryPicker(true)}
                      style={styles.countryCodeButton}
                    >
                      <Text style={styles.countryCodeText}>{selectedCountryCode.code}</Text>
                      <Feather name="chevron-down" size={16} color="#6B7280" />
                    </Pressable>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      placeholder="1234567890"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.headerTitle}>Set up a new organization</Text>
              <Text style={styles.headerSubtitle}>Tell us about your business</Text>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Organization Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={organizationName}
                    onChangeText={setOrganizationName}
                    placeholder="Enter your organization name"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Industry *</Text>
                  <Pressable
                    onPress={() => setShowIndustryDropdown(!showIndustryDropdown)}
                    style={styles.dropdownButton}
                  >
                    <Text style={[styles.dropdownText, !industry && { color: "#9CA3AF" }]}>
                      {industry || "Select your industry"}
                    </Text>
                    <Feather name="chevron-down" size={20} color="#6B7280" />
                  </Pressable>
                  
                  {showIndustryDropdown && (
                    <ScrollView style={styles.dropdownList} nestedScrollEnabled={true}>
                      {INDUSTRIES.map((ind) => (
                        <Pressable
                          key={ind}
                          onPress={() => {
                            setIndustry(ind);
                            setShowIndustryDropdown(false);
                          }}
                          style={styles.dropdownItem}
                        >
                          <Text style={styles.dropdownItemText}>{ind}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.buttonContainer}>
        {step === 2 && (
          <Pressable onPress={() => setStep(1)} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#3B82F6" />
          </Pressable>
        )}
        
        <Pressable
          onPress={handleNext}
          disabled={loading}
          style={[styles.nextButton, step === 2 && styles.nextButtonFull]}
        >
          <LinearGradient
            colors={["#3B82F6", "#2563EB"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <Text style={styles.nextButtonText}>
              {step === 1 ? "Next" : "Continue"}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Country Code Picker Modal */}
      <Modal
        visible={showCountryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.countryPickerModal, { backgroundColor: "#FFFFFF" }]}>
            <View style={styles.countryPickerHeader}>
              <Text style={[styles.countryPickerTitle, { fontFamily: "Inter_700Bold" }]}>
                Select Country Code
              </Text>
              <Pressable onPress={() => setShowCountryPicker(false)}>
                <Feather name="x" size={24} color="#6B7280" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {COUNTRY_CODES.map((country) => (
                <Pressable
                  key={country.code}
                  onPress={() => {
                    setSelectedCountryCode(country);
                    setShowCountryPicker(false);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.countryOption,
                    {
                      backgroundColor: selectedCountryCode.code === country.code ? "#3B82F620" : "transparent",
                    },
                  ]}
                >
                  <Text style={styles.countryOptionText}>
                    {country.name} ({country.code})
                  </Text>
                  {selectedCountryCode.code === country.code && (
                    <Feather name="check" size={18} color="#3B82F6" />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  logoContainer: { alignItems: "center"},
  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    paddingHorizontal: 60,
  },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#E5E7EB" },
  stepDotActive: { backgroundColor: "#3B82F6", width: 14, height: 14, borderRadius: 7 },
  stepLine: { flex: 1, height: 2, backgroundColor: "#E5E7EB", marginHorizontal: 8 },
  stepLineActive: { backgroundColor: "#3B82F6" },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 30 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#111827", marginBottom: 8, textAlign: "center" },
  headerSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#6B7280", textAlign: "center", marginBottom: 40 },
  form: { gap: 20 },
  row: { flexDirection: "row", gap: 12 },
  inputContainer: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#374151" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  phoneContainer: {
    flexDirection: "row",
    gap: 8,
  },
  countryCodeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#F9FAFB",
    minWidth: 80,
    gap: 8,
  },
  countryCodeText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#111827",
  },
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#F9FAFB",
  },
  dropdownText: { fontSize: 16, fontFamily: "Inter_400Regular", color: "#111827" },
  dropdownList: { maxHeight: 200, backgroundColor: "#FFFFFF", borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB", marginTop: 4 },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownItemText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#111827" },
  buttonContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    gap: 12,
  },
  backButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  nextButton: { flex: 1, borderRadius: 28, overflow: "hidden", marginBottom: 20 },
  nextButtonFull: { flex: 1 },
  gradientButton: { paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  nextButtonText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  headerLogo: { width: 120, height: 120, resizeMode: 'contain' },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  countryPickerModal: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    borderRadius: 20,
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  countryPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  countryPickerTitle: {
    fontSize: 18,
    color: "#111827",
  },
  countryOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  countryOptionText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#111827",
  },
});