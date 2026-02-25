import { StyleSheet, View, Text } from "react-native";
import type { Receipt } from "@/types/grocery";
import { formatCurrency } from "@/utils/format-currency";

interface Props {
  receipt: Receipt;
}

/**
 * A receipt view rendered as a paper-style receipt.
 */
export function ReceiptView({ receipt }: Props) {
  const formattedDate = new Date(receipt.date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={styles.receipt} collapsable={false}>
      {/* Header */}
      <Text style={styles.storeName}>S-KART</Text>
      <Text style={styles.tagline}>Your Smart Grocery POS</Text>
      <View style={styles.divider} />

      {/* Receipt meta */}
      <Text style={styles.meta}>Receipt #: {receipt.id}</Text>
      <Text style={styles.meta}>Date: {formattedDate}</Text>
      <View style={styles.divider} />

      {/* Column headers */}
      <View style={styles.headerRow}>
        <Text style={[styles.colItem, styles.colHeader]}>Item</Text>
        <Text style={[styles.colQty, styles.colHeader]}>Qty</Text>
        <Text style={[styles.colPrice, styles.colHeader]}>Price</Text>
        <Text style={[styles.colTotal, styles.colHeader]}>Total</Text>
      </View>
      <View style={styles.thinDivider} />

      {/* Items */}
      {receipt.items.map((entry) => (
        <View key={entry.product.id} style={styles.itemRow}>
          <Text style={styles.colItem} numberOfLines={1}>
            {entry.product.name}
          </Text>
          <Text style={styles.colQty}>{entry.quantity}</Text>
          <Text style={styles.colPrice}>
            {formatCurrency(entry.product.price)}
          </Text>
          <Text style={styles.colTotal}>
            {formatCurrency(entry.product.price * entry.quantity)}
          </Text>
        </View>
      ))}

      <View style={styles.divider} />

      {/* Totals */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Subtotal</Text>
        <Text style={styles.totalValue}>
          {formatCurrency(receipt.subtotal)}
        </Text>
      </View>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Tax (12%)</Text>
        <Text style={styles.totalValue}>{formatCurrency(receipt.tax)}</Text>
      </View>
      <View style={styles.thinDivider} />
      <View style={styles.totalRow}>
        <Text style={[styles.totalLabel, styles.grandTotal]}>TOTAL</Text>
        <Text style={[styles.totalValue, styles.grandTotal]}>
          {formatCurrency(receipt.total)}
        </Text>
      </View>

      <View style={styles.divider} />
      <Text style={styles.footer}>Thank you for shopping at S-Kart!</Text>
      <Text style={styles.footerSmall}>
        Please present QR code at the counter.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  receipt: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 12,
    width: "100%",
  },
  storeName: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    color: "#0a7ea4",
    letterSpacing: 3,
  },
  tagline: {
    fontSize: 12,
    textAlign: "center",
    color: "#687076",
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#ccc",
    marginVertical: 12,
    borderStyle: "dashed",
  },
  thinDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ddd",
    marginVertical: 6,
  },
  meta: {
    fontSize: 12,
    color: "#555",
    marginVertical: 1,
  },
  headerRow: {
    flexDirection: "row",
    paddingVertical: 4,
  },
  colHeader: {
    fontWeight: "700",
    fontSize: 11,
    color: "#333",
  },
  itemRow: {
    flexDirection: "row",
    paddingVertical: 4,
  },
  colItem: {
    flex: 3,
    fontSize: 12,
    color: "#333",
  },
  colQty: {
    flex: 1,
    fontSize: 12,
    textAlign: "center",
    color: "#333",
  },
  colPrice: {
    flex: 1.5,
    fontSize: 12,
    textAlign: "right",
    color: "#333",
  },
  colTotal: {
    flex: 1.5,
    fontSize: 12,
    textAlign: "right",
    color: "#333",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  totalLabel: {
    fontSize: 14,
    color: "#333",
  },
  totalValue: {
    fontSize: 14,
    color: "#333",
  },
  grandTotal: {
    fontWeight: "800",
    fontSize: 18,
    color: "#0a7ea4",
  },
  footer: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  footerSmall: {
    textAlign: "center",
    fontSize: 11,
    color: "#888",
    marginTop: 4,
  },
});
