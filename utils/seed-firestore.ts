import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { defaultProducts } from "@/data/products";

const PRODUCTS_COLLECTION = "products";

/**
 * Seed Firestore with the default product catalog.
 * Only adds products if the collection is empty.
 * Returns the number of products added.
 */
export async function seedProducts(): Promise<number> {
  const ref = collection(db, PRODUCTS_COLLECTION);
  const snapshot = await getDocs(ref);

  if (!snapshot.empty) {
    console.log(
      `[Seed] Firestore already has ${snapshot.size} products. Skipping seed.`,
    );
    return 0;
  }

  const batch = writeBatch(db);

  for (const product of defaultProducts) {
    const docRef = doc(ref); // auto-generate ID
    batch.set(docRef, {
      barcode: product.barcode,
      name: product.name,
      price: product.price,
      category: product.category,
      stock: product.stock,
    });
  }

  await batch.commit();
  console.log(`[Seed] Added ${defaultProducts.length} products to Firestore.`);
  return defaultProducts.length;
}
