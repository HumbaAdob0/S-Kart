import { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { CartProvider } from "@/store/cart-context";
import { ProductProvider } from "@/store/product-context";
import { AuthProvider, useAuth } from "@/store/auth-context";
import { TransactionProvider } from "@/store/transaction-context";
import { esp32 } from "@/services/esp32";
import LoginScreen from "@/components/login-screen";
import { Colors } from "@/constants/theme";

/* ================================================================== */
/*  Inner layout — has access to auth context                          */
/* ================================================================== */

function AppContent() {
  const { user, loading, configured } = useAuth();

  // Disconnect ESP32 when user signs out, auto-connect when signed in
  useEffect(() => {
    if (!user && !loading) {
      esp32.disconnect();
    } else if (user) {
      // Re-connect to saved ESP32 IP after login
      esp32.loadSavedIp().then((ip) => {
        if (ip && esp32.getStatus() === "disconnected") {
          console.log("[AppContent] Auto-connecting to ESP32 at", ip);
          esp32.connect(ip);
        }
      });
    }
  }, [user, loading]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading…</Text>
        <StatusBar style="dark" />
      </View>
    );
  }

  // Not logged in → full-screen login
  // (Skip gate if Firebase not configured — dev mode)
  if (!user && configured) {
    return (
      <>
        <LoginScreen />
        <StatusBar style="light" />
      </>
    );
  }

  // Authenticated (or dev mode) → show the app
  return (
    <ProductProvider>
      <TransactionProvider>
        <CartProvider>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: "#0a7ea4" },
              headerTintColor: "#fff",
              headerTitleStyle: { fontWeight: "700" },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="receipt"
              options={{ presentation: "modal", title: "E-Receipt" }}
            />
            <Stack.Screen
              name="qr-code"
              options={{ presentation: "modal", title: "Payment QR" }}
            />
          </Stack>
          <StatusBar style="light" />
        </CartProvider>
      </TransactionProvider>
    </ProductProvider>
  );
}

/* ================================================================== */
/*  Root layout — wraps everything in AuthProvider                     */
/* ================================================================== */

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
