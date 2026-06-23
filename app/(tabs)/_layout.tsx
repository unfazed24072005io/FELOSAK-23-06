import { Stack } from "expo-router";
import { useColorScheme, View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useBookMode } from "@/context/BookModeContext";
import Colors from "@/constants/colors";
import { Feather } from "@expo/vector-icons";

function BookModeBar({ onExit }: { onExit: () => void }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  
  return (
    <View style={[styles.bookModeBar, { backgroundColor: theme.tint }]}>
      <View style={styles.bookModeLeft}>
        <Feather name="lock" size={14} color="#FFF" />
        <Text style={styles.bookModeText}>Book Mode - Limited Access</Text>
      </View>
      <Pressable onPress={onExit} style={styles.exitButton}>
        <Text style={styles.exitButtonText}>Exit</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const { isBookMode, exitBookMode } = useBookMode();

  return (
    <>
      {isBookMode && <BookModeBar onExit={exitBookMode} />}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme.background,
          },
        }}
      >
        <Stack.Screen name="index" />
        {/* Add other screens here */}
        <Stack.Screen name="add-transaction" options={{ presentation: "modal" }} />
        <Stack.Screen name="create-document" options={{ presentation: "modal" }} />
        <Stack.Screen name="ai-document-chat" options={{ presentation: "modal" }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  bookModeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 52 : 12,
    zIndex: 1000,
  },
  bookModeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookModeText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  exitButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exitButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
});