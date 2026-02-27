import { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useRouter, useLocalSearchParams } from "expo-router";

import { formatCurrency } from "@/utils/format-currency";
import { Colors } from "@/constants/theme";
import type { Receipt } from "@/types/grocery";

export default function QRCodeScreen() {
  const { receiptJson } = useLocalSearchParams<{ receiptJson: string }>();
  const receipt = useMemo<Receipt>(
    () => JSON.parse(receiptJson),
    [receiptJson],
  );
  const router = useRouter();

  // Build compact payload for QR code
  const qrPayload = JSON.stringify({
    id: receipt.id,
    items: receipt.items.map((i) => ({
      n: i.product.name,
      q: i.quantity,
      p: i.product.price,
    })),
    sub: +receipt.subtotal.toFixed(2),
    tax: +receipt.tax.toFixed(2),
    tot: +receipt.total.toFixed(2),
    dt: receipt.date,
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        {/* QR Code */}
        <View style={styles.qrWrapper}>
          <QRCode
            value={qrPayload}
            size={240}
            color={Colors.text}
            backgroundColor="#fff"
          />
        </View>

        <Text style={styles.receiptId}>{receipt.id}</Text>
        <Text style={styles.instruction}>
          Present this QR code to the cashier for payment verification.
        </Text>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items</Text>
            <Text style={styles.summaryValue}>
              {receipt.items.reduce((s, i) => s + i.quantity, 0)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(receipt.subtotal)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax (12%)</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(receipt.tax)}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(receipt.total)}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.doneBtn}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Text style={styles.doneBtnText}>Back to Receipt</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    padding: 20,
    alignItems: "center",
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 28,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  receiptId: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 1,
  },
  instruction: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  summary: {
    width: "100%",
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryLabel: { fontSize: 14, color: Colors.textSecondary },
  summaryValue: { fontSize: 14, color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 8 },
  totalLabel: { fontSize: 18, fontWeight: "800", color: Colors.text },
  totalValue: { fontSize: 18, fontWeight: "800", color: Colors.primary },
  doneBtn: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  doneBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
