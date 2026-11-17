/**
 * FOODBRIDGE - UNIFIED DATABASE SERVICE
 * 
 * Provides an asynchronous database interface that handles all operations for
 * Users, Food Listings, Donation Requests, Volunteer Tasks, and Notifications.
 * 
 * In Demo Mode: Performs full relational integrity and transactional safety over LocalStorage.
 * In Firebase Mode: Directly reads and writes to Cloud Firestore, Firebase Auth, and Storage.
 */

class FoodBridgeDB {
  constructor() {
    this.STORAGE_KEYS = {
      USERS: "foodbridge_users",
      LISTINGS: "foodbridge_listings",
      REQUESTS: "foodbridge_requests",
      TASKS: "foodbridge_tasks",
      NOTIFICATIONS: "foodbridge_notifications",
      REPORTS: "foodbridge_reports",
      INITIALIZED: "foodbridge_initialized_v3"
    };

    this.initDatabase();
  }

  // Detect whether live Firebase connection is active
  _isFirebaseLive() {
    return Boolean(
      typeof window !== "undefined" &&
      window.FoodBridgeFirebase &&
      window.FoodBridgeFirebase.isConfigured &&
      window.FoodBridgeFirebase.isLive &&
      window.FoodBridgeFirebase.db
    );
  }

  // Initialize or reset with clean production or seed data
  initDatabase(forceReset = false) {
    if (typeof localStorage === "undefined") return;
    const isCleanProd = localStorage.getItem("foodbridge_clean_db") === "true";
    if (isCleanProd && !forceReset) {
      return;
    }

    if (!localStorage.getItem(this.STORAGE_KEYS.INITIALIZED) || forceReset) {
      if (isCleanProd) {
        localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify([]));
        localStorage.setItem(this.STORAGE_KEYS.LISTINGS, JSON.stringify([]));
        localStorage.setItem(this.STORAGE_KEYS.REQUESTS, JSON.stringify([]));
        localStorage.setItem(this.STORAGE_KEYS.TASKS, JSON.stringify([]));
        localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
        localStorage.setItem(this.STORAGE_KEYS.REPORTS, JSON.stringify([]));
        localStorage.setItem(this.STORAGE_KEYS.INITIALIZED, "true");
        return;
      }

      console.log("[DB] Initializing FoodBridge local database with seed data...");
      const seed = (typeof window !== "undefined" && window.SEED_DATA) ? window.SEED_DATA : {};
      localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(seed.users || []));
      localStorage.setItem(this.STORAGE_KEYS.LISTINGS, JSON.stringify(seed.foodListings || []));
      localStorage.setItem(this.STORAGE_KEYS.REQUESTS, JSON.stringify(seed.donationRequests || []));
      localStorage.setItem(this.STORAGE_KEYS.TASKS, JSON.stringify(seed.volunteerTasks || []));
      localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(seed.notifications || []));
      localStorage.setItem(this.STORAGE_KEYS.REPORTS, JSON.stringify(seed.reports || []));
      localStorage.setItem(this.STORAGE_KEYS.INITIALIZED, "true");
    }
  }

  // Wipes all demo and mock data for clean market use
  clearAllTestData() {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(this.STORAGE_KEYS.LISTINGS, JSON.stringify([]));
    localStorage.setItem(this.STORAGE_KEYS.REQUESTS, JSON.stringify([]));
    localStorage.setItem(this.STORAGE_KEYS.TASKS, JSON.stringify([]));
    localStorage.setItem(this.STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
    localStorage.setItem(this.STORAGE_KEYS.REPORTS, JSON.stringify([]));
    const users = this._get(this.STORAGE_KEYS.USERS).filter(u => u.email && !u.email.endsWith('.demo'));
    this._set(this.STORAGE_KEYS.USERS, users);
    localStorage.setItem("foodbridge_clean_db", "true");
    console.log("[DB] All mock and test data successfully removed.");
    return true;
  }

  // Reset database back to clean demo state
  resetToDemo() {
    this.initDatabase(true);
    return true;
  }

  // --- Internal Storage Helpers (LocalStorage) ---
  _get(key) {
    try {
      if (typeof localStorage === "undefined") return [];
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error(`[DB] Error parsing ${key}:`, e);
      return [];
    }
  }

  _set(key, data) {
    try {
      if (typeof localStorage === "undefined") return false;
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error(`[DB] Error writing ${key}:`, e);
      return false;
    }
  }

  _generateId(prefix = "doc") {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
  }

  // =========================================================================
  // USER OPERATIONS
  // =========================================================================
  async getUsers(filter = {}) {
    if (this._isFirebaseLive()) {
      try {
        let query = window.FoodBridgeFirebase.db.collection("users");
        if (filter.role) query = query.where("role", "==", filter.role);
        const snap = await query.get();
        let users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (filter.status) {
          const s = filter.status.toLowerCase();
          users = users.filter(u => (u.status || '').toLowerCase() === s);
        }
        if (filter.search) {
          const q = filter.search.toLowerCase();
          users = users.filter(u => 
            (u.name && u.name.toLowerCase().includes(q)) || 
            (u.email && u.email.toLowerCase().includes(q)) ||
            (u.city && u.city.toLowerCase().includes(q))
          );
        }
        return users;
      } catch (e) {
        console.warn("[Firestore] getUsers fallback to local:", e);
      }
    }

    let users = this._get(this.STORAGE_KEYS.USERS);
    if (filter.role) {
      users = users.filter(u => u.role === filter.role);
    }
    if (filter.status) {
      users = users.filter(u => u.status === filter.status);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      users = users.filter(u => 
        (u.name && u.name.toLowerCase().includes(q)) || 
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.city && u.city.toLowerCase().includes(q))
      );
    }
    return users;
  }

  async getUserById(userId) {
    if (this._isFirebaseLive()) {
      try {
        const doc = await window.FoodBridgeFirebase.db.collection("users").doc(userId).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
      } catch (e) {
        console.warn("[Firestore] getUserById fallback to local:", e);
      }
    }
    const users = this._get(this.STORAGE_KEYS.USERS);
    return users.find(u => u.id === userId) || null;
  }

  async getUserByEmail(email) {
    const cleanEmail = email.toLowerCase().trim();
    if (this._isFirebaseLive()) {
      try {
        const snap = await window.FoodBridgeFirebase.db.collection("users").where("email", "==", cleanEmail).limit(1).get();
        return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
      } catch (e) {
        console.warn("[Firestore] getUserByEmail fallback to local:", e);
      }
    }
    const users = this._get(this.STORAGE_KEYS.USERS);
    return users.find(u => u.email.toLowerCase() === cleanEmail) || null;
  }

  async createUser(userData) {
    const cleanEmail = userData.email.toLowerCase().trim();

    if (this._isFirebaseLive()) {
      try {
        const id = userData.id || userData.uid || this._generateId("usr");
        const user = {
          id: id,
          uid: id,
          name: userData.name.trim(),
          email: cleanEmail,
          role: userData.role.toLowerCase(),
          status: userData.status || (userData.role.toLowerCase() === 'ngo' ? 'pending' : 'active'),
          phone: userData.phone || "",
          address: userData.address || "",
          city: userData.city || "San Francisco",
          regNumber: userData.regNumber || "",
          contactPerson: userData.contactPerson || "",
          vehicle: userData.vehicle || "",
          createdAt: new Date().toISOString()
        };
        await window.FoodBridgeFirebase.db.collection("users").doc(id).set(user);
        return user;
      } catch (e) {
        console.warn("[Firestore] createUser fallback to local:", e);
      }
    }

    const users = this._get(this.STORAGE_KEYS.USERS);
    if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
      throw new Error("An account with this email address already exists.");
    }

    const newUser = {
      id: userData.id || this._generateId("usr"),
      name: userData.name.trim(),
      email: cleanEmail,
      password: userData.password,
      role: userData.role.toLowerCase(),
      status: userData.status || (userData.role.toLowerCase() === 'ngo' ? 'pending' : 'active'),
      phone: userData.phone || "",
      address: userData.address || "",
      city: userData.city || "San Francisco",
      regNumber: userData.regNumber || "",
      contactPerson: userData.contactPerson || "",
      vehicle: userData.vehicle || "",
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this._set(this.STORAGE_KEYS.USERS, users);
    return newUser;
  }

  async updateUser(userId, updates) {
    if (this._isFirebaseLive()) {
      try {
        await window.FoodBridgeFirebase.db.collection("users").doc(userId).update({
          ...updates,
          updatedAt: new Date().toISOString()
        });
        return await this.getUserById(userId);
      } catch (e) {
        console.warn("[Firestore] updateUser fallback to local:", e);
      }
    }

    const users = this._get(this.STORAGE_KEYS.USERS);
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error("User not found.");

    users[index] = { ...users[index], ...updates, updatedAt: new Date().toISOString() };
    this._set(this.STORAGE_KEYS.USERS, users);
    return users[index];
  }

  async deleteUser(userId) {
    if (this._isFirebaseLive()) {
      try {
        await window.FoodBridgeFirebase.db.collection("users").doc(userId).delete();
        return true;
      } catch (e) {
        console.warn("[Firestore] deleteUser fallback to local:", e);
      }
    }

    let users = this._get(this.STORAGE_KEYS.USERS);
    users = users.filter(u => u.id !== userId);
    this._set(this.STORAGE_KEYS.USERS, users);
    return true;
  }

  // =========================================================================
  // FOOD LISTINGS OPERATIONS
  // =========================================================================
  async getFoodListings(filter = {}) {
    if (this._isFirebaseLive()) {
      try {
        let query = window.FoodBridgeFirebase.db.collection("foodListings");
        if (filter.donorId) query = query.where("donorId", "==", filter.donorId);
        if (filter.category && filter.category !== "All") query = query.where("category", "==", filter.category);
        if (filter.city && filter.city !== "All") query = query.where("city", "==", filter.city);
        if (filter.status) query = query.where("status", "==", filter.status);

        const snap = await query.get();
        let listings = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (filter.availableOnly) {
          listings = listings.filter(l => l.status === "available" && l.availableQuantity > 0);
        }
        if (filter.search) {
          const q = filter.search.toLowerCase();
          listings = listings.filter(l => 
            (l.foodName && l.foodName.toLowerCase().includes(q)) ||
            (l.description && l.description.toLowerCase().includes(q)) ||
            (l.location && l.location.toLowerCase().includes(q)) ||
            (l.donorName && l.donorName.toLowerCase().includes(q))
          );
        }

        if (filter.sortBy === "deadline") {
          listings.sort((a, b) => new Date(a.pickupDeadline) - new Date(b.pickupDeadline));
        } else if (filter.sortBy === "quantity") {
          listings.sort((a, b) => (b.availableQuantity || 0) - (a.availableQuantity || 0));
        } else {
          listings.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        }
        return listings;
      } catch (e) {
        console.warn("[Firestore] getFoodListings fallback to local:", e);
      }
    }

    let listings = this._get(this.STORAGE_KEYS.LISTINGS);
    if (filter.donorId) {
      listings = listings.filter(l => l.donorId === filter.donorId);
    }
    if (filter.category && filter.category !== "All") {
      listings = listings.filter(l => l.category.toLowerCase() === filter.category.toLowerCase());
    }
    if (filter.city && filter.city !== "All") {
      listings = listings.filter(l => l.city.toLowerCase() === filter.city.toLowerCase());
    }
    if (filter.status) {
      listings = listings.filter(l => l.status === filter.status);
    }
    if (filter.availableOnly) {
      listings = listings.filter(l => l.status === "available" && l.availableQuantity > 0);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      listings = listings.filter(l => 
        l.foodName.toLowerCase().includes(q) ||
        (l.description && l.description.toLowerCase().includes(q)) ||
        (l.location && l.location.toLowerCase().includes(q)) ||
        (l.donorName && l.donorName.toLowerCase().includes(q))
      );
    }

    if (filter.sortBy === "deadline") {
      listings.sort((a, b) => new Date(a.pickupDeadline) - new Date(b.pickupDeadline));
    } else if (filter.sortBy === "newest") {
      listings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (filter.sortBy === "quantity") {
      listings.sort((a, b) => b.availableQuantity - a.availableQuantity);
    } else {
      listings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return listings;
  }

  async getFoodListingById(id) {
    if (this._isFirebaseLive()) {
      try {
        const doc = await window.FoodBridgeFirebase.db.collection("foodListings").doc(id).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
      } catch (e) {
        console.warn("[Firestore] getFoodListingById fallback to local:", e);
      }
    }
    const listings = this._get(this.STORAGE_KEYS.LISTINGS);
    return listings.find(l => l.id === id) || null;
  }

  async createFoodListing(listingData) {
    if (!listingData.foodName || !listingData.quantity || !listingData.pickupDeadline) {
      throw new Error("Food name, quantity, and pickup deadline are required.");
    }

    const qty = parseInt(listingData.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      throw new Error("Quantity must be a positive number.");
    }

    const deadline = new Date(listingData.pickupDeadline);
    if (deadline.getTime() <= Date.now()) {
      throw new Error("Pickup deadline must be a future date and time.");
    }

    if (this._isFirebaseLive()) {
      try {
        const docRef = window.FoodBridgeFirebase.db.collection("foodListings").doc();
        const newListing = {
          id: docRef.id,
          donorId: listingData.donorId,
          donorName: listingData.donorName || "Food Donor",
          foodName: listingData.foodName.trim(),
          category: listingData.category || "Cooked Food",
          description: listingData.description || "",
          quantity: qty,
          availableQuantity: qty,
          unit: listingData.unit || "packets",
          imageUrl: listingData.imageUrl || "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80",
          preparedAt: listingData.preparedAt || new Date().toISOString(),
          pickupDeadline: deadline.toISOString(),
          storageType: listingData.storageType || "Room Temperature",
          allergens: Array.isArray(listingData.allergens) ? listingData.allergens : ["None"],
          location: listingData.location || "Pickup Address",
          city: listingData.city || "San Francisco",
          phone: listingData.phone || "",
          safetyDeclaration: true,
          status: "available",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await docRef.set(newListing);
        return newListing;
      } catch (e) {
        console.warn("[Firestore] createFoodListing fallback to local:", e);
      }
    }

    const listings = this._get(this.STORAGE_KEYS.LISTINGS);
    const newListing = {
      id: this._generateId("fl"),
      donorId: listingData.donorId,
      donorName: listingData.donorName || "Food Donor",
      foodName: listingData.foodName.trim(),
      category: listingData.category || "Cooked Food",
      description: listingData.description || "",
      quantity: qty,
      availableQuantity: qty,
      unit: listingData.unit || "packets",
      imageUrl: listingData.imageUrl || "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80",
      preparedAt: listingData.preparedAt || new Date().toISOString(),
      pickupDeadline: deadline.toISOString(),
      storageType: listingData.storageType || "Room Temperature",
      allergens: Array.isArray(listingData.allergens) ? listingData.allergens : ["None"],
      location: listingData.location || "Pickup Address",
      city: listingData.city || "San Francisco",
      phone: listingData.phone || "",
      safetyDeclaration: true,
      status: "available",
      createdAt: new Date().toISOString()
    };

    listings.unshift(newListing);
    this._set(this.STORAGE_KEYS.LISTINGS, listings);
    return newListing;
  }

  async updateFoodListing(listingId, updates) {
    if (this._isFirebaseLive()) {
      try {
        await window.FoodBridgeFirebase.db.collection("foodListings").doc(listingId).update({
          ...updates,
          updatedAt: new Date().toISOString()
        });
        return await this.getFoodListingById(listingId);
      } catch (e) {
        console.warn("[Firestore] updateFoodListing fallback to local:", e);
      }
    }

    const listings = this._get(this.STORAGE_KEYS.LISTINGS);
    const index = listings.findIndex(l => l.id === listingId);
    if (index === -1) throw new Error("Listing not found.");

    listings[index] = { ...listings[index], ...updates, updatedAt: new Date().toISOString() };
    this._set(this.STORAGE_KEYS.LISTINGS, listings);
    return listings[index];
  }

  async deleteFoodListing(listingId) {
    if (this._isFirebaseLive()) {
      try {
        const snap = await window.FoodBridgeFirebase.db.collection("donationRequests").where("listingId", "==", listingId).get();
        const activeReqs = snap.docs.filter(d => ['approved', 'accepted', 'in_transit'].includes(d.data().status));
        if (activeReqs.length > 0) {
          throw new Error("Cannot delete listing with active accepted or in-transit donation requests.");
        }
        await window.FoodBridgeFirebase.db.collection("foodListings").doc(listingId).delete();
        return true;
      } catch (e) {
        console.warn("[Firestore] deleteFoodListing fallback to local:", e);
      }
    }

    const requests = this._get(this.STORAGE_KEYS.REQUESTS);
    const hasActiveRequests = requests.some(r => 
      r.listingId === listingId && ['approved', 'accepted', 'in_transit'].includes(r.status)
    );
    if (hasActiveRequests) {
      throw new Error("Cannot delete listing with active accepted or in-transit donation requests.");
    }

    let listings = this._get(this.STORAGE_KEYS.LISTINGS);
    listings = listings.filter(l => l.id !== listingId);
    this._set(this.STORAGE_KEYS.LISTINGS, listings);
    return true;
  }

  // =========================================================================
  // DONATION REQUESTS OPERATIONS
  // =========================================================================
  async getDonationRequests(filter = {}) {
    if (this._isFirebaseLive()) {
      try {
        let query = window.FoodBridgeFirebase.db.collection("donationRequests");
        if (filter.donorId) query = query.where("donorId", "==", filter.donorId);
        if (filter.ngoId) query = query.where("ngoId", "==", filter.ngoId);
        if (filter.listingId) query = query.where("listingId", "==", filter.listingId);
        if (filter.volunteerId) query = query.where("volunteerId", "==", filter.volunteerId);
        const snap = await query.get();

        // If Firestore donationRequests collection is empty, auto-seed default workflow requests
        if (snap.empty && !Object.keys(filter).length && typeof window !== "undefined" && window.SEED_DATA && Array.isArray(window.SEED_DATA.donationRequests)) {
          console.log("[Firestore] Auto-seeding initial donation requests and tasks...");
          const db = window.FoodBridgeFirebase.db;
          for (const r of window.SEED_DATA.donationRequests) {
            await db.collection("donationRequests").doc(r.id).set(r, { merge: true });
          }
          if (Array.isArray(window.SEED_DATA.volunteerTasks)) {
            for (const t of window.SEED_DATA.volunteerTasks) {
              await db.collection("volunteerTasks").doc(t.id).set(t, { merge: true });
            }
          }
          const seededSnap = await query.get();
          let seededRequests = seededSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (filter.status) {
            const s = filter.status.toLowerCase();
            seededRequests = seededRequests.filter(r => (r.status || '').toLowerCase() === s);
          }
          seededRequests.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          return seededRequests;
        }

        let requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (filter.status) {
          const s = filter.status.toLowerCase();
          requests = requests.filter(r => (r.status || '').toLowerCase() === s);
        }
        requests.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        return requests;
      } catch (e) {
        console.warn("[Firestore] getDonationRequests fallback to local:", e);
      }
    }

    let requests = this._get(this.STORAGE_KEYS.REQUESTS);
    if (filter.donorId) requests = requests.filter(r => r.donorId === filter.donorId);
    if (filter.ngoId) requests = requests.filter(r => r.ngoId === filter.ngoId);
    if (filter.listingId) requests = requests.filter(r => r.listingId === filter.listingId);
    if (filter.status) requests = requests.filter(r => r.status === filter.status);
    if (filter.volunteerId) requests = requests.filter(r => r.volunteerId === filter.volunteerId);
    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return requests;
  }

  async getDonationRequestById(id) {
    if (this._isFirebaseLive()) {
      try {
        const doc = await window.FoodBridgeFirebase.db.collection("donationRequests").doc(id).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
      } catch (e) {
        console.warn("[Firestore] getDonationRequestById fallback to local:", e);
      }
    }
    const requests = this._get(this.STORAGE_KEYS.REQUESTS);
    return requests.find(r => r.id === id) || null;
  }

  async createDonationRequest(requestData) {
    const ngo = await this.getUserById(requestData.ngoId);
    if (!ngo || ngo.role !== "ngo") {
      throw new Error("Only registered NGOs can request food donations.");
    }
    if (ngo.status !== "approved") {
      throw new Error("Your NGO account is currently pending administrative approval. Only verified NGOs can request food donations.");
    }

    const listing = await this.getFoodListingById(requestData.listingId);
    if (!listing) throw new Error("Food listing not found.");
    if (listing.status !== "available" || listing.availableQuantity <= 0) {
      throw new Error("This food donation is no longer available.");
    }

    const requestedQty = parseInt(requestData.requestedQuantity, 10);
    if (isNaN(requestedQty) || requestedQty <= 0) {
      throw new Error("Requested quantity must be a positive number.");
    }
    if (requestedQty > listing.availableQuantity) {
      throw new Error(`Requested quantity (${requestedQty}) exceeds currently available quantity (${listing.availableQuantity} ${listing.unit}).`);
    }

    if (this._isFirebaseLive()) {
      try {
        const docRef = window.FoodBridgeFirebase.db.collection("donationRequests").doc();
        const newRequest = {
          id: docRef.id,
          listingId: requestData.listingId,
          foodName: listing.foodName,
          foodCategory: listing.category,
          donorId: listing.donorId,
          donorName: listing.donorName,
          ngoId: requestData.ngoId,
          ngoName: requestData.ngoName || ngo.name,
          ngoContact: requestData.ngoContact || ngo.phone || "",
          requestedQuantity: requestedQty,
          unit: listing.unit,
          message: requestData.message ? requestData.message.trim() : "",
          deliveryAddress: requestData.deliveryAddress || ngo.address || "Community Center",
          city: listing.city,
          status: "pending",
          volunteerId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await docRef.set(newRequest);

        await this.createNotification({
          userId: listing.donorId,
          type: "request_new",
          title: "New Food Request Received",
          message: `${newRequest.ngoName} requested ${requestedQty} ${listing.unit} of "${listing.foodName}".`,
          link: "requests.html"
        });

        return newRequest;
      } catch (e) {
        console.warn("[Firestore] createDonationRequest fallback to local:", e);
      }
    }

    const requests = this._get(this.STORAGE_KEYS.REQUESTS);
    const newRequest = {
      id: this._generateId("req"),
      listingId: requestData.listingId,
      foodName: listing.foodName,
      foodCategory: listing.category,
      donorId: listing.donorId,
      donorName: listing.donorName,
      ngoId: requestData.ngoId,
      ngoName: requestData.ngoName || ngo.name,
      ngoContact: requestData.ngoContact || ngo.phone || "",
      requestedQuantity: requestedQty,
      unit: listing.unit,
      message: requestData.message ? requestData.message.trim() : "",
      deliveryAddress: requestData.deliveryAddress || ngo.address || "Community Center",
      city: listing.city,
      status: "pending",
      volunteerId: null,
      createdAt: new Date().toISOString()
    };

    requests.unshift(newRequest);
    this._set(this.STORAGE_KEYS.REQUESTS, requests);

    await this.createNotification({
      userId: listing.donorId,
      type: "request_new",
      title: "New Food Request Received",
      message: `${newRequest.ngoName} requested ${requestedQty} ${listing.unit} of "${listing.foodName}".`,
      link: "requests.html"
    });

    return newRequest;
  }

  // Atomic inventory approval using Firestore Transactions in live mode
  async approveDonationRequest(requestId, volunteerId = null) {
    if (this._isFirebaseLive()) {
      try {
        const db = window.FoodBridgeFirebase.db;
        return await db.runTransaction(async (transaction) => {
          const reqRef = db.collection("donationRequests").doc(requestId);
          const reqDoc = await transaction.get(reqRef);
          if (!reqDoc.exists) throw new Error("Donation request not found.");
          const request = reqDoc.data();
          if (request.status !== "pending") throw new Error(`Cannot approve request with status '${request.status}'.`);

          const listingRef = db.collection("foodListings").doc(request.listingId);
          const listingDoc = await transaction.get(listingRef);
          if (!listingDoc.exists) throw new Error("Referenced food listing not found.");
          const listing = listingDoc.data();

          const reqQty = parseInt(request.requestedQuantity, 10);
          const availQty = parseInt(listing.availableQuantity, 10);
          if (reqQty > availQty) {
            throw new Error(`Cannot approve: requested quantity (${reqQty}) exceeds available inventory (${availQty}).`);
          }

          const newAvail = availQty - reqQty;
          const newStatus = newAvail === 0 ? "claimed" : "available";

          transaction.update(listingRef, {
            availableQuantity: newAvail,
            status: newStatus,
            updatedAt: new Date().toISOString()
          });

          let assignedVol = null;
          if (volunteerId) {
            const vDoc = await transaction.get(db.collection("users").doc(volunteerId));
            if (vDoc.exists) assignedVol = { id: vDoc.id, ...vDoc.data() };
          }
          if (!assignedVol) {
            const vSnap = await db.collection("users").where("role", "==", "volunteer").where("status", "==", "active").limit(1).get();
            if (!vSnap.empty) assignedVol = { id: vSnap.docs[0].id, ...vSnap.docs[0].data() };
          }

          transaction.update(reqRef, {
            status: "approved",
            volunteerId: assignedVol ? assignedVol.id : null,
            volunteerName: assignedVol ? assignedVol.name : null,
            approvedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

          let createdTask = null;
          if (assignedVol) {
            const taskRef = db.collection("volunteerTasks").doc();
            createdTask = {
              id: taskRef.id,
              requestId: requestId,
              listingId: request.listingId,
              foodName: request.foodName,
              quantity: request.requestedQuantity,
              unit: request.unit,
              donorId: request.donorId,
              donorName: request.donorName,
              pickupAddress: listing.pickupAddress || listing.location,
              pickupPhone: listing.phone || "",
              ngoId: request.ngoId,
              ngoName: request.ngoName,
              deliveryAddress: request.deliveryAddress,
              ngoContact: request.ngoContact,
              city: request.city,
              volunteerId: assignedVol.id,
              volunteerName: assignedVol.name,
              status: "assigned",
              assignedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            transaction.set(taskRef, createdTask);
          }

          return { request: { ...request, status: "approved" }, task: createdTask };
        });
      } catch (e) {
        console.warn("[Firestore] approveDonationRequest transaction error:", e);
        throw e;
      }
    }

    // LocalStorage fallback
    const requests = this._get(this.STORAGE_KEYS.REQUESTS);
    const reqIndex = requests.findIndex(r => r.id === requestId);
    if (reqIndex === -1) throw new Error("Donation request not found.");
    const request = requests[reqIndex];
    if (request.status !== "pending") throw new Error(`Cannot approve request with status '${request.status}'.`);

    const listings = this._get(this.STORAGE_KEYS.LISTINGS);
    const listingIndex = listings.findIndex(l => l.id === request.listingId);
    if (listingIndex === -1) throw new Error("Referenced food listing not found.");
    const listing = listings[listingIndex];

    const reqQty = parseInt(request.requestedQuantity, 10);
    const availQty = parseInt(listing.availableQuantity, 10);
    if (reqQty > availQty) {
      throw new Error(`Cannot approve: requested quantity (${reqQty}) exceeds available inventory (${availQty}).`);
    }

    const newAvail = availQty - reqQty;
    listing.availableQuantity = newAvail;
    listing.status = newAvail === 0 ? "claimed" : "available";
    listings[listingIndex] = listing;
    this._set(this.STORAGE_KEYS.LISTINGS, listings);

    const users = this._get(this.STORAGE_KEYS.USERS);
    let assignedVol = volunteerId ? users.find(u => u.id === volunteerId) : null;
    if (!assignedVol) {
      assignedVol = users.find(u => u.role === "volunteer" && u.status === "active") || null;
    }

    request.status = "approved";
    request.volunteerId = assignedVol ? assignedVol.id : null;
    request.volunteerName = assignedVol ? assignedVol.name : null;
    request.approvedAt = new Date().toISOString();
    requests[reqIndex] = request;
    this._set(this.STORAGE_KEYS.REQUESTS, requests);

    let createdTask = null;
    if (assignedVol) {
      const tasks = this._get(this.STORAGE_KEYS.TASKS);
      createdTask = {
        id: this._generateId("task"),
        requestId: requestId,
        listingId: request.listingId,
        foodName: request.foodName,
        quantity: request.requestedQuantity,
        unit: request.unit,
        donorId: request.donorId,
        donorName: request.donorName,
        pickupAddress: listing.pickupAddress || listing.location,
        pickupPhone: listing.phone || "",
        ngoId: request.ngoId,
        ngoName: request.ngoName,
        deliveryAddress: request.deliveryAddress,
        ngoContact: request.ngoContact,
        city: request.city,
        volunteerId: assignedVol.id,
        volunteerName: assignedVol.name,
        status: "assigned",
        assignedAt: new Date().toISOString()
      };
      tasks.unshift(createdTask);
      this._set(this.STORAGE_KEYS.TASKS, tasks);
    }

    await this.createNotification({
      userId: request.ngoId,
      type: "request_approved",
      title: "Food Request Approved!",
      message: `Your request for ${request.requestedQuantity} ${request.unit} of "${request.foodName}" was approved.`,
      link: "my-requests.html"
    });

    return { request, task: createdTask };
  }

  async rejectDonationRequest(requestId, reason = "Operational limitation.") {
    if (this._isFirebaseLive()) {
      try {
        await window.FoodBridgeFirebase.db.collection("donationRequests").doc(requestId).update({
          status: "rejected",
          rejectionReason: reason,
          updatedAt: new Date().toISOString()
        });
        const req = await this.getDonationRequestById(requestId);
        if (req) {
          await this.createNotification({
            userId: req.ngoId,
            type: "request_rejected",
            title: "Food Request Declined",
            message: `Your request for "${req.foodName}" could not be fulfilled: ${reason}`,
            link: "my-requests.html"
          });
        }
        return req;
      } catch (e) {
        console.warn("[Firestore] rejectDonationRequest fallback to local:", e);
      }
    }

    const requests = this._get(this.STORAGE_KEYS.REQUESTS);
    const index = requests.findIndex(r => r.id === requestId);
    if (index === -1) throw new Error("Request not found.");

    requests[index].status = "rejected";
    requests[index].rejectionReason = reason;
    requests[index].updatedAt = new Date().toISOString();
    this._set(this.STORAGE_KEYS.REQUESTS, requests);

    await this.createNotification({
      userId: requests[index].ngoId,
      type: "request_rejected",
      title: "Food Request Declined",
      message: `Your request for "${requests[index].foodName}" could not be fulfilled: ${reason}`,
      link: "my-requests.html"
    });

    return requests[index];
  }

  async cancelDonationRequest(requestId) {
    if (this._isFirebaseLive()) {
      try {
        await window.FoodBridgeFirebase.db.collection("donationRequests").doc(requestId).update({
          status: "cancelled",
          updatedAt: new Date().toISOString()
        });
        return await this.getDonationRequestById(requestId);
      } catch (e) {
        console.warn("[Firestore] cancelDonationRequest fallback to local:", e);
      }
    }

    const requests = this._get(this.STORAGE_KEYS.REQUESTS);
    const index = requests.findIndex(r => r.id === requestId);
    if (index === -1) throw new Error("Request not found.");
    if (requests[index].status !== "pending") {
      throw new Error("Only pending requests can be cancelled.");
    }
    requests[index].status = "cancelled";
    requests[index].updatedAt = new Date().toISOString();
    this._set(this.STORAGE_KEYS.REQUESTS, requests);
    return requests[index];
  }

  // =========================================================================
  // VOLUNTEER TASKS OPERATIONS
  // =========================================================================
  async getVolunteerTasks(filter = {}) {
    if (this._isFirebaseLive()) {
      try {
        let query = window.FoodBridgeFirebase.db.collection("volunteerTasks");
        if (filter.volunteerId) query = query.where("volunteerId", "==", filter.volunteerId);
        if (filter.status) query = query.where("status", "==", filter.status);
        if (filter.city && filter.city !== "All") query = query.where("city", "==", filter.city);
        const snap = await query.get();
        let tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        tasks.sort((a, b) => new Date(b.assignedAt || 0) - new Date(a.assignedAt || 0));
        return tasks;
      } catch (e) {
        console.warn("[Firestore] getVolunteerTasks fallback to local:", e);
      }
    }

    let tasks = this._get(this.STORAGE_KEYS.TASKS);
    if (filter.volunteerId) tasks = tasks.filter(t => t.volunteerId === filter.volunteerId);
    if (filter.status) tasks = tasks.filter(t => t.status === filter.status);
    if (filter.city && filter.city !== "All") tasks = tasks.filter(t => t.city.toLowerCase() === filter.city.toLowerCase());
    tasks.sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt));
    return tasks;
  }

  async getVolunteerTaskById(id) {
    if (this._isFirebaseLive()) {
      try {
        const doc = await window.FoodBridgeFirebase.db.collection("volunteerTasks").doc(id).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
      } catch (e) {
        console.warn("[Firestore] getVolunteerTaskById fallback to local:", e);
      }
    }
    const tasks = this._get(this.STORAGE_KEYS.TASKS);
    return tasks.find(t => t.id === id) || null;
  }

  async acceptVolunteerTask(taskId, volunteerId) {
    if (this._isFirebaseLive()) {
      try {
        await window.FoodBridgeFirebase.db.collection("volunteerTasks").doc(taskId).update({
          status: "Accepted",
          volunteerId: volunteerId,
          acceptedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        return await this.getVolunteerTaskById(taskId);
      } catch (e) {
        console.warn("[Firestore] acceptVolunteerTask fallback to local:", e);
      }
    }

    const tasks = this._get(this.STORAGE_KEYS.TASKS);
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) throw new Error("Task not found.");

    tasks[index].status = "Accepted";
    tasks[index].volunteerId = volunteerId;
    tasks[index].acceptedAt = new Date().toISOString();
    this._set(this.STORAGE_KEYS.TASKS, tasks);
    return tasks[index];
  }

  async updateTaskStatus(taskId, newStatus, volunteerId = null) {
    const validStatuses = ["Assigned", "Accepted", "Picked Up", "Delivered", "Completed"];
    const matched = validStatuses.find(s => s.toLowerCase() === newStatus.toLowerCase());
    if (!matched) throw new Error(`Invalid task status: ${newStatus}`);

    if (this._isFirebaseLive()) {
      try {
        const taskRef = window.FoodBridgeFirebase.db.collection("volunteerTasks").doc(taskId);
        const taskDoc = await taskRef.get();
        if (!taskDoc.exists) throw new Error("Task not found.");
        const task = taskDoc.data();

        const updates = {
          status: matched,
          updatedAt: new Date().toISOString()
        };
        if (matched === "Picked Up") updates.pickedUpAt = new Date().toISOString();
        if (matched === "Delivered" || matched === "Completed") updates.completedAt = new Date().toISOString();

        await taskRef.update(updates);

        // Sync associated donation request status
        if (task.requestId) {
          const reqStatus = (matched === "Delivered" || matched === "Completed") ? "completed" : "in_transit";
          await window.FoodBridgeFirebase.db.collection("donationRequests").doc(task.requestId).update({
            status: reqStatus,
            updatedAt: new Date().toISOString()
          });
        }

        return { ...task, ...updates };
      } catch (e) {
        console.warn("[Firestore] updateTaskStatus fallback to local:", e);
      }
    }

    const tasks = this._get(this.STORAGE_KEYS.TASKS);
    const index = tasks.findIndex(t => t.id === taskId);
    if (index === -1) throw new Error("Task not found.");

    tasks[index].status = matched;
    tasks[index].updatedAt = new Date().toISOString();
    if (matched === "Picked Up") tasks[index].pickedUpAt = new Date().toISOString();
    if (matched === "Delivered" || matched === "Completed") tasks[index].completedAt = new Date().toISOString();

    this._set(this.STORAGE_KEYS.TASKS, tasks);

    if (tasks[index].requestId) {
      const requests = this._get(this.STORAGE_KEYS.REQUESTS);
      const rIdx = requests.findIndex(r => r.id === tasks[index].requestId);
      if (rIdx !== -1) {
        requests[rIdx].status = (matched === "Delivered" || matched === "Completed") ? "completed" : "in_transit";
        this._set(this.STORAGE_KEYS.REQUESTS, requests);
      }
    }

    return tasks[index];
  }

  // =========================================================================
  // NOTIFICATIONS OPERATIONS
  // =========================================================================
  async getNotifications(filter = {}) {
    if (this._isFirebaseLive()) {
      try {
        let query = window.FoodBridgeFirebase.db.collection("notifications");
        if (filter.userId) query = query.where("userId", "==", filter.userId);
        if (filter.unreadOnly) query = query.where("read", "==", false);
        const snap = await query.get();
        let notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        notifs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        return notifs;
      } catch (e) {
        console.warn("[Firestore] getNotifications fallback to local:", e);
      }
    }

    let notifs = this._get(this.STORAGE_KEYS.NOTIFICATIONS);
    if (filter.userId) notifs = notifs.filter(n => n.userId === filter.userId);
    if (filter.unreadOnly) notifs = notifs.filter(n => !n.read);
    notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return notifs;
  }

  async createNotification(data) {
    if (this._isFirebaseLive()) {
      try {
        const docRef = window.FoodBridgeFirebase.db.collection("notifications").doc();
        const notif = {
          id: docRef.id,
          userId: data.userId,
          type: data.type || "info",
          title: data.title || "Notification",
          message: data.message || "",
          link: data.link || "#",
          read: false,
          createdAt: new Date().toISOString()
        };
        await docRef.set(notif);
        return notif;
      } catch (e) {
        console.warn("[Firestore] createNotification fallback to local:", e);
      }
    }

    const notifs = this._get(this.STORAGE_KEYS.NOTIFICATIONS);
    const newNotif = {
      id: this._generateId("notif"),
      userId: data.userId,
      type: data.type || "info",
      title: data.title || "Notification",
      message: data.message || "",
      link: data.link || "#",
      read: false,
      createdAt: new Date().toISOString()
    };
    notifs.unshift(newNotif);
    this._set(this.STORAGE_KEYS.NOTIFICATIONS, notifs);
    return newNotif;
  }

  async markNotificationRead(id) {
    if (this._isFirebaseLive()) {
      try {
        await window.FoodBridgeFirebase.db.collection("notifications").doc(id).update({ read: true });
        return true;
      } catch (e) {
        console.warn("[Firestore] markNotificationRead fallback to local:", e);
      }
    }

    const notifs = this._get(this.STORAGE_KEYS.NOTIFICATIONS);
    const idx = notifs.findIndex(n => n.id === id);
    if (idx !== -1) {
      notifs[idx].read = true;
      this._set(this.STORAGE_KEYS.NOTIFICATIONS, notifs);
    }
    return true;
  }

  async markAllNotificationsRead(userId) {
    if (this._isFirebaseLive()) {
      try {
        const snap = await window.FoodBridgeFirebase.db.collection("notifications")
          .where("userId", "==", userId).where("read", "==", false).get();
        const batch = window.FoodBridgeFirebase.db.batch();
        snap.docs.forEach(doc => {
          batch.update(doc.ref, { read: true });
        });
        await batch.commit();
        return true;
      } catch (e) {
        console.warn("[Firestore] markAllNotificationsRead fallback to local:", e);
      }
    }

    const notifs = this._get(this.STORAGE_KEYS.NOTIFICATIONS);
    notifs.forEach(n => {
      if (n.userId === userId) n.read = true;
    });
    this._set(this.STORAGE_KEYS.NOTIFICATIONS, notifs);
    return true;
  }

  async getPlatformStats() {
    return await this.getAdminMetrics();
  }

  async updateVolunteerTaskStatus(taskId, volunteerId, newStatus) {
    return await this.updateTaskStatus(taskId, newStatus, volunteerId);
  }

  async verifyNGO(ngoId, status, notes = "") {
    const valid = ["approved", "rejected", "pending"];
    if (!valid.includes(status)) throw new Error("Invalid verification status.");
    const updated = await this.updateUser(ngoId, {
      status,
      verificationNotes: notes,
      verifiedAt: new Date().toISOString()
    });

    await this.createNotification({
      userId: ngoId,
      type: status === "approved" ? "ngo_approved" : "ngo_rejected",
      title: status === "approved" ? "NGO Account Approved!" : "NGO Application Update",
      message: status === "approved" 
        ? "Congratulations! Your NGO credentials have been verified. You can now browse and request surplus food."
        : `Your NGO application status has been updated to: ${status}. Notes: ${notes}`,
      link: "dashboard.html"
    });

    return updated;
  }

  // =========================================================================
  // METRICS & REPORTING
  // =========================================================================
  async getAdminMetrics() {
    const users = await this.getUsers();
    const listings = await this.getFoodListings();
    const requests = await this.getDonationRequests();
    const tasks = await this.getVolunteerTasks();

    const donors = users.filter(u => (u.role || '').toLowerCase() === "donor");
    const ngos = users.filter(u => (u.role || '').toLowerCase() === "ngo");
    const volunteers = users.filter(u => (u.role || '').toLowerCase() === "volunteer");
    const pendingNgos = ngos.filter(n => (n.status || '').toLowerCase() === "pending");

    const completedDonations = requests.filter(r => (r.status || '').toLowerCase() === "completed");
    let totalQuantityDonated = completedDonations.reduce((sum, r) => sum + (parseInt(r.requestedQuantity, 10) || 0), 0);

    const completedTasks = tasks.filter(t => t.status === "Completed" || t.status === "Delivered");
    if (totalQuantityDonated === 0 && completedTasks.length > 0) {
      totalQuantityDonated = completedTasks.reduce((sum, t) => sum + (parseInt(t.quantity, 10) || 0), 0);
    }

    return {
      totalUsers: users.length,
      totalDonors: donors.length,
      totalNgos: ngos.length,
      totalNGOs: ngos.length,
      pendingNgos: pendingNgos.length,
      pendingNGOs: pendingNgos.length,
      totalVolunteers: volunteers.length,
      totalListings: listings.length,
      activeListings: listings.filter(l => (l.status || '').toLowerCase() === "available").length,
      totalDonationsCompleted: completedDonations.length,
      completedDonations: completedDonations.length,
      totalQuantityDonated,
      totalMealsDonated: totalQuantityDonated,
      completedTasks: completedTasks.length
    };
  }

  // =========================================================================
  // STORAGE (FIREBASE STORAGE & DATA URLs)
  // =========================================================================
  async uploadFoodImage(file, listingId = null) {
    if (this._isFirebaseLive() && window.FoodBridgeFirebase.storage) {
      try {
        const storageRef = window.FoodBridgeFirebase.storage.ref();
        const ext = file.name ? file.name.split('.').pop() : 'jpg';
        const imgRef = storageRef.child(`food_images/${listingId || Date.now()}_${Date.now()}.${ext}`);
        const snap = await imgRef.put(file);
        const downloadUrl = await snap.ref.getDownloadURL();
        return downloadUrl;
      } catch (err) {
        console.warn("[Firebase Storage] Upload failed, falling back to Data URL:", err);
      }
    }

    // Fallback: convert to base64 Data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // =========================================================================
  // SEED FIRESTORE (One-Click Migration from Demo to Live Firestore)
  // =========================================================================
  async seedFirestore() {
    if (!this._isFirebaseLive()) {
      throw new Error("Cannot seed Firestore: Live Firebase connection is not active.");
    }

    const db = window.FoodBridgeFirebase.db;
    const seed = (typeof window !== "undefined" && window.SEED_DATA) ? window.SEED_DATA : {};

    console.log("[Firebase] Seeding Cloud Firestore with initial datasets...");

    // 1. Seed Users
    if (Array.isArray(seed.users)) {
      for (const u of seed.users) {
        await db.collection("users").doc(u.id).set(u, { merge: true });
      }
    }

    // 2. Seed Food Listings
    if (Array.isArray(seed.foodListings)) {
      for (const l of seed.foodListings) {
        await db.collection("foodListings").doc(l.id).set(l, { merge: true });
      }
    }

    // 3. Seed Requests
    if (Array.isArray(seed.donationRequests)) {
      for (const r of seed.donationRequests) {
        await db.collection("donationRequests").doc(r.id).set(r, { merge: true });
      }
    }

    // 4. Seed Volunteer Tasks
    if (Array.isArray(seed.volunteerTasks)) {
      for (const t of seed.volunteerTasks) {
        await db.collection("volunteerTasks").doc(t.id).set(t, { merge: true });
      }
    }

    // 5. Seed Notifications
    if (Array.isArray(seed.notifications)) {
      for (const n of seed.notifications) {
        await db.collection("notifications").doc(n.id).set(n, { merge: true });
      }
    }

    console.log("[Firebase] Cloud Firestore seeding completed successfully!");
    return true;
  }
}

// Global DB Singleton
window.foodBridgeDB = new FoodBridgeDB();
window.foodShareDB = window.foodBridgeDB;
window.clearFoodBridgeTestData = () => window.foodBridgeDB.clearAllTestData();
