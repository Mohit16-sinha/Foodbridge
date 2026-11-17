/**
 * FOODBRIDGE - AUTHENTICATION & ROLE MANAGEMENT SERVICE
 * 
 * Handles user authentication, persistent sessions, route guards,
 * live Firebase Authentication (Email/Password & Google Sign-In),
 * and Cloud Firestore profile synchronization.
 */

class FoodBridgeAuth {
  constructor() {
    this.SESSION_KEY = "foodbridge_active_user";
    this.currentUser = this.loadSession();
  }

  loadSession() {
    try {
      if (typeof localStorage === "undefined") return null;
      const data = localStorage.getItem(this.SESSION_KEY) || localStorage.getItem("foodshare_active_user");
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error("[Auth] Error reading session:", e);
      return null;
    }
  }

  saveSession(user) {
    this.currentUser = user;
    if (typeof localStorage === "undefined") return;
    if (user) {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.SESSION_KEY);
      localStorage.removeItem("foodshare_active_user");
    }
  }

  getCurrentUser() {
    return this.currentUser || this.loadSession();
  }

  isAuthenticated() {
    return Boolean(this.getCurrentUser());
  }

  // =========================================================================
  // EMAIL / PASSWORD REGISTRATION
  // =========================================================================
  async register({ name, email, phone, password, confirmPassword, role, regNumber, contactPerson, address, city, vehicle, adminInviteCode }) {
    if (!name || !email || !password || !role) {
      throw new Error("Please fill in all required fields.");
    }

    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }

    if (password !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    const cleanRole = role.toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Prevent unauthorized public admin registration unless valid bootstrap code provided
    if (cleanRole === 'admin' && adminInviteCode !== 'FOODBRIDGE_ADMIN_2026') {
      throw new Error("Admin accounts require a valid platform administrator invite code.");
    } else if (!['donor', 'ngo', 'volunteer', 'admin'].includes(cleanRole)) {
      throw new Error("Invalid role selected. Please choose Donor, NGO, or Volunteer.");
    }

    // 1. Live Firebase Authentication Mode
    if (typeof window !== "undefined" && window.FoodBridgeFirebase && window.FoodBridgeFirebase.isConfigured) {
      const isLive = await window.FoodBridgeFirebase.ensureInitialized();
      if (isLive && window.FoodBridgeFirebase.auth && window.FoodBridgeFirebase.db) {
        try {
          // Create in Firebase Auth
          const cred = await window.FoodBridgeFirebase.auth.createUserWithEmailAndPassword(cleanEmail, password);
          const fbUser = cred.user;

          if (fbUser.updateProfile) {
            await fbUser.updateProfile({ displayName: cleanName });
          }

          // Create full profile in Cloud Firestore
          const profile = {
            id: fbUser.uid,
            uid: fbUser.uid,
            name: cleanName,
            email: cleanEmail,
            role: cleanRole,
            status: cleanRole === 'ngo' ? 'pending' : 'active',
            phone: phone ? phone.trim() : "",
            address: address ? address.trim() : "",
            city: city ? city.trim() : "San Francisco",
            regNumber: regNumber ? regNumber.trim() : "",
            contactPerson: contactPerson ? contactPerson.trim() : "",
            vehicle: vehicle ? vehicle.trim() : "",
            authProvider: "password",
            createdAt: new Date().toISOString()
          };

          await window.FoodBridgeFirebase.db.collection("users").doc(fbUser.uid).set(profile);
          this.saveSession(profile);
          return profile;
        } catch (err) {
          console.error("[Auth] Firebase Registration error:", err);
          if (err.code === "auth/email-already-in-use") {
            throw new Error("This email address is already registered. Please log in.");
          } else if (err.code === "auth/weak-password") {
            throw new Error("Password must be at least 6 characters long.");
          } else if (err.code === "auth/invalid-email") {
            throw new Error("Please enter a valid email address.");
          } else {
            throw new Error(err.message || "Registration failed on Firebase.");
          }
        }
      }
    }

    // 2. LocalStorage Demo Mode Fallback
    const newUser = await window.foodBridgeDB.createUser({
      name: cleanName,
      email: cleanEmail,
      password,
      role: cleanRole,
      status: cleanRole === 'ngo' ? 'pending' : 'active',
      phone: phone ? phone.trim() : "",
      address: address ? address.trim() : "",
      city: city ? city.trim() : "San Francisco",
      regNumber: regNumber ? regNumber.trim() : "",
      contactPerson: contactPerson ? contactPerson.trim() : "",
      vehicle: vehicle ? vehicle.trim() : ""
    });

    this.saveSession(newUser);
    return newUser;
  }

  // =========================================================================
  // EMAIL / PASSWORD LOGIN
  // =========================================================================
  async login(email, password) {
    if (!email || !password) {
      throw new Error("Please enter both email and password.");
    }
    const cleanEmail = email.trim().toLowerCase();

    // 1. Live Firebase Authentication Mode
    if (typeof window !== "undefined" && window.FoodBridgeFirebase && window.FoodBridgeFirebase.isConfigured) {
      const isLive = await window.FoodBridgeFirebase.ensureInitialized();
      if (isLive && window.FoodBridgeFirebase.auth && window.FoodBridgeFirebase.db) {
        try {
          const cred = await window.FoodBridgeFirebase.auth.signInWithEmailAndPassword(cleanEmail, password);
          const uid = cred.user.uid;

          // Fetch profile from Firestore
          const docSnap = await window.FoodBridgeFirebase.db.collection("users").doc(uid).get();
          let profile = null;

          if (docSnap.exists) {
            profile = { id: docSnap.id, ...docSnap.data() };
          } else {
            // Document not yet in Firestore (e.g. created directly in console)
            profile = {
              id: uid,
              uid: uid,
              name: cred.user.displayName || "User",
              email: cleanEmail,
              role: cleanEmail.includes("admin") ? "admin" : (cleanEmail.includes("ngo") ? "ngo" : "donor"),
              status: "active",
              phone: "",
              city: "San Francisco",
              createdAt: new Date().toISOString()
            };
            await window.FoodBridgeFirebase.db.collection("users").doc(uid).set(profile);
          }

          if (profile.status === 'deactivated') {
            await window.FoodBridgeFirebase.auth.signOut();
            throw new Error("Your account has been deactivated by the platform administrator.");
          }

          this.saveSession(profile);
          return profile;
        } catch (err) {
          console.error("[Auth] Firebase Login error:", err);
          if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
            throw new Error("Invalid email or password. Please try again.");
          } else if (err.code === "auth/too-many-requests") {
            throw new Error("Access temporarily disabled due to multiple failed login attempts. Reset your password or try again later.");
          } else {
            throw new Error(err.message || "Authentication failed on Firebase.");
          }
        }
      }
    }

    // 2. LocalStorage Demo Mode Fallback
    const user = await window.foodBridgeDB.getUserByEmail(cleanEmail);
    if (!user) {
      throw new Error("No account found with this email address.");
    }

    if (user.password !== password) {
      throw new Error("Incorrect password. Please try again.");
    }

    if (user.status === 'deactivated') {
      throw new Error("Your account has been deactivated by the platform administrator.");
    }

    this.saveSession(user);
    return user;
  }

  // =========================================================================
  // GOOGLE AUTHENTICATION (SIGN-IN & SIGN-UP)
  // Supports Donor, NGO, Volunteer, and Admin
  // =========================================================================
  async loginWithGoogle(intendedRole = null, additionalFields = {}) {
    // 1. Live Firebase Authentication with Google Provider
    if (typeof window !== "undefined" && window.FoodBridgeFirebase && window.FoodBridgeFirebase.isConfigured) {
      const isLive = await window.FoodBridgeFirebase.ensureInitialized();
      if (isLive && window.FoodBridgeFirebase.auth && window.FoodBridgeFirebase.db && window.firebase) {
        try {
          const provider = new window.firebase.auth.GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });

          const cred = await window.FoodBridgeFirebase.auth.signInWithPopup(provider);
          const fbUser = cred.user;
          const uid = fbUser.uid;

          // Check if user record already exists in Firestore
          const docSnap = await window.FoodBridgeFirebase.db.collection("users").doc(uid).get();

          if (docSnap.exists) {
            // Existing user
            const profile = { id: docSnap.id, ...docSnap.data() };

            if (profile.status === 'deactivated') {
              await window.FoodBridgeFirebase.auth.signOut();
              throw new Error("Your account has been deactivated by the platform administrator.");
            }

            this.saveSession(profile);
            return { isNew: false, user: profile };
          } else {
            // New user via Google Auth
            if (intendedRole) {
              const cleanRole = intendedRole.toLowerCase();
              const profile = {
                id: uid,
                uid: uid,
                name: fbUser.displayName || additionalFields.name || "Google User",
                email: (fbUser.email || "").toLowerCase(),
                avatar: fbUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(fbUser.displayName || "User")}&background=11332B&color=fff`,
                role: cleanRole,
                status: cleanRole === 'ngo' ? 'pending' : 'active',
                phone: additionalFields.phone ? additionalFields.phone.trim() : "",
                address: additionalFields.address ? additionalFields.address.trim() : "",
                city: additionalFields.city ? additionalFields.city.trim() : "San Francisco",
                regNumber: additionalFields.regNumber ? additionalFields.regNumber.trim() : "",
                contactPerson: additionalFields.contactPerson ? additionalFields.contactPerson.trim() : "",
                vehicle: additionalFields.vehicle ? additionalFields.vehicle.trim() : "",
                authProvider: "google",
                createdAt: new Date().toISOString()
              };

              await window.FoodBridgeFirebase.db.collection("users").doc(uid).set(profile);
              this.saveSession(profile);
              return { isNew: true, user: profile };
            } else {
              // Role is not yet specified - return signal to UI to prompt role selection modal
              return {
                isNew: true,
                requiresRole: true,
                fbUser: {
                  uid: uid,
                  displayName: fbUser.displayName || "",
                  email: fbUser.email || "",
                  photoURL: fbUser.photoURL || ""
                }
              };
            }
          }
        } catch (err) {
          console.error("[Auth] Google Sign-in error:", err);
          if (err.code === "auth/popup-closed-by-user") {
            throw new Error("Google sign-in popup was closed before completing.");
          } else if (err.code === "auth/popup-blocked") {
            throw new Error("Sign-in popup was blocked by your browser. Please allow popups for this site.");
          } else if (err.code === "auth/cancelled-popup-request") {
            throw new Error("Previous sign-in request was cancelled.");
          } else {
            throw new Error(err.message || "Failed to sign in with Google.");
          }
        }
      }
    }

    // 2. Fallback / Simulated Google Sign-In (when Firebase credentials not configured)
    console.log("[Auth] Simulating Google Sign-In in demo mode...");
    const simEmail = "google.user@foodbridge.demo";
    let simUser = await window.foodBridgeDB.getUserByEmail(simEmail);

    if (simUser) {
      this.saveSession(simUser);
      return { isNew: false, user: simUser };
    } else {
      if (intendedRole) {
        simUser = await window.foodBridgeDB.createUser({
          name: "Alex Rivera (Google)",
          email: simEmail,
          password: "google_oauth_token",
          role: intendedRole.toLowerCase(),
          status: intendedRole.toLowerCase() === 'ngo' ? 'pending' : 'active',
          phone: "+1 (555) 789-4321",
          city: "San Francisco",
          address: "123 Green Way",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
        });
        this.saveSession(simUser);
        return { isNew: true, user: simUser };
      } else {
        return {
          isNew: true,
          requiresRole: true,
          fbUser: {
            uid: "usr_sim_google_" + Date.now(),
            displayName: "Alex Rivera",
            email: simEmail,
            photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
          }
        };
      }
    }
  }

  // Completes profile setup for a new Google authenticated user
  async completeGoogleRegistration(fbUserData, role, details = {}) {
    const cleanRole = role.toLowerCase();
    const uid = fbUserData.uid;

    if (cleanRole === 'admin' && details.adminInviteCode !== 'FOODBRIDGE_ADMIN_2026') {
      throw new Error("Admin accounts require a valid platform administrator invite code.");
    }

    const profile = {
      id: uid,
      uid: uid,
      name: details.name || fbUserData.displayName || "Google User",
      email: (fbUserData.email || "").toLowerCase(),
      avatar: fbUserData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(details.name || fbUserData.displayName || "User")}&background=11332B&color=fff`,
      role: cleanRole,
      status: cleanRole === 'ngo' ? 'pending' : 'active',
      phone: details.phone ? details.phone.trim() : "",
      address: details.address ? details.address.trim() : "",
      city: details.city ? details.city.trim() : "San Francisco",
      regNumber: details.regNumber ? details.regNumber.trim() : "",
      contactPerson: details.contactPerson ? details.contactPerson.trim() : "",
      vehicle: details.vehicle ? details.vehicle.trim() : "",
      authProvider: "google",
      createdAt: new Date().toISOString()
    };

    if (typeof window !== "undefined" && window.FoodBridgeFirebase && window.FoodBridgeFirebase.isLive && window.FoodBridgeFirebase.db) {
      await window.FoodBridgeFirebase.db.collection("users").doc(uid).set(profile);
    } else {
      await window.foodBridgeDB.createUser(profile);
    }

    this.saveSession(profile);
    return profile;
  }

  // =========================================================================
  // LOGOUT
  // =========================================================================
  async logout() {
    if (typeof window !== "undefined" && window.FoodBridgeFirebase && window.FoodBridgeFirebase.auth) {
      try {
        await window.FoodBridgeFirebase.auth.signOut();
      } catch (e) {
        console.warn("[Auth] Firebase sign-out warning:", e);
      }
    }
    this.saveSession(null);
    if (typeof window !== "undefined") {
      window.location.href = "/login.html";
    }
  }

  // =========================================================================
  // PASSWORD RESET
  // =========================================================================
  async resetPassword(email) {
    const cleanEmail = email.trim().toLowerCase();
    if (typeof window !== "undefined" && window.FoodBridgeFirebase && window.FoodBridgeFirebase.isConfigured) {
      const isLive = await window.FoodBridgeFirebase.ensureInitialized();
      if (isLive && window.FoodBridgeFirebase.auth) {
        await window.FoodBridgeFirebase.auth.sendPasswordResetEmail(cleanEmail);
        return true;
      }
    }
    return true;
  }

  // Backward compatible evaluation login
  async loginDemo(role) {
    const demoEmails = {
      donor: "donor@foodbridge.demo",
      ngo: "ngo@foodbridge.demo",
      volunteer: "volunteer@foodbridge.demo",
      admin: "admin@foodbridge.demo"
    };

    const email = demoEmails[role.toLowerCase()];
    if (!email) throw new Error("Invalid demo role.");

    const user = await this.login(email, "demo123");
    this.redirectByRole(user.role);
    return user;
  }

  redirectByRole(role) {
    if (typeof window === "undefined") return;
    switch ((role || "").toLowerCase()) {
      case "donor":
        window.location.href = "/donor/dashboard.html";
        break;
      case "ngo":
        window.location.href = "/ngo/dashboard.html";
        break;
      case "volunteer":
        window.location.href = "/volunteer/dashboard.html";
        break;
      case "admin":
        window.location.href = "/admin/dashboard.html";
        break;
      default:
        window.location.href = "/index.html";
    }
  }

  requireAuth(allowedRole = null) {
    const user = this.getCurrentUser();

    if (!user) {
      if (typeof window !== "undefined") {
        const currentPath = encodeURIComponent(window.location.pathname);
        if (allowedRole === 'admin' || window.location.pathname.toLowerCase().includes('/admin/')) {
          window.location.href = `/admin-login.html?redirect=${currentPath}`;
        } else {
          window.location.href = `/login.html?redirect=${currentPath}`;
        }
      }
      return null;
    }

    if (allowedRole && user.role.toLowerCase() !== allowedRole.toLowerCase()) {
      console.warn(`[Auth Guard] Unauthorized access attempt for role '${allowedRole}' by user with role '${user.role}'. Redirecting...`);
      this.redirectByRole(user.role);
      return null;
    }

    return user;
  }
}

// Global Auth Singletons
window.foodBridgeAuth = new FoodBridgeAuth();
window.foodShareAuth = window.foodBridgeAuth;
