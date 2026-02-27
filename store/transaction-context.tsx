import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuth } from "@/store/auth-context";
import type { Receipt } from "@/types/grocery";

/* ------------------------------------------------------------------ */
/*  Firestore collection                                               */
/* ------------------------------------------------------------------ */

const TRANSACTIONS_COLLECTION = "transactions";
const transactionsRef = collection(db, TRANSACTIONS_COLLECTION);

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

export interface Transaction {
  id: string;
  receipt: Receipt;
  createdAt: string;
  userId?: string;
}

interface TransactionContextValue {
  transactions: Transaction[];
  loading: boolean;
  /** Save a completed receipt as a transaction. Returns the new ID. */
  saveTransaction: (receipt: Receipt) => Promise<string>;
}

const TransactionContext = createContext<TransactionContextValue | null>(null);

export function TransactionProvider({ children }: PropsWithChildren) {
  const { user, role } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---- Real-time listener scoped by user ---- */
  useEffect(() => {
    const isAdmin = role === "admin";
    const uid = user?.uid;

    console.log(
      "[Transactions] uid:",
      uid,
      "| role:",
      role,
      "| isAdmin:",
      isAdmin,
    );

    // If not admin and no user — nothing to query
    if (!isAdmin && !uid) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    // Admin: single-field orderBy (no composite index needed).
    // User: where('userId') only — sorted client-side to avoid
    // requiring a composite index (userId + createdAt).
    const q = isAdmin
      ? query(transactionsRef, orderBy("createdAt", "desc"))
      : query(transactionsRef, where("userId", "==", uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log(
          "[Transactions] snapshot size:",
          snapshot.size,
          "| uid used:",
          uid,
        );
        const items: Transaction[] = snapshot.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              receipt: data.receipt as Receipt,
              createdAt:
                data.createdAt instanceof Timestamp
                  ? data.createdAt.toDate().toISOString()
                  : (data.createdAt as string),
              userId: data.userId as string | undefined,
            };
          })
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        setTransactions(items);
        setLoading(false);
      },
      (error) => {
        console.error(
          "[Firestore] Transactions listener error:",
          error.code,
          error.message,
        );
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user?.uid, role]);

  /* ---- Save a new transaction (stamped with userId) ---- */
  const saveTransaction = async (receipt: Receipt): Promise<string> => {
    const docRef = await addDoc(transactionsRef, {
      receipt,
      userId: user?.uid ?? null,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  };

  return (
    <TransactionContext.Provider
      value={{ transactions, loading, saveTransaction }}
    >
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions(): TransactionContextValue {
  const ctx = useContext(TransactionContext);
  if (!ctx)
    throw new Error(
      "useTransactions must be used inside <TransactionProvider>",
    );
  return ctx;
}
