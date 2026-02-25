import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { CartProvider } from "@/store/cart-context";

export default function RootLayout() {
  return (
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
  );
}
