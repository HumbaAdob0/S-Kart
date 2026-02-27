import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Alert,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";

import { useCart } from "@/store/cart-context";
import { CartItemRow } from "@/components/cart-item-row";
import { formatCurrency } from "@/utils/format-currency";
import { Colors } from "@/constants/theme";

export default function CartScreen() {
  const { items, subtotal, tax, total, clearCart, itemCount } = useCart();
  const router = useRouter();

  const handleCheckout = () => {
    if (items.length === 0) {
      Alert.alert("Cart Empty", "Scan some items before checking out.");
      return;
    }
    router.push("/receipt");
  };

  const handleClear = () => {
    Alert.alert("Clear Cart", "Remove all items from your cart?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: clearCart },
    ]);
  };

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <MaterialIcons
          name="remove-shopping-cart"
          size={80}
          color={Colors.border}
        />
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySub}>Scan items to add them to your cart</Text>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => router.push("/")}
          activeOpacity={0.7}
        >
          <MaterialIcons name="qr-code-scanner" size={20} color="#fff" />
          <Text style={styles.scanBtnText}>Start Scanning</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <Text style={styles.headerCount}>
          {itemCount} item{itemCount !== 1 ? "s" : ""}
        </Text>
        <TouchableOpacity onPress={handleClear} activeOpacity={0.6}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Item list */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.product.id}
        renderItem={({ item }) => <CartItemRow item={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating add button */}
      <TouchableOpacity
        style={styles.addFab}
        onPress={() => router.push("/")}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Footer totals */}
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax (12%)</Text>
          <Text style={styles.totalValue}>{formatCurrency(tax)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.grandLabel}>Total</Text>
          <Text style={styles.grandValue}>{formatCurrency(total)}</Text>
        </View>

        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={handleCheckout}
          activeOpacity={0.8}
        >
          <MaterialIcons name="receipt-long" size={22} color="#fff" />
          <Text style={styles.checkoutText}>Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  /* Empty state */
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: Colors.background,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 16,
  },
  emptySub: { fontSize: 14, color: Colors.textSecondary, marginTop: 6 },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  scanBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  /* Header bar */
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerCount: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  clearText: { fontSize: 14, fontWeight: "600", color: Colors.danger },

  /* List */
  list: { backgroundColor: Colors.surface },

  /* Footer */
  footer: {
    backgroundColor: Colors.surface,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  totalLabel: { fontSize: 15, color: Colors.textSecondary },
  totalValue: { fontSize: 15, color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 8 },
  grandLabel: { fontSize: 20, fontWeight: "800", color: Colors.text },
  grandValue: { fontSize: 20, fontWeight: "800", color: Colors.primary },

  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 16,
  },
  checkoutText: { color: "#fff", fontSize: 18, fontWeight: "700" },

  /* Floating add button */
  addFab: {
    position: "absolute",
    right: 20,
    bottom: 200,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.success,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 10,
  },
});
