import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/config/firebase";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type UserRole = "admin" | "user";

interface AuthContextValue {
  /** Currently signed-in Firebase user (null when logged out) */
  user: User | null;
  /** The role of the current user */
  role: UserRole;
  /** True while checking initial auth state or loading role */
  loading: boolean;
  /** True when Firebase has real credentials configured */
  configured: boolean;
  /** Sign in with email & password. Throws on failure. */
  signIn: (email: string, password: string) => Promise<void>;
  /** Sign out the current user */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* ------------------------------------------------------------------ */
/*  Role fetching                                                      */
/* ------------------------------------------------------------------ */

/**
 * Reads the user's role from Firestore `users/{uid}`.
 * Expected document shape: { role: "admin" | "user" }
 * Falls back to "user" if no doc exists.
 */
async function fetchRole(uid: string): Promise<UserRole> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const data = snap.data();
      if (data.role === "admin") return "admin";
    }
  } catch (err) {
    console.error("[Auth] Failed to fetch user role:", err);
  }
  return "user";
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("user");
  const [loading, setLoading] = useState(true);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch role BEFORE setting user so both update in the same
        // React batch — prevents the tab layout from rendering with
        // the default "user" role before the real role is known.
        const userRole = await fetchRole(firebaseUser.uid);
        setRole(userRole);
        setUser(firebaseUser);
      } else {
        setRole("user");
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [configured]);

  const signIn = async (email: string, password: string) => {
    if (!configured) {
      throw new Error(
        "Firebase is not configured. Please add your Firebase config in config/firebase.ts",
      );
    }
    await signInWithEmailAndPassword(auth, email, password);
    // Role + user will be set by the onAuthStateChanged listener
  };

  const signOut = async () => {
    if (!configured) {
      setUser(null);
      setRole("user");
      return;
    }
    await firebaseSignOut(auth);
    setRole("user");
  };

  return (
    <AuthContext.Provider
      value={{ user, role, loading, configured, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
