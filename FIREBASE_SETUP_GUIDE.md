# 🔥 FoodBridge – Production Firebase Setup Guide

This guide walks you through connecting **FoodBridge** to a live **Google Firebase** project so you can run it as a production-level, multi-user web application with real-time **Authentication**, **Cloud Firestore**, and **Firebase Storage**.

---

## 📋 Prerequisites
- A Google account to access the [Firebase Console](https://console.firebase.google.com/).
- A modern web browser.

---

## 🚀 Step 1: Create a Firebase Project
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or **Create a project**).
3. Enter a project name (e.g., `foodbridge-live`).
4. (Optional) Disable Google Analytics if not needed, then click **Create project**.
5. Once ready, click **Continue**.

---

## 🔐 Step 2: Enable Firebase Authentication & Google Sign-In
FoodBridge supports both **Email/Password** and **Google One-Click Authentication** for Donors, NGOs, Volunteers, and Admins:

### 2A. Enable Email/Password
1. In the left navigation menu, go to **Build > Authentication**.
2. Click **Get started**.
3. Under the **Sign-in method** tab, click on **Email/Password**.
4. Enable the **Email/Password** toggle (keep Email link disabled).
5. Click **Save**.

### 2B. Enable Google Sign-In (For 1-Click Login & Registration)
1. Still under the **Sign-in method** tab, click **Add new provider**.
2. Click **Google**.
3. Enable the **Enable** toggle.
4. Select your support email in the **Project support email** dropdown.
5. Click **Save**.
*(Google Sign-in is now immediately active across FoodBridge's login and registration pages!)*

---

## 🗄️ Step 3: Create Cloud Firestore Database
FoodBridge stores users, food listings, donation requests, volunteer tasks, and notifications in Cloud Firestore:
1. In the left navigation menu, go to **Build > Firestore Database**.
2. Click **Create database**.
3. Choose your database location (pick a region closest to your users, e.g. `us-central1`, `asia-south1`, etc.).
4. Select **Start in production mode** and click **Create**.
5. Once created, click on the **Rules** tab at the top.
6. Replace the existing rules with the contents of [`firestore.rules`](./firestore.rules) located in this project directory:
   ```javascript
   // Copy and paste the entire contents of firestore.rules
   ```
7. Click **Publish** to enforce role-based access control and prevent unapproved NGOs from requesting surplus food.

---

## 📦 Step 4: Enable Firebase Storage (for Food Photos)
FoodBridge allows donors to upload real photos of surplus food:
1. In the left navigation menu, go to **Build > Storage**.
2. Click **Get started**.
3. Accept the default security rules for now and select the same region as Firestore.
4. Click **Done**.
5. Once created, go to the **Rules** tab at the top.
6. Replace the rules with the contents of [`storage.rules`](./storage.rules) located in this project directory:
   ```javascript
   // Copy and paste the entire contents of storage.rules
   ```
7. Click **Publish**.

---

## 🔑 Step 5: Get Your Web App Credentials
1. Click the **Gear icon (⚙)** in the top left next to **Project Overview** and select **Project settings**.
2. Scroll down to the **Your apps** section.
3. Click the **Web** icon (`</>`).
4. Enter an App nickname (e.g., `FoodBridge Web`).
5. (Optional) Check "Also set up Firebase Hosting" if you plan to deploy with Firebase Hosting.
6. Click **Register app**.
7. Firebase will display your `firebaseConfig` object:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyD-EXAMPLE-KEY",
     authDomain: "foodbridge-live.firebaseapp.com",
     projectId: "foodbridge-live",
     storageBucket: "foodbridge-live.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef123456"
   };
   ```

---

## ⚡ Step 6: Connect FoodBridge to Your Firebase Project

You have two easy ways to connect:

### Method A: In-App Connection UI (Easiest)
1. Open FoodBridge in your browser (e.g., `http://localhost:3000` or your live URL).
2. Look at the top banner and click **[⚙ Connect Firebase]**.
3. In the dialog, paste the config code snippet into the textarea, or enter your **API Key** and **Project ID** manually.
4. Click **Save & Connect Firebase**.
5. The application will reload, automatically connect to your project, and display:
   `🟢 FIREBASE PRODUCTION (Project: your-project-id)`.

### Method B: Code File Configuration
1. Open [`js/firebase-config.js`](./js/firebase-config.js) in your editor.
2. Replace the values in `defaultFirebaseConfig` with your real keys:
   ```javascript
   const defaultFirebaseConfig = {
     apiKey: "YOUR_ACTUAL_API_KEY",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   };
   ```
3. Save the file and refresh your browser.

---

## 🌱 Step 7: Pre-populate Firestore with Initial Demo Data
To test all features immediately without manually typing records:
1. In the top banner, click **[⚙ Firebase Settings]**.
2. Click the button: **[🌱 Seed Firestore with Demo Data]**.
3. FoodBridge will automatically batch-write the verified NGO profiles, sample listings, and workflows into your live Firestore collections!

---

## 🛡️ Step 8: Creating the Platform Administrator (Secure Bootstrap)
As required for enterprise security, Admin accounts **cannot** be created through public registration.

To set up your primary Platform Administrator:
1. Go to the [Firebase Console > Authentication > Users](https://console.firebase.google.com/).
2. Click **Add user**.
3. Enter your administrator email (e.g., `admin@foodbridge.com`) and a strong password.
4. Copy the newly created user's **UID**.
5. Go to **Firestore Database > Data > users** collection.
6. Click **Add document**:
   - **Document ID**: Paste the exact **UID** from step 4.
   - **Fields**:
     - `id` (string): `<UID>`
     - `name` (string): `Platform Administrator`
     - `email` (string): `admin@foodbridge.com`
     - `role` (string): `admin`
     - `status` (string): `active`
     - `createdAt` (string): Current ISO timestamp
7. Now you can log in at `/login.html` with this email and password, and you will be directed straight to the **Admin Dashboard**!

---

## 🌐 Deploying to Firebase Hosting (Production)
If you want to host FoodBridge on Google's global CDN:
1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
2. Log in and initialize hosting in your project root:
   ```bash
   firebase login
   firebase init hosting
   ```
   - Select your Firebase Project.
   - Set public directory to: `.` (current directory).
   - Configure as single-page app? `No` (since FoodBridge uses multi-page HTML architecture).
3. Deploy in one command:
   ```bash
   firebase deploy
   ```
4. Your site will be live at `https://<your-project-id>.web.app`!

