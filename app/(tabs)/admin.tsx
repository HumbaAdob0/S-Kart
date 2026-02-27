import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";

import { Colors } from "@/constants/theme";
import { useProducts } from "@/store/product-context";
import { esp32, type ConnectionStatus } from "@/services/esp32";
import { formatCurrency } from "@/utils/format-currency";
import { seedProducts } from "@/utils/seed-firestore";
import type { Product } from "@/types/grocery";

/* ================================================================== */
/*  BARCODE SCANNER MODAL                                              */
/* ================================================================== */

function BarcodeScannerModal({
  visible,
  onClose,
  onScanned,
}: {
  visible: boolean;
  onClose: () => void;
  onScanned: (barcode: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanPaused, setScanPaused] = useState(false);
  const SCAN_COOLDOWN = 1500;

  const handleScan = (result: BarcodeScanningResult) => {
    if (scanPaused) return;
    setScanPaused(true);

    if (Platform.OS === "ios") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    onScanned(result.data);
    onClose();

    setTimeout(() => setScanPaused(false), SCAN_COOLDOWN);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.scannerModal}>
        {!permission?.granted ? (
          <View style={styles.scannerCenter}>
            <MaterialIcons
              name="camera-alt"
              size={64}
              color={Colors.textSecondary}
            />
            <Text style={styles.scannerPermText}>Camera access needed</Text>
            <TouchableOpacity
              style={styles.permBtn}
              onPress={requestPermission}
            >
              <Text style={styles.permBtnText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelScanBtn} onPress={onClose}>
              <Text style={styles.cancelScanText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
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
              onBarcodeScanned={handleScan}
            />
            {/* Overlay */}
            <View style={styles.scanOverlay}>
              <Text style={styles.scanOverlayText}>Scan product barcode</Text>
            </View>
            {/* Close button */}
            <TouchableOpacity
              style={styles.scanCloseBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}

/* ================================================================== */
/*  PRODUCT FORM MODAL                                                 */
/* ================================================================== */

interface ProductFormData {
  barcode: string;
  name: string;
  price: string;
  category: string;
  stock: string;
}

const emptyForm: ProductFormData = {
  barcode: "",
  name: "",
  price: "",
  category: "",
  stock: "",
};

function ProductFormModal({
  visible,
  onClose,
  editingProduct,
  onSave,
  saving = false,
}: {
  visible: boolean;
  onClose: () => void;
  editingProduct: Product | null;
  onSave: (data: ProductFormData) => void;
  saving?: boolean;
}) {
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [showScanner, setShowScanner] = useState(false);

  // Reset form when modal opens
  const onShow = () => {
    if (editingProduct) {
      setForm({
        barcode: editingProduct.barcode,
        name: editingProduct.name,
        price: editingProduct.price.toString(),
        category: editingProduct.category,
        stock: editingProduct.stock.toString(),
      });
    } else {
      setForm(emptyForm);
    }
  };

  const handleSave = () => {
    if (!form.barcode.trim()) {
      Alert.alert("Missing Info", "Barcode is required.");
      return;
    }
    if (!form.name.trim()) {
      Alert.alert("Missing Info", "Product name is required.");
      return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price <= 0) {
      Alert.alert("Invalid Price", "Enter a valid price greater than 0.");
      return;
    }
    if (!form.category.trim()) {
      Alert.alert("Missing Info", "Category is required.");
      return;
    }
    const stock = parseInt(form.stock, 10);
    if (isNaN(stock) || stock < 0) {
      Alert.alert("Invalid Stock", "Enter a valid stock amount (0 or more).");
      return;
    }
    onSave(form);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      onShow={onShow}
    >
      <KeyboardAvoidingView
        style={styles.formModalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.formModalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {editingProduct ? "Edit Product" : "Add Product"}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons
                  name="close"
                  size={24}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Barcode field with scanner button */}
            <Text style={styles.fieldLabel}>Barcode</Text>
            <View style={styles.barcodeRow}>
              <TextInput
                style={[styles.formInput, styles.barcodeInput]}
                placeholder="Scan or enter barcode"
                placeholderTextColor={Colors.textSecondary}
                value={form.barcode}
                onChangeText={(t) => setForm({ ...form, barcode: t })}
                editable={!editingProduct} // Can't change barcode when editing
              />
              {!editingProduct && (
                <TouchableOpacity
                  style={styles.scanBtn}
                  onPress={() => setShowScanner(true)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="qr-code-scanner"
                    size={24}
                    color="#fff"
                  />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.fieldLabel}>Product Name</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. Jasmine Rice (5kg)"
              placeholderTextColor={Colors.textSecondary}
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
            />

            <Text style={styles.fieldLabel}>Price (₱)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="0.00"
              placeholderTextColor={Colors.textSecondary}
              value={form.price}
              onChangeText={(t) => setForm({ ...form, price: t })}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. Dairy, Grains, Beverages"
              placeholderTextColor={Colors.textSecondary}
              value={form.category}
              onChangeText={(t) => setForm({ ...form, category: t })}
            />

            <Text style={styles.fieldLabel}>Stock</Text>
            <TextInput
              style={styles.formInput}
              placeholder="0"
              placeholderTextColor={Colors.textSecondary}
              value={form.stock}
              onChangeText={(t) => setForm({ ...form, stock: t })}
              keyboardType="number-pad"
            />

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={editingProduct ? "save" : "add-circle"}
                size={20}
                color="#fff"
              />
              <Text style={styles.saveBtnText}>
                {saving
                  ? "Saving…"
                  : editingProduct
                    ? "Save Changes"
                    : "Add Product"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Nested barcode scanner */}
      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanned={(barcode) => setForm({ ...form, barcode })}
      />
    </Modal>
  );
}

/* ================================================================== */
/*  PRODUCT ROW                                                        */
/* ================================================================== */

function ProductRow({
  product,
  onEdit,
  onDelete,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.productRow}>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.productMeta}>
          {product.category} · {formatCurrency(product.price)} · Stock:{" "}
          {product.stock}
        </Text>
        <Text style={styles.productBarcode}>{product.barcode}</Text>
      </View>
      <View style={styles.productActions}>
        <TouchableOpacity onPress={onEdit} style={styles.actionBtn}>
          <MaterialIcons name="edit" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.actionBtn}>
          <MaterialIcons
            name="delete-outline"
            size={20}
            color={Colors.danger}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ================================================================== */
/*  ADMIN DASHBOARD                                                    */
/* ================================================================== */

function AdminDashboard() {
  const {
    products,
    loading: productsLoading,
    addProduct,
    updateProduct,
    deleteProduct,
    findByBarcode,
  } = useProducts();

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ── ESP32 connection state ── */
  const [espIp, setEspIp] = useState("");
  const [espStatus, setEspStatus] = useState<ConnectionStatus>(
    esp32.getStatus(),
  );
  const [showEspPanel, setShowEspPanel] = useState(false);

  // Load saved IP on mount & auto-connect
  useEffect(() => {
    esp32.loadSavedIp().then((ip) => {
      if (ip) {
        setEspIp(ip);
        esp32.connect(ip);
      }
    });
  }, []);

  // Subscribe to status changes
  useEffect(() => {
    const unsub = esp32.subscribe((s) => setEspStatus(s));
    return unsub;
  }, []);

  const handleEspConnect = async () => {
    const ip = espIp.trim();
    if (!ip) {
      Alert.alert("Invalid IP", "Please enter the ESP32 IP address.");
      return;
    }
    await esp32.saveIp(ip);
    esp32.connect(ip);
  };

  const handleEspDisconnect = async () => {
    esp32.disconnect();
    await esp32.clearIp();
    setEspIp("");
  };

  const espStatusColor =
    espStatus === "connected"
      ? Colors.success
      : espStatus === "connecting"
        ? "#FFA000"
        : Colors.textSecondary;

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search) ||
      p.category.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAddNew = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              await deleteProduct(product.id);
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete product.");
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const handleSave = async (data: ProductFormData) => {
    const price = parseFloat(data.price);
    const stock = parseInt(data.stock, 10);

    setSaving(true);
    try {
      if (editingProduct) {
        // Update existing
        await updateProduct({
          ...editingProduct,
          name: data.name.trim(),
          price,
          category: data.category.trim(),
          stock,
        });
        Alert.alert("Updated", `"${data.name.trim()}" has been updated.`);
      } else {
        // Check if barcode already exists
        const existing = findByBarcode(data.barcode.trim());
        if (existing) {
          Alert.alert(
            "Barcode Exists",
            `This barcode is already assigned to "${existing.name}". Would you like to update it instead?`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Update",
                onPress: async () => {
                  try {
                    await updateProduct({
                      ...existing,
                      name: data.name.trim(),
                      price,
                      category: data.category.trim(),
                      stock,
                    });
                    setShowForm(false);
                  } catch (err: any) {
                    Alert.alert("Error", err.message || "Failed to update.");
                  }
                },
              },
            ],
          );
          return;
        }
        await addProduct({
          barcode: data.barcode.trim(),
          name: data.name.trim(),
          price,
          category: data.category.trim(),
          stock,
        });
        Alert.alert("Added", `"${data.name.trim()}" has been added.`);
      }
      setShowForm(false);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  /** Scan barcode → if product exists, open edit; otherwise open add with barcode prefilled */
  const handleScanForAdmin = (barcode: string) => {
    const existing = findByBarcode(barcode);
    if (existing) {
      setEditingProduct(existing);
    } else {
      setEditingProduct(null);
    }
    // Small delay so scanner modal closes first
    setTimeout(() => setShowForm(true), 300);
  };

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products…"
            placeholderTextColor={Colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <MaterialIcons
                name="close"
                size={18}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {productsLoading
            ? "Loading…"
            : `${filtered.length} product${filtered.length !== 1 ? "s" : ""}${search ? " found" : " total"}`}
        </Text>
        <View style={styles.statsActions}>
          {products.length === 0 && !productsLoading && (
            <TouchableOpacity
              style={styles.seedBtn}
              onPress={async () => {
                try {
                  const count = await seedProducts();
                  Alert.alert(
                    count > 0 ? "Seeded!" : "Already Seeded",
                    count > 0
                      ? `${count} products added to database.`
                      : "Database already has products.",
                  );
                } catch (err: any) {
                  Alert.alert("Error", err.message || "Failed to seed.");
                }
              }}
            >
              <MaterialIcons
                name="cloud-upload"
                size={16}
                color={Colors.primary}
              />
              <Text style={styles.seedBtnText}>Seed DB</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ESP32 LCD Connection */}
      <TouchableOpacity
        style={styles.espToggle}
        onPress={() => setShowEspPanel(!showEspPanel)}
        activeOpacity={0.7}
      >
        <View style={styles.espToggleLeft}>
          <MaterialIcons
            name="cast-connected"
            size={18}
            color={espStatusColor}
          />
          <Text style={styles.espToggleText}>ESP32 LCD Display</Text>
        </View>
        <View style={styles.espToggleRight}>
          <View style={[styles.espDot, { backgroundColor: espStatusColor }]} />
          <Text style={[styles.espStatusLabel, { color: espStatusColor }]}>
            {espStatus === "connected"
              ? "Connected"
              : espStatus === "connecting"
                ? "Connecting…"
                : "Off"}
          </Text>
          <MaterialIcons
            name={showEspPanel ? "expand-less" : "expand-more"}
            size={20}
            color={Colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {showEspPanel && (
        <View style={styles.espPanel}>
          <Text style={styles.espHelp}>
            Enter the IP address shown on the ESP32 LCD.
          </Text>
          <View style={styles.espInputRow}>
            <TextInput
              style={styles.espInput}
              placeholder="e.g. 192.168.1.100"
              placeholderTextColor={Colors.textSecondary}
              value={espIp}
              onChangeText={setEspIp}
              keyboardType="decimal-pad"
              autoCapitalize="none"
              autoCorrect={false}
              editable={espStatus !== "connecting"}
            />
            {espStatus === "connected" ? (
              <TouchableOpacity
                style={[styles.espBtn, { backgroundColor: Colors.danger }]}
                onPress={handleEspDisconnect}
              >
                <Text style={styles.espBtnText}>Disconnect</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.espBtn, { backgroundColor: Colors.primary }]}
                onPress={handleEspConnect}
                disabled={espStatus === "connecting"}
              >
                <Text style={styles.espBtnText}>
                  {espStatus === "connecting" ? "…" : "Connect"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Product list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductRow
            product={item}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons
              name="inventory-2"
              size={48}
              color={Colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>
              {search ? "No products match your search" : "No products yet"}
            </Text>
          </View>
        }
      />

      {/* Floating action buttons */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, styles.fabSecondary]}
          onPress={() => setShowScanner(true)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="qr-code-scanner" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddNew}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Product form modal */}
      <ProductFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        editingProduct={editingProduct}
        onSave={handleSave}
        saving={saving}
      />

      {/* Barcode scanner for quick lookup */}
      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScanned={handleScanForAdmin}
      />
    </View>
  );
}

/* ================================================================== */
/*  MAIN EXPORT: Admin is always authenticated at this point           */
/* ================================================================== */

export default function AdminScreen() {
  return <AdminDashboard />;
}

/* ================================================================== */
/*  STYLES                                                             */
/* ================================================================== */

const styles = StyleSheet.create({
  /* Container */
  container: { flex: 1, backgroundColor: Colors.background },

  /* Loading */
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  loadingText: { fontSize: 16, color: Colors.textSecondary },

  /* Login screen */
  loginContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    padding: 24,
  },
  loginCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 12,
  },
  loginSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginBottom: 16,
    width: "100%",
  },
  warningText: { flex: 1, fontSize: 12, color: "#E65100" },
  errorBox: {
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    width: "100%",
  },
  errorText: { fontSize: 13, color: Colors.danger, textAlign: "center" },
  loginInput: {
    width: "100%",
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 12,
  },
  loginBtn: {
    width: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  /* Dev banner */
  devBanner: {
    backgroundColor: Colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
  },
  devBannerText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  /* Search */
  searchRow: { paddingHorizontal: 16, paddingTop: 12 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text },

  /* Stats */
  statsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  statsText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "600" },
  statsActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  seedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  seedBtnText: { fontSize: 12, fontWeight: "700", color: Colors.primary },

  /* Product list */
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  productRow: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  productInfo: { flex: 1 },
  productName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  productMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  productBarcode: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginTop: 2,
  },
  productActions: { flexDirection: "row", gap: 4 },
  actionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },

  /* Empty state */
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textSecondary,
  },

  /* FABs */
  fabContainer: {
    position: "absolute",
    right: 20,
    bottom: 24,
    gap: 12,
    alignItems: "center",
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabSecondary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryDark,
  },

  /* Scanner modal */
  scannerModal: { flex: 1, backgroundColor: "#000" },
  scannerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    gap: 12,
  },
  scannerPermText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  permBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  permBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cancelScanBtn: { marginTop: 12 },
  cancelScanText: { color: Colors.textSecondary, fontSize: 15 },
  scanOverlay: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  scanOverlayText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: "hidden",
  },
  scanCloseBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Form modal */
  formModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  formModalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "85%",
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  barcodeRow: {
    flexDirection: "row",
    gap: 8,
  },
  barcodeInput: { flex: 1 },
  formInput: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
  },
  scanBtn: {
    width: 50,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    flexDirection: "row",
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    marginBottom: 16,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  /* ── ESP32 panel ── */
  espToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  espToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  espToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  espToggleRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  espDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  espStatusLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  espPanel: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  espHelp: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  espInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  espInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  espBtn: {
    borderRadius: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  espBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
