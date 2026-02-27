import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useAuth } from "@/store/auth-context";
import { Colors } from "@/constants/theme";

/**
 * Full-screen login gate shown before the main app.
 * On successful sign-in the auth context updates and the
 * root layout swaps in the tab navigator automatically.
 */
export default function LoginScreen() {
  const { signIn, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter email and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signIn(email.trim(), password.trim());
      // Success — keep button disabled; onAuthStateChanged will
      // set the user and unmount this screen automatically.
    } catch (err: any) {
      const msg =
        err?.code === "auth/invalid-credential"
          ? "Invalid email or password"
          : err?.code === "auth/too-many-requests"
            ? "Too many attempts. Try again later."
            : err?.message || "Login failed";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.card}>
        {/* Logo / branding */}
        <View style={styles.logoWrap}>
          <MaterialIcons name="shopping-cart" size={56} color="#fff" />
        </View>
        <Text style={styles.appName}>S-Kart</Text>
        <Text style={styles.tagline}>Grocery POS System</Text>

        {/* Warning when Firebase not configured */}
        {!configured && (
          <View style={styles.warningBox}>
            <MaterialIcons name="info" size={16} color={Colors.primary} />
            <Text style={styles.warningText}>
              Firebase not configured. Auth is disabled.
            </Text>
          </View>
        )}

        {/* Error banner */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Inputs */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Login button */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.btnText}>
            {loading ? "Signing in…" : "Sign In"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Admin and staff accounts are managed in{"\n"}the Firebase console.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  logoWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: "900",
    color: Colors.text,
  },
  tagline: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E3F2FD",
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    width: "100%",
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: Colors.primary,
  },
  errorBox: {
    backgroundColor: "#FFEBEE",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    width: "100%",
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    textAlign: "center",
  },
  input: {
    width: "100%",
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btn: {
    width: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  hint: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 16,
  },
});
