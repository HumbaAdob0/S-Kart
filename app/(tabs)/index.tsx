import { useEffect, useRef, useState } from "react";
import {
  Alert,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  Animated as RNAnimated,
  Platform,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";

import { findProductByBarcode } from "@/data/products";
import { useCart } from "@/store/cart-context";
import { formatCurrency } from "@/utils/format-currency";
import { Colors } from "@/constants/theme";
import type { Product } from "@/types/grocery";

const SCAN_COOLDOWN_MS = 1500;

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [lastScanned, setLastScanned] = useState<Product | null>(null);
  const [scanPaused, setScanPaused] = useState(false);
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const { addItem, itemCount } = useCart();
  const router = useRouter();

  /* ---- permission not yet determined ---- */
  if (!permission) return <View style={styles.center} />;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <MaterialIcons
          name="camera-alt"
          size={64}
          color={Colors.textSecondary}
        />
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permSub}>
          S-Kart needs camera access to scan product barcodes.
        </Text>
        <TouchableOpacity
          style={styles.permBtn}
          onPress={requestPermission}
          activeOpacity={0.7}
        >
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ---- barcode scanned handler ---- */
  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scanPaused) return;
    setScanPaused(true);

    const product = findProductByBarcode(result.data);

    if (product) {
      addItem(product);
      setLastScanned(product);

      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Animate toast in
      RNAnimated.sequence([
        RNAnimated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        RNAnimated.delay(1000),
        RNAnimated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert(
        "Item Not Found",
        `Barcode "${result.data}" is not in the database.`,
        [{ text: "OK" }],
      );
    }

    setTimeout(() => setScanPaused(false), SCAN_COOLDOWN_MS);
  };

  return (
    <View style={styles.container}>
      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: [
            "ean13",
            "ean8",
            "upc_a",
            "upc_e",
            "code128",
            "code39",
            "qr",
          ],
        }}
        onBarcodeScanned={handleBarCodeScanned}
      />

      {/* Scan overlay */}
      <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom}>
          <Text style={styles.instructionText}>
            Point camera at a barcode to scan
          </Text>
        </View>
      </View>

      {/* Toast notification for scanned item */}
      {lastScanned && (
        <RNAnimated.View style={[styles.toast, { opacity: fadeAnim }]}>
          <MaterialIcons name="check-circle" size={24} color={Colors.success} />
          <View style={styles.toastText}>
            <Text style={styles.toastTitle}>{lastScanned.name}</Text>
            <Text style={styles.toastPrice}>
              {formatCurrency(lastScanned.price)} added
            </Text>
          </View>
        </RNAnimated.View>
      )}

      {/* Cart shortcut */}
      {itemCount > 0 && (
        <TouchableOpacity
          style={styles.cartFab}
          onPress={() => router.push("/cart")}
          activeOpacity={0.8}
        >
          <MaterialIcons name="shopping-cart" size={24} color="#fff" />
          <View style={styles.fabBadge}>
            <Text style={styles.fabBadgeText}>{itemCount}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const SCAN_SIZE = 260;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: Colors.background,
  },

  /* Permission screen */
  permTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    color: Colors.text,
  },
  permSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  permBtn: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  /* Overlay */
  overlay: { ...StyleSheet.absoluteFillObject },
  overlayTop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  overlayMiddle: { flexDirection: "row" },
  overlaySide: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  scanArea: { width: SCAN_SIZE, height: SCAN_SIZE },
  overlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    paddingTop: 32,
  },
  instructionText: { color: "#fff", fontSize: 15, fontWeight: "500" },

  /* Corner indicators */
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: Colors.primary,
    borderWidth: 3,
  },
  topLeft: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
  topRight: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },

  /* Toast */
  toast: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: { flex: 1 },
  toastTitle: { fontSize: 15, fontWeight: "600", color: Colors.text },
  toastPrice: { fontSize: 13, color: Colors.success, marginTop: 2 },

  /* Cart FAB */
  cartFab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  fabBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: Colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  fabBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
