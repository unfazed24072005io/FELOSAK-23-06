import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { PinLockOverlay } from "@/components/PinLockOverlay";
import { BookModeProvider } from "@/context/BookModeContext"; // ADD THIS IMPORT
import { useColorScheme, ActivityIndicator, View } from "react-native";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const { user, loading } = useAuth();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!loading) {
      const inAuthGroup = segments[0] === "auth";
      const inOnboardingGroup = segments[0] === "onboarding";
      
      if (!user && !inAuthGroup && !inOnboardingGroup) {
        router.dismissAll();
        router.replace("/auth");
      } else if (user && inAuthGroup) {
        router.dismissAll();
        router.replace("/(tabs)");
      } else if (user && inOnboardingGroup) {
        router.dismissAll();
        router.replace("/(tabs)");
      }
      setIsReady(true);
    }
  }, [user, loading, segments]);

  if (loading || !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? "#0A1F15" : "#F7F5F0" }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: isDark ? "#0A1F15" : "#F7F5F0",
        },
      }}
    >
      {/* Auth screen - shown when no user */}
      <Stack.Screen name="auth" options={{ presentation: "modal", headerShown: false }} />
      
      {/* Onboarding screen - shown during signup (no user exists yet) */}
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      
      {/* Main app screens - only shown when user IS logged in */}
      {user && (
        <>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="add-debt"
            options={{
              presentation: "formSheet",
              headerShown: false,
              sheetAllowedDetents: [0.75, 1.0],
              sheetGrabberVisible: true,
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="account"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="create-book"
            options={{
              presentation: "formSheet",
              headerShown: false,
              sheetAllowedDetents: [0.85, 1.0],
              sheetGrabberVisible: true,
            }}
          />
          <Stack.Screen
            name="generate-report"
            options={{
              presentation: "formSheet",
              headerShown: false,
              sheetAllowedDetents: [0.92, 1.0],
              sheetGrabberVisible: true,
            }}
          />
          <Stack.Screen
            name="add-product"
            options={{
              presentation: "formSheet",
              headerShown: false,
              sheetAllowedDetents: [0.85, 1.0],
              sheetGrabberVisible: true,
            }}
          />
          <Stack.Screen
            name="book-members"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="sms-reader"
            options={{
              presentation: "formSheet",
              headerShown: false,
              sheetAllowedDetents: [0.85, 1.0],
              sheetGrabberVisible: true,
            }}
          />
          <Stack.Screen
            name="business-profile"
            options={{
              presentation: "formSheet",
              headerShown: false,
              sheetAllowedDetents: [0.92, 1.0],
              sheetGrabberVisible: true,
            }}
          />
          <Stack.Screen
            name="create-invoice"
            options={{
              presentation: "formSheet",
              headerShown: false,
              sheetAllowedDetents: [0.95, 1.0],
              sheetGrabberVisible: true,
            }}
          />
          <Stack.Screen
            name="invoices"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="book-settings"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="business-team"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="subscription"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="compliance"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="analytics"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
        </>
      )}
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <LanguageProvider>
            <BookModeProvider> {/* ADD THIS WRAPPER */}
              <AuthProvider>
                <AppProvider>
                  <RootLayoutNav />
                  <PinLockOverlay />
                </AppProvider>
              </AuthProvider>
            </BookModeProvider> {/* ADD THIS CLOSING TAG */}
          </LanguageProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}