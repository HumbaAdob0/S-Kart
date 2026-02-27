# S-Kart — Deployment & Firebase Setup Guide

Complete guide to configure Firebase from scratch and build the S-Kart APK.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Firebase Project Setup](#2-firebase-project-setup)
3. [Enable Firebase Authentication](#3-enable-firebase-authentication)
4. [Set Up Cloud Firestore](#4-set-up-cloud-firestore)
5. [Create Firestore Collections & Rules](#5-create-firestore-collections--rules)
6. [Create User Accounts & Assign Roles](#6-create-user-accounts--assign-roles)
7. [Update App Firebase Config](#7-update-app-firebase-config)
8. [Build the APK](#8-build-the-apk)
9. [Post-Build Checklist](#9-post-build-checklist)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Tool         | Version | Install                  |
| ------------ | ------- | ------------------------ |
| Node.js      | ≥ 18    | https://nodejs.org       |
| npm          | ≥ 9     | Comes with Node.js       |
| EAS CLI      | ≥ 18    | `npm install -g eas-cli` |
| Expo account | Free    | https://expo.dev/signup  |

```bash
# Verify installations
node -v        # should print v18+
eas --version  # should print 18+
eas login      # sign in to your Expo account
```

---

## 2. Firebase Project Setup

1. Go to **[Firebase Console](https://console.firebase.google.com)**.
2. Click **"Add project"** (or select existing project `smart-cart-37648`).
3. Enter a project name (e.g., `smart-cart-37648`).
4. Disable Google Analytics (optional — not needed for S-Kart).
5. Click **"Create project"**.

### Register a Web App

6. In the project dashboard, click the **Web icon** (`</>`) to add a web app.
7. Enter a nickname: `S-Kart`.
8. **Do NOT** check "Firebase Hosting".
9. Click **"Register app"**.
10. You'll see a `firebaseConfig` object — **copy these values**:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

> Keep this page open — you'll paste these values in [Step 7](#7-update-app-firebase-config).

---

## 3. Enable Firebase Authentication

1. In the Firebase Console sidebar, go to **Build → Authentication**.
2. Click **"Get started"**.
3. Under **Sign-in method**, click **"Email/Password"**.
4. Toggle **Enable** to ON.
5. Leave **"Email link (passwordless sign-in)"** OFF.
6. Click **"Save"**.

---

## 4. Set Up Cloud Firestore

1. In the sidebar, go to **Build → Firestore Database**.
2. Click **"Create database"**.
3. Choose a location closest to your users (e.g., `asia-southeast1` for Philippines).
   > ⚠️ **This cannot be changed later.** Choose carefully.
4. Select **"Start in test mode"** for now (we'll set proper rules next).
5. Click **"Create"**.

---

## 5. Create Firestore Collections & Rules

### Collections Used by S-Kart

| Collection     | Purpose          | Document Fields                                              |
| -------------- | ---------------- | ------------------------------------------------------------ |
| `products`     | Product catalog  | `name`, `barcode`, `price`, `stock`, `category`, `createdAt` |
| `transactions` | Purchase history | `receipt`, `userId`, `createdAt`                             |
| `users`        | User roles       | `role` ("admin" or "user")                                   |

### Set Firestore Security Rules

1. Go to **Firestore Database → Rules** tab.
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Products: anyone authenticated can read, only admins can write
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }

    // Transactions: users can read their own, admins can read all
    match /transactions/{transactionId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null
        && (resource.data.userId == request.auth.uid
            || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin");
      allow update, delete: if false;
    }

    // Users: each user can read their own doc, only admins can write
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }
  }
}
```

3. Click **"Publish"**.

---

## 6. Create User Accounts & Assign Roles

### Step A: Create Authentication Users

1. Go to **Authentication → Users** tab.
2. Click **"Add user"**.
3. Create your **admin** account:
   - Email: `admin@skart.com` (or your email)
   - Password: choose a strong password
4. Click **"Add user"**.
5. **Copy the User UID** shown in the table (e.g., `aBcDeFgHiJkLmNoPqRsT`).
6. (Optional) Create a regular **user** account the same way.

### Step B: Create the Role Document in Firestore

1. Go to **Firestore Database → Data** tab.
2. Click **"Start collection"**.
3. Collection ID: `users` → Click **"Next"**.
4. Document ID: **paste the admin's UID** from Step A.
5. Add a field:
   - Field name: `role`
   - Type: `string`
   - Value: `admin`
6. Click **"Save"**.

For regular users, either:

- Don't create a doc (defaults to `"user"` role), or
- Create a doc with `role: "user"`.

### Step C: (Optional) Create a Composite Index

The app's transaction history for regular users uses `where("userId") + sort by createdAt`. The app handles this client-side, but if you want Firestore to sort server-side, create this index:

1. Go to **Firestore Database → Indexes** tab.
2. Click **"Create index"** under **Composite**.
3. Collection ID: `transactions`
4. Add fields:
   - `userId` — Ascending
   - `createdAt` — Descending
5. Click **"Create"**.

> The index takes a few minutes to build. The app works without it.

---

## 7. Update App Firebase Config

Open `config/firebase.ts` and replace the config values with your Firebase project's values from [Step 2](#2-firebase-project-setup):

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // from Firebase Console
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

> The current config already points to `smart-cart-37648`. If that's your project, skip this step.

---

## 8. Build the APK

### First-Time Setup

```bash
cd /path/to/S-Kart

# Install dependencies (if not done)
npm install

# Login to Expo
eas login

# Configure EAS (already done — eas.json exists)
# eas build:configure
```

### Build Preview APK (recommended for testing)

```bash
eas build --platform android --profile preview
```

This builds a `.apk` file in the cloud (~10-15 minutes). When complete, EAS provides a **download URL**.

### Build Production AAB (for Google Play Store)

```bash
eas build --platform android --profile production
```

This builds a `.aab` file for upload to the [Google Play Console](https://play.google.com/console).

### Install the APK

1. Download the `.apk` from the URL EAS gives you.
2. Transfer to your Android phone (USB, Google Drive, direct download, etc.).
3. Open it — Android will prompt to install from unknown sources.
4. Enable it and install.

---

## 9. Post-Build Checklist

### Restrict your Firebase API Key

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Find the API key matching `apiKey` in your Firebase config.
3. Under **Application restrictions**:
   - Select **"Android apps"**.
   - Add your package name: `com.humbaadobo.Skart`
   - Add the SHA-1 fingerprint from EAS:
     ```bash
     eas credentials --platform android
     ```
4. Under **API restrictions**, restrict to:
   - Cloud Firestore API
   - Firebase Auth API
   - Firebase Installations API

### Seed Products (first run)

1. Open the built app and log in as admin.
2. In the **Admin** tab, tap **"Seed DB"** to populate sample products.
3. Or manually add products from the admin dashboard.

### ESP32 LCD (optional)

The ESP32 connects over local WiFi. Make sure:

- The phone and ESP32 are on the **same WiFi network**.
- Enter the ESP32's IP address in the Admin tab's ESP32 panel.

---

## 10. Troubleshooting

### Build Fails: "Cannot access file at ./assets/images/..."

The icon PNG files are missing. Generate placeholder icons:

```bash
# From project root
node -e "
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const dir = './assets/images';
function png(w,h,r,g,b){
  const rb=w*4+1,raw=Buffer.alloc(rb*h);
  for(let y=0;y<h;y++){raw[y*rb]=0;for(let x=0;x<w;x++){const o=y*rb+1+x*4;raw[o]=r;raw[o+1]=g;raw[o+2]=b;raw[o+3]=255;}}
  const d=zlib.deflateSync(raw),sig=Buffer.from([137,80,78,71,13,10,26,10]);
  function ch(t,data){const l=Buffer.alloc(4);l.writeUInt32BE(data.length);const tb=Buffer.from(t),cd=Buffer.concat([tb,data]),c=Buffer.alloc(4);let v=0xFFFFFFFF;for(let i=0;i<cd.length;i++){v^=cd[i];for(let j=0;j<8;j++)v=(v>>>1)^(v&1?0xEDB88320:0);}c.writeUInt32BE((v^0xFFFFFFFF)>>>0);return Buffer.concat([l,tb,data,c]);}
  const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=6;
  return Buffer.concat([sig,ch('IHDR',ih),ch('IDAT',d),ch('IEND',Buffer.alloc(0))]);
}
fs.writeFileSync(path.join(dir,'icon.png'),png(1024,1024,76,175,80));
fs.writeFileSync(path.join(dir,'android-icon-foreground.png'),png(1024,1024,76,175,80));
fs.writeFileSync(path.join(dir,'android-icon-background.png'),png(1024,1024,230,244,254));
fs.writeFileSync(path.join(dir,'android-icon-monochrome.png'),png(1024,1024,76,175,80));
fs.writeFileSync(path.join(dir,'favicon.png'),png(48,48,76,175,80));
fs.writeFileSync(path.join(dir,'splash-icon.png'),png(200,200,76,175,80));
console.log('Icons created');
"
```

Then re-run `eas build`.

### Auth Not Persisting After App Restart

This is fixed in `config/firebase.ts` — Firebase Auth now uses `AsyncStorage` for persistence via `getReactNativePersistence`. If you still see issues:

```bash
# Clear cache and rebuild
npx expo start --clear
```

### "Missing or insufficient permissions" from Firestore

- Check that Firestore rules are published (Step 5).
- Check that the user has a `users/{uid}` document with `role` field (Step 6).
- Admin operations require `role: "admin"`.

### Transactions Not Showing for Regular Users

Old transactions created before the `userId` field was added won't appear for regular users (they have no `userId`). Only new transactions after the fix will show.

### EAS Build Queue is Slow

Free tier builds may queue. To speed up:

- Upgrade to EAS Priority plan, or
- Build locally with `npx expo run:android` (requires Android Studio + Java SDK).

---

## Project Structure (for reference)

```
S-Kart/
├── app.json              ← Expo config (icons, permissions, plugins)
├── eas.json              ← EAS Build profiles
├── config/
│   └── firebase.ts       ← Firebase connection config ← EDIT THIS
├── store/
│   ├── auth-context.tsx   ← Authentication + role management
│   ├── cart-context.tsx   ← Shopping cart (local state)
│   ├── product-context.tsx ← Products (Firestore)
│   └── transaction-context.tsx ← Transaction history (Firestore)
├── app/
│   ├── _layout.tsx        ← Root layout (auth gate, providers)
│   ├── receipt.tsx        ← Receipt modal
│   └── (tabs)/
│       ├── _layout.tsx    ← Tab navigation
│       ├── cart.tsx       ← Cart screen
│       ├── admin.tsx      ← Admin dashboard
│       ├── history.tsx    ← Transaction history
│       └── index.tsx      ← Barcode scanner
├── services/
│   └── esp32.ts          ← ESP32 WebSocket connection
└── esp32/
    └── s_kart_lcd/       ← Arduino firmware for ESP32+LCD
```

---

## Quick Command Reference

```bash
# Development (Expo Go)
npx expo start

# Type check
npx tsc --noEmit

# Build APK (sideloadable)
eas build --platform android --profile preview

# Build AAB (Play Store)
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android

# OTA update (JS changes only, no native code changes)
eas update --branch production --message "description of update"

# Check build status
eas build:list
```
