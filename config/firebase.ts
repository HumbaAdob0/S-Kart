import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth } from "firebase/auth";
// @ts-expect-error -- getReactNativePersistence is exported from the RN-specific
// entry point of @firebase/auth. Metro resolves it at runtime, but TypeScript
// resolves to the browser types which don't include it.
import { getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * REPLACE these placeholder values with your real Firebase config.
 *
 * Steps:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a project (or select existing)
 * 3. Add a Web app (</> icon)
 * 4. Copy the firebaseConfig object and paste below
 *
 * See the Firebase setup guide at the bottom of this file.
 */
const firebaseConfig = {
  apiKey: "AIzaSyCjcYURsdBGv2L7UHvevGrGUTJ1OgtkZzE",
  authDomain: "smart-cart-37648.firebaseapp.com",
  projectId: "smart-cart-37648",
  storageBucket: "smart-cart-37648.firebasestorage.app",
  messagingSenderId: "903881359220",
  appId: "1:903881359220:web:8fe74d3aa6105154b4f621",
};

/* ------------------------------------------------------------------ */
/*  Initialize Firebase                                                */
/* ------------------------------------------------------------------ */

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/**
 * Firebase Auth instance.
 * Uses AsyncStorage for session persistence in standalone builds.
 * (Expo Go provides its own polyfill, but production APKs do not.)
 */
const auth =
  getApps().length === 1
    ? initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      })
    : getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

/**
 * Helper: check if Firebase has been configured with real credentials.
 * Returns false while placeholder values are still in place.
 */
export function isFirebaseConfigured(): boolean {
  return (
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    firebaseConfig.projectId !== "YOUR_PROJECT_ID"
  );
}
