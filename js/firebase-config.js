/**
 * FOODBRIDGE - FIREBASE CONFIGURATION & INITIALIZATION ENGINE
 * 
 * Supports Live Production Firebase (Auth, Cloud Firestore, Firebase Storage)
 * with automatic fallback to LocalStorage Demo Engine if unconfigured or offline.
 */

// 1. Base Configuration Template
// You can either replace these values directly or use the in-app "Connect Firebase" UI dialog.
const defaultFirebaseConfig = {
  apiKey: "AIzaSyDhkomz5d2yB7ZzFT0Z2tYR2-s3mLKd3i0",
  authDomain: "foodbridge-98832.firebaseapp.com",
  projectId: "foodbridge-98832",
  storageBucket: "foodbridge-98832.firebasestorage.app",
  messagingSenderId: "70088797257",
  appId: "1:70088797257:web:cdaadaecff37ebaff1a398",
  measurementId: "G-7V67DZ6MF0"
};

// 2. Load stored config if user configured via UI, else use file config
function getActiveConfig() {
  try {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("foodbridge_firebase_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.apiKey && parsed.apiKey !== "YOUR_FIREBASE_API_KEY" && parsed.projectId && parsed.projectId !== "foodbridge-demo") {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn("[Firebase] Could not read stored config:", e);
  }
  return defaultFirebaseConfig;
}

const activeConfig = getActiveConfig();

// Check if valid credentials are provided
function checkIsConfigured(cfg) {
  return Boolean(
    cfg &&
    cfg.apiKey && 
    cfg.apiKey !== "YOUR_FIREBASE_API_KEY" && 
    cfg.projectId && 
    cfg.projectId !== "foodbridge-demo" &&
    !cfg.apiKey.includes("YOUR_")
  );
}

const isConfigured = checkIsConfigured(activeConfig);

// Dynamic Script Loader for Firebase Compat SDK (v10.8.0)
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") return resolve();
    if (document.querySelector(`script[src="${src}"]`)) {
      return resolve();
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load Firebase script: ${src}`));
    document.head.appendChild(script);
  });
}

let initPromise = null;

async function ensureInitialized() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const currentCfg = getActiveConfig();
    const configured = checkIsConfigured(currentCfg);

    if (!configured) {
      window.FoodBridgeFirebase.isConfigured = false;
      window.FoodBridgeFirebase.isLive = false;
      return false;
    }

    try {
      // Load Firebase v10 CDN scripts sequentially/in parallel
      if (typeof window !== "undefined" && typeof window.firebase === "undefined") {
        await loadScript("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
        await Promise.all([
          loadScript("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js"),
          loadScript("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js"),
          loadScript("https://www.gstatic.com/firebasejs/10.8.0/firebase-storage-compat.js")
        ]);
      }

      if (typeof window !== "undefined" && window.firebase) {
        if (!window.firebase.apps.length) {
          window.firebase.initializeApp(currentCfg);
        }

        window.FoodBridgeFirebase.app = window.firebase.app();
        window.FoodBridgeFirebase.auth = window.firebase.auth();
        window.FoodBridgeFirebase.db = window.firebase.firestore();
        window.FoodBridgeFirebase.storage = window.firebase.storage();
        window.FoodBridgeFirebase.isConfigured = true;
        window.FoodBridgeFirebase.isLive = true;

        console.log(`%c[FoodBridge Firebase]%c Connected to Live Project: ${currentCfg.projectId}`, 'color: #34D399; font-weight: bold;', 'color: #11332B;');
        return true;
      }
    } catch (err) {
      console.warn("[FoodBridge Firebase] Live connection failed. Falling back to LocalStorage Demo Engine:", err.message);
      window.FoodBridgeFirebase.isLive = false;
      return false;
    }

    return false;
  })();

  return initPromise;
}

// Global Firebase Controller Object
window.FoodBridgeFirebase = {
  isConfigured: isConfigured,
  isLive: false,
  config: activeConfig,
  app: null,
  auth: null,
  db: null,
  storage: null,
  ensureInitialized: ensureInitialized,

  // Save new credentials and reload
  saveConfig: function(newConfig) {
    if (!checkIsConfigured(newConfig)) {
      throw new Error("Invalid Firebase Configuration. Please provide valid apiKey and projectId.");
    }
    localStorage.setItem("foodbridge_firebase_config", JSON.stringify(newConfig));
    window.location.reload();
  },

  // Clear credentials and revert to Demo mode
  clearConfig: function() {
    localStorage.removeItem("foodbridge_firebase_config");
    window.location.reload();
  }
};

// Backward-compatible alias
window.FoodShareFirebase = window.FoodBridgeFirebase;

// Auto-trigger initialization in browser
if (typeof window !== "undefined" && isConfigured) {
  ensureInitialized().catch(e => console.warn("[Firebase init]", e));
} else {
  console.log(
    `%c[FoodBridge]%c Running in LocalStorage Demo Engine Mode (No live Firebase credentials configured)`,
    'color: #227150; font-weight: bold;',
    'color: #11332B;'
  );
}
