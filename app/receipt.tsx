import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";

import { useCart } from "@/store/cart-context";
import { useProducts } from "@/store/product-context";
import { useTransactions } from "@/store/transaction-context";
import { ReceiptView } from "@/components/receipt-view";
import { buildReceiptHtml } from "@/utils/receipt-html";
import { esp32 } from "@/services/esp32";
import { Colors } from "@/constants/theme";
import type { Receipt as ReceiptType } from "@/types/grocery";

export default function ReceiptScreen() {
  const { items, buildReceipt, clearCart } = useCart();
  const { deductStock } = useProducts();
  const { saveTransaction } = useTransactions();
  const [receipt] = useState<ReceiptType>(() => buildReceipt());
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const router = useRouter();

  const handleSaveReceipt = async () => {
    try {
      setSaving(true);
      const html = buildReceiptHtml(receipt);
      const { uri } = await Print.printToFileAsync({
        html,
        width: 380,
        height: 680,
      });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Save or share your S-Kart receipt",
        UTI: "com.adobe.pdf",
      });
    } catch (error) {
      Alert.alert("Error", "Failed to save receipt. Please try again.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateQR = () => {
    router.push({
      pathname: "/qr-code",
      params: { receiptJson: JSON.stringify(receipt) },
    });
  };

  const handleDone = async () => {
    if (finishing) return; // prevent double-tap
    setFinishing(true);

    // Send receipt to ESP32 LCD for display
    esp32.sendReceipt(receipt);

    try {
      // Deduct stock from Firestore for all purchased items
      await deductStock(
        receipt.items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
      );
    } catch (err) {
      console.error("[Receipt] Failed to deduct stock:", err);
    }

    try {
      await saveTransaction(receipt);
    } catch (err) {
      console.error("[Receipt] Failed to save transaction:", err);
    }
    clearCart();
    router.dismissAll();
  };

  if (items.length === 0 && receipt.items.length === 0) {
    return (
      <View style={styles.empty}>
        <MaterialIcons name="receipt" size={64} color={Colors.border} />
        <Text style={styles.emptyText}>No items to generate receipt.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Capturable receipt */}
        <ReceiptView receipt={receipt} />
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.saveBtn]}
          onPress={handleSaveReceipt}
          disabled={saving}
          activeOpacity={0.7}
        >
          <MaterialIcons name="share" size={20} color="#fff" />
          <Text style={styles.actionText}>
            {saving ? "Preparing…" : "Save / Share Receipt"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.qrBtn]}
          onPress={handleGenerateQR}
          activeOpacity={0.7}
        >
          <MaterialIcons name="qr-code" size={20} color="#fff" />
          <Text style={styles.actionText}>Generate QR Code</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.doneBtn, finishing && { opacity: 0.5 }]}
          onPress={handleDone}
          disabled={finishing}
          activeOpacity={0.7}
        >
          <Text style={styles.doneText}>
            {finishing ? "Processing…" : "Done & Clear Cart"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, paddingBottom: 8 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 16, color: Colors.textSecondary },
  actions: {
    padding: 16,
    gap: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveBtn: { backgroundColor: Colors.success },
  qrBtn: { backgroundColor: Colors.primary },
  actionText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  doneBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  doneText: { fontSize: 14, fontWeight: "600", color: Colors.danger },
});
