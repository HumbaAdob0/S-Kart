import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  increment,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import type { Product } from "@/types/grocery";

/* ------------------------------------------------------------------ */
/*  Firestore collection reference                                     */
/* ------------------------------------------------------------------ */

const PRODUCTS_COLLECTION = "products";
const productsRef = collection(db, PRODUCTS_COLLECTION);

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

interface ProductContextValue {
  products: Product[];
  /** True while loading initial data from Firestore */
  loading: boolean;
  addProduct: (product: Omit<Product, "id">) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  /** Deduct stock for multiple items in a single batch write */
  deductStock: (
    items: { productId: string; quantity: number }[],
  ) => Promise<void>;
  findByBarcode: (barcode: string) => Product | undefined;
  getCategories: () => string[];
}

const ProductContext = createContext<ProductContextValue | null>(null);

export function ProductProvider({ children }: PropsWithChildren) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---- Real-time listener to Firestore ---- */
  useEffect(() => {
    const unsubscribe = onSnapshot(
      productsRef,
      (snapshot) => {
        const items: Product[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Product, "id">),
        }));
        // Sort alphabetically by name
        items.sort((a, b) => a.name.localeCompare(b.name));
        setProducts(items);
        setLoading(false);
      },
      (error) => {
        console.error("[Firestore] Products listener error:", error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  /* ---- CRUD operations ---- */

  const addProduct = async (data: Omit<Product, "id">) => {
    await addDoc(productsRef, {
      barcode: data.barcode,
      name: data.name,
      price: data.price,
      category: data.category,
      stock: data.stock,
    });
  };

  const updateProduct = async (product: Product) => {
    const ref = doc(db, PRODUCTS_COLLECTION, product.id);
    await updateDoc(ref, {
      barcode: product.barcode,
      name: product.name,
      price: product.price,
      category: product.category,
      stock: product.stock,
    });
  };

  const deleteProduct = async (productId: string) => {
    const ref = doc(db, PRODUCTS_COLLECTION, productId);
    await deleteDoc(ref);
  };

  /** Deduct stock for multiple items in a single atomic batch */
  const deductStock = async (
    items: { productId: string; quantity: number }[],
  ) => {
    const batch = writeBatch(db);
    for (const { productId, quantity } of items) {
      const ref = doc(db, PRODUCTS_COLLECTION, productId);
      batch.update(ref, { stock: increment(-quantity) });
    }
    await batch.commit();
  };

  const findByBarcode = (barcode: string) => {
    return products.find((p) => p.barcode === barcode);
  };

  const getCategories = () => {
    return [...new Set(products.map((p) => p.category))].sort();
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        loading,
        addProduct,
        updateProduct,
        deleteProduct,
        deductStock,
        findByBarcode,
        getCategories,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts(): ProductContextValue {
  const ctx = useContext(ProductContext);
  if (!ctx)
    throw new Error("useProducts must be used inside <ProductProvider>");
  return ctx;
}
