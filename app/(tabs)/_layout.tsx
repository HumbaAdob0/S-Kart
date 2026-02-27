import { Tabs } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Colors } from "@/constants/theme";
import { useCart } from "@/store/cart-context";
import { useAuth } from "@/store/auth-context";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";

function CartBadge() {
  const { itemCount } = useCart();
  if (itemCount === 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{itemCount > 99 ? "99+" : itemCount}</Text>
    </View>
  );
}

export default function TabLayout() {
  const { role, signOut } = useAuth();
  const isAdmin = role === "admin";

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  const logoutButton = () => (
    <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
      <MaterialIcons name="logout" size={24} color="#fff" />
    </TouchableOpacity>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      {/* Cart is the initial/default tab for all users */}
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          headerTitle: "Shopping Cart",
          headerRight: logoutButton,
          tabBarIcon: ({ color, size }) => (
            <View>
              <MaterialIcons name="shopping-cart" size={size} color={color} />
              <CartBadge />
            </View>
          ),
        }}
      />
      {/* Admin tab — only visible to admins */}
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          headerTitle: "Product Manager",
          headerRight: logoutButton,
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons
              name="admin-panel-settings"
              size={size}
              color={color}
            />
          ),
        }}
      />
      {/* Scanner stays in the group but is hidden from the tab bar */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Scan",
          headerTitle: "S-Kart Scanner",
          href: null,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          headerTitle: "Transaction History",
          headerRight: logoutButton,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="receipt-long" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    right: -10,
    top: -4,
    backgroundColor: Colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});
