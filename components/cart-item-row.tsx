import { StyleSheet, TouchableOpacity, View, Text } from "react-native";
import { useCart } from "@/store/cart-context";
import { formatCurrency } from "@/utils/format-currency";
import type { CartItem } from "@/types/grocery";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

interface Props {
  item: CartItem;
}

export function CartItemRow({ item }: Props) {
  const { increment, decrement, removeItem } = useCart();
  const { product, quantity } = item;

  return (
    <View style={styles.row}>
      {/* Product info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.category}>{product.category}</Text>
        <Text style={styles.price}>{formatCurrency(product.price)} each</Text>
      </View>

      {/* Quantity controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={() => decrement(product.id)}
          style={styles.qtyBtn}
          activeOpacity={0.6}
        >
          <Text style={styles.qtyBtnText}>−</Text>
        </TouchableOpacity>

        <Text style={styles.qtyText}>{quantity}</Text>

        <TouchableOpacity
          onPress={() => increment(product.id)}
          style={styles.qtyBtn}
          activeOpacity={0.6}
        >
          <Text style={styles.qtyBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Line total + remove */}
      <View style={styles.totalCol}>
        <Text style={styles.lineTotal}>
          {formatCurrency(product.price * quantity)}
        </Text>
        <TouchableOpacity
          onPress={() => removeItem(product.id)}
          style={styles.removeBtn}
        >
          <MaterialIcons
            name="delete-outline"
            size={18}
            color={Colors.danger}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  category: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  price: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  lineTotal: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 16,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#0a7ea4",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
  },
  qtyText: {
    fontSize: 16,
    fontWeight: "600",
    minWidth: 24,
    textAlign: "center",
  },
  totalCol: {
    alignItems: "flex-end",
    minWidth: 70,
  },
  removeBtn: {
    marginTop: 6,
    padding: 4,
  },
});
