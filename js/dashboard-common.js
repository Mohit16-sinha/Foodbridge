/**
 * FOODBRIDGE - DASHBOARD COMMON CONTROLLER
 * Shared controller for Donor, NGO, Volunteer, and Admin dashboards.
 * Features: Clickable Minimizing Glassmorphic Sidebar, Dynamic Banner Alignment,
 * Tooltip Engines, Persistent Collapsed State, and Responsive Drawer.
 */

function setupDashboardLayout(expectedRole) {
  // 1. Authenticate & Verify Role
  const auth = window.foodBridgeAuth || window.foodShareAuth;
  const user = auth.requireAuth(expectedRole);
  if (!user) return null;

  // 2. Setup Top Demo Role Bar (only if explicitly enabled for demo testing)
  const isDemoExplicit = localStorage.getItem("foodbridge_enable_demo_mode") === "true";
  if (isDemoExplicit) {
    insertDemoBanner(user.role);
  }

  // 3. Populate Sidebar User Info
  const userNameEls = document.querySelectorAll(".current-user-name");
  const userRoleEls = document.querySelectorAll(".current-user-role");
  const userAvatarEls = document.querySelectorAll(".current-user-avatar");

  userNameEls.forEach(el => el.textContent = user.name || "User");
  userRoleEls.forEach(el => el.textContent = (user.role || "").toUpperCase());
  userAvatarEls.forEach(el => {
    if (el.tagName === 'IMG') {
      el.src = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=11332B&color=fff`;
    } else {
      el.textContent = (user.name || "U").charAt(0).toUpperCase();
    }
    el.title = `${user.name || "User"} (${(user.role || "").toUpperCase()})`;
  });

  // 4. Setup Clickable Collapsible / Minimizable Sidebar
  const sidebar = document.querySelector(".dashboard-sidebar");
  const main = document.querySelector(".dashboard-main");
  const toggleBtn = document.getElementById("sidebar-toggle-btn");
  let backdrop = document.querySelector(".sidebar-backdrop");

  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.className = "sidebar-backdrop";
    document.body.appendChild(backdrop);
  }

  if (sidebar) {
    // 4a. Enhance Sidebar Brand HTML: wrap text in span.brand-text
    const brand = sidebar.querySelector(".sidebar-brand");
    if (brand) {
      const childNodes = Array.from(brand.childNodes);
      childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
          const span = document.createElement("span");
          span.className = "brand-text";
          span.textContent = node.textContent.trim();
          brand.replaceChild(span, node);
        }
      });
    }

    // 4b. Enhance Nav Links: Ensure spans, data-tooltips, and native titles
    sidebar.querySelectorAll(".sidebar-link").forEach(link => {
      // Find direct text nodes inside link
      const childNodes = Array.from(link.childNodes);
      let linkText = "";
      childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
          linkText = node.textContent.trim();
          const span = document.createElement("span");
          span.className = "sidebar-link-text";
          span.textContent = linkText;
          link.replaceChild(span, node);
        } else if (node.nodeType === Node.ELEMENT_NODE && (node.classList.contains("sidebar-link-text") || (!node.classList.contains("badge") && node.tagName !== "I"))) {
          linkText = node.textContent.trim();
        }
      });

      if (linkText) {
        link.setAttribute("data-tooltip", linkText);
        link.setAttribute("title", linkText);
      }

      // Close mobile drawer on navigation click
      link.addEventListener("click", () => {
        if (window.innerWidth <= 992) {
          sidebar.classList.remove("open");
          backdrop.classList.remove("active");
          document.body.classList.remove("sidebar-open");
        }
      });
    });

    // Helper: update title and tooltips on hamburger button and brand
    function updateToggleState(isCollapsed) {
      if (toggleBtn) {
        toggleBtn.title = isCollapsed ? "Expand sidebar (Ctrl+B)" : "Minimize sidebar (Ctrl+B)";
        toggleBtn.setAttribute("aria-label", isCollapsed ? "Expand sidebar" : "Minimize sidebar");
        // Maintain clean hamburger icon (no arrows)
        toggleBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
      }
      if (brand) {
        if (isCollapsed) {
          brand.title = "FoodBridge – Click to enlarge (Ctrl+B)";
        } else {
          brand.title = "FoodBridge Home";
        }
      }
    }

    // 4c. Check Saved Collapsed Preference (Desktop only)
    const isCollapsedPref = localStorage.getItem("foodbridge_sidebar_collapsed") === "true";
    if (window.innerWidth > 992 && isCollapsedPref) {
      sidebar.classList.add("collapsed");
      if (main) main.classList.add("sidebar-collapsed");
      updateToggleState(true);
    } else {
      updateToggleState(false);
    }

    // 4d. Toggle Handler (Minimize <-> Enlarge via Hamburger)
    function toggleSidebar() {
      if (window.innerWidth > 992) {
        // Desktop: Toggle Minimization (Collapse <-> Enlarge)
        const isCollapsed = sidebar.classList.toggle("collapsed");
        if (main) main.classList.toggle("sidebar-collapsed", isCollapsed);
        localStorage.setItem("foodbridge_sidebar_collapsed", isCollapsed ? "true" : "false");
        updateToggleState(isCollapsed);
      } else {
        // Mobile: Toggle Drawer
        const isOpen = sidebar.classList.toggle("open");
        backdrop.classList.toggle("active", isOpen);
        document.body.classList.toggle("sidebar-open", isOpen);
      }
    }

    // Single unified hamburger toggle button
    if (toggleBtn) {
      toggleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        toggleSidebar();
      });
    }

    // Clicking brand logo in collapsed rail expands sidebar
    if (brand) {
      brand.addEventListener("click", (e) => {
        if (sidebar.classList.contains("collapsed") && window.innerWidth > 992) {
          e.preventDefault();
          toggleSidebar();
        }
      });
    }

    // Global keyboard shortcut: Ctrl+B or Cmd+B to minimize / enlarge
    document.addEventListener("keydown", (e) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    });

    backdrop.addEventListener("click", () => {
      sidebar.classList.remove("open");
      backdrop.classList.remove("active");
      document.body.classList.remove("sidebar-open");
    });
  }

  // 5. Setup Active Navigation Link
  const currentPath = window.location.pathname.toLowerCase();
  document.querySelectorAll(".sidebar-link").forEach(link => {
    const href = link.getAttribute("href")?.toLowerCase() || "";
    if (href && currentPath.endsWith(href)) {
      link.classList.add("active");
    } else if (link.classList.contains("active") && !currentPath.endsWith(href)) {
      link.classList.remove("active");
    }
  });

  // 6. Setup Logout Action
  document.querySelectorAll(".logout-trigger").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm("Are you sure you want to log out of FoodBridge?")) {
        auth.logout();
      }
    });
  });

  // 7. Initialize In-app Notification Bell
  window.initNotificationsBell(user.id);

  return user;
}

// Injects top demo banner with 1-click role switcher, Firebase connector, and dynamic layout alignment
function insertDemoBanner(currentRole) {
  if (document.querySelector(".demo-banner")) return;

  const fb = window.FoodBridgeFirebase;
  const isLive = fb && fb.isConfigured;
  const projectId = (fb && fb.config && fb.config.projectId) ? fb.config.projectId : "";

  const banner = document.createElement("div");
  banner.className = "demo-banner";
  banner.innerHTML = `
    <div class="demo-banner-content">
      <span class="badge" style="${isLive ? 'background: #227150; color: #fff;' : ''}">
        <i class="fa-solid ${isLive ? 'fa-cloud-bolt' : 'fa-flask'}"></i>
        ${isLive ? 'FIREBASE PRODUCTION' : 'FOODBRIDGE DEMO'}
      </span>
      <span>${isLive ? `Live Cloud Firestore & Firebase Auth Connected (Project: <strong>${projectId}</strong>)` : 'Simulated Database Active with Glassmorphism Engine.'}</span>
    </div>
    <div class="demo-role-quickswitch">
      <span>Switch View:</span>
      <button class="demo-role-btn ${currentRole === 'donor' ? 'active' : ''}" data-role="donor">Donor</button>
      <button class="demo-role-btn ${currentRole === 'ngo' ? 'active' : ''}" data-role="ngo">NGO</button>
      <button class="demo-role-btn ${currentRole === 'volunteer' ? 'active' : ''}" data-role="volunteer">Volunteer</button>
      <button class="demo-role-btn ${currentRole === 'admin' ? 'active' : ''}" data-role="admin">Admin</button>
      <button class="demo-role-btn" id="demo-reset-db-btn" title="Reset all data back to original seed state" style="background: rgba(217, 78, 78, 0.4); margin-left: 6px;">
        <i class="fa-solid fa-rotate-left"></i> Reset
      </button>
      <button class="demo-role-btn" id="open-firebase-modal-btn" title="Configure Live Firebase Project" style="background: ${isLive ? 'rgba(34, 113, 80, 0.6)' : 'rgba(231, 160, 52, 0.4)'}; border: 1px solid ${isLive ? 'rgba(52, 211, 153, 0.6)' : 'rgba(231, 160, 52, 0.6)'}; margin-left: 6px;">
        <i class="fa-solid fa-gear"></i> ${isLive ? 'Firebase Settings' : 'Connect Firebase'}
      </button>
    </div>
  `;

  document.body.insertBefore(banner, document.body.firstChild);
  document.body.classList.add("has-demo-banner");

  // Dynamically set CSS offset variable based on actual measured banner height
  function updateBannerOffset() {
    if (banner) {
      const height = banner.offsetHeight || 42;
      document.documentElement.style.setProperty('--actual-demo-banner-offset', `${height}px`);
    }
  }

  // Run on mount and on window resize
  requestAnimationFrame(updateBannerOffset);
  window.addEventListener("resize", updateBannerOffset);

  // Bind role switches
  banner.querySelectorAll(".demo-role-btn[data-role]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const targetRole = btn.getAttribute("data-role");
      if (targetRole === currentRole) return;
      const auth = window.foodBridgeAuth || window.foodShareAuth;
      await auth.loginDemo(targetRole);
    });
  });

  // Bind Reset Data button
  const resetBtn = document.getElementById("demo-reset-db-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("Reset FoodBridge demo database back to clean initial state? All your newly created listings and tests will be restored to default demo data.")) {
        const db = window.foodBridgeDB || window.foodShareDB;
        db.resetToDemo();
        window.showToast("Database reset to initial FoodBridge demo dataset.", "info");
        setTimeout(() => window.location.reload(), 500);
      }
    });
  }

  // Bind Connect Firebase button
  const fbBtn = document.getElementById("open-firebase-modal-btn");
  if (fbBtn) {
    fbBtn.addEventListener("click", openFirebaseConnectionModal);
  }
}

// Interactive Firebase Configuration & Connection Assistant Dialog
function openFirebaseConnectionModal() {
  let modalBackdrop = document.getElementById("firebase-config-modal");
  if (!modalBackdrop) {
    modalBackdrop = document.createElement("div");
    modalBackdrop.className = "modal-backdrop";
    modalBackdrop.id = "firebase-config-modal";

    const fb = window.FoodBridgeFirebase;
    const isLive = fb && fb.isConfigured;
    const currentCfg = (fb && fb.config) ? fb.config : {};

    modalBackdrop.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-header">
          <h3 class="modal-title"><i class="fa-solid fa-cloud-bolt" style="color: var(--color-secondary);"></i> Connect Live Firebase</h3>
          <button class="modal-close-btn" id="close-fb-modal-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div style="background: ${isLive ? 'rgba(47, 133, 90, 0.12)' : 'rgba(231, 160, 52, 0.12)'}; border: 1px solid ${isLive ? 'rgba(52, 211, 153, 0.35)' : 'rgba(231, 160, 52, 0.35)'}; padding: 0.85rem 1.15rem; border-radius: var(--radius-md); margin-bottom: 1.25rem;">
            <div style="font-weight: 700; color: ${isLive ? '#227150' : '#E7A034'}; margin-bottom: 0.25rem;">
              <i class="fa-solid ${isLive ? 'fa-circle-check' : 'fa-circle-info'}"></i>
              ${isLive ? `Live Firebase Connected (Project ID: ${currentCfg.projectId})` : 'Currently in LocalStorage Demo Mode'}
            </div>
            <p style="font-size: 0.82rem; margin: 0; color: var(--color-muted);">
              ${isLive 
                ? 'Your application is reading and writing directly to Cloud Firestore, Firebase Auth, and Firebase Storage.' 
                : 'Connect your own Google Firebase project to run FoodBridge as a production-level, multi-user web app.'}
            </p>
          </div>

          <div style="margin-bottom: 1.25rem;">
            <label class="form-label" style="font-weight: 700;">Option 1: Paste Firebase SDK Configuration Object</label>
            <textarea id="fb-raw-config-input" class="form-control" rows="5" placeholder='Paste your firebaseConfig code here, e.g.:&#10;const firebaseConfig = {&#10;  apiKey: "AIzaSy...",&#10;  projectId: "foodbridge-prod",&#10;  ...&#10;};' style="font-family: monospace; font-size: 0.82rem;"></textarea>
            <div class="form-hint">Paste the entire config snippet from the Firebase Console (Project Settings > General > Your Apps).</div>
          </div>

          <div style="text-align: center; margin: 0.85rem 0; font-size: 0.82rem; color: var(--color-muted); font-weight: 700;">— OR ENTER MANUALLY —</div>

          <div class="grid grid-cols-2 gap-3" style="margin-bottom: 1rem;">
            <div class="form-group" style="margin-bottom: 0.6rem;">
              <label class="form-label" style="font-size: 0.78rem;">API Key <span class="required">*</span></label>
              <input type="text" id="fb-api-key" class="form-control" value="${currentCfg.apiKey && !currentCfg.apiKey.includes('YOUR_') ? currentCfg.apiKey : ''}" placeholder="AIzaSy...">
            </div>
            <div class="form-group" style="margin-bottom: 0.6rem;">
              <label class="form-label" style="font-size: 0.78rem;">Project ID <span class="required">*</span></label>
              <input type="text" id="fb-project-id" class="form-control" value="${currentCfg.projectId && !currentCfg.projectId.includes('demo') ? currentCfg.projectId : ''}" placeholder="my-foodbridge-project">
            </div>
            <div class="form-group" style="margin-bottom: 0.6rem;">
              <label class="form-label" style="font-size: 0.78rem;">Auth Domain</label>
              <input type="text" id="fb-auth-domain" class="form-control" value="${currentCfg.authDomain || ''}" placeholder="project.firebaseapp.com">
            </div>
            <div class="form-group" style="margin-bottom: 0.6rem;">
              <label class="form-label" style="font-size: 0.78rem;">Storage Bucket</label>
              <input type="text" id="fb-storage-bucket" class="form-control" value="${currentCfg.storageBucket || ''}" placeholder="project.appspot.com">
            </div>
            <div class="form-group" style="margin-bottom: 0.6rem;">
              <label class="form-label" style="font-size: 0.78rem;">Messaging Sender ID</label>
              <input type="text" id="fb-messaging-id" class="form-control" value="${currentCfg.messagingSenderId || ''}" placeholder="1234567890">
            </div>
            <div class="form-group" style="margin-bottom: 0.6rem;">
              <label class="form-label" style="font-size: 0.78rem;">App ID</label>
              <input type="text" id="fb-app-id" class="form-control" value="${currentCfg.appId || ''}" placeholder="1:123456:web:abcdef">
            </div>
          </div>
        </div>
        <div class="modal-footer" style="gap: 0.6rem; flex-wrap: wrap;">
          ${isLive ? `
            <button type="button" class="btn btn-outline btn-sm" id="seed-firestore-btn" style="color: var(--color-secondary); border-color: var(--color-secondary);">
              <i class="fa-solid fa-seedling"></i> Seed Firestore with Demo Data
            </button>
            <button type="button" class="btn btn-danger btn-sm" id="disconnect-fb-btn">
              Disconnect & Revert to Demo
            </button>
          ` : ''}
          <button type="button" class="btn btn-ghost btn-sm" id="cancel-fb-modal-btn">Cancel</button>
          <button type="button" class="btn btn-primary btn-sm" id="save-fb-config-btn">
            <i class="fa-solid fa-cloud-arrow-up"></i> Save & Connect Firebase
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modalBackdrop);

    // Event Bindings
    const closeBtn = modalBackdrop.querySelector("#close-fb-modal-btn");
    const cancelBtn = modalBackdrop.querySelector("#cancel-fb-modal-btn");
    const saveBtn = modalBackdrop.querySelector("#save-fb-config-btn");
    const disconnectBtn = modalBackdrop.querySelector("#disconnect-fb-btn");
    const seedBtn = modalBackdrop.querySelector("#seed-firestore-btn");
    const rawInput = modalBackdrop.querySelector("#fb-raw-config-input");

    const closeModal = () => modalBackdrop.classList.remove("active");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
    modalBackdrop.addEventListener("click", (e) => {
      if (e.target === modalBackdrop) closeModal();
    });

    // Auto-parse snippet pasted in textarea
    if (rawInput) {
      rawInput.addEventListener("input", () => {
        const text = rawInput.value;
        const extract = (key) => {
          const match = text.match(new RegExp(`${key}["']?\\s*:\\s*["']([^"']+)["']`));
          return match ? match[1] : "";
        };
        const apiKey = extract("apiKey");
        const projectId = extract("projectId");
        const authDomain = extract("authDomain");
        const storageBucket = extract("storageBucket");
        const messagingSenderId = extract("messagingSenderId");
        const appId = extract("appId");

        if (apiKey) document.getElementById("fb-api-key").value = apiKey;
        if (projectId) document.getElementById("fb-project-id").value = projectId;
        if (authDomain) document.getElementById("fb-auth-domain").value = authDomain;
        if (storageBucket) document.getElementById("fb-storage-bucket").value = storageBucket;
        if (messagingSenderId) document.getElementById("fb-messaging-id").value = messagingSenderId;
        if (appId) document.getElementById("fb-app-id").value = appId;
      });
    }

    // Save & Connect
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        const apiKey = document.getElementById("fb-api-key").value.trim();
        const projectId = document.getElementById("fb-project-id").value.trim();
        const authDomain = document.getElementById("fb-auth-domain").value.trim() || `${projectId}.firebaseapp.com`;
        const storageBucket = document.getElementById("fb-storage-bucket").value.trim() || `${projectId}.appspot.com`;
        const messagingSenderId = document.getElementById("fb-messaging-id").value.trim();
        const appId = document.getElementById("fb-app-id").value.trim();

        if (!apiKey || !projectId) {
          alert("Please provide at least a valid API Key and Project ID.");
          return;
        }

        const newCfg = {
          apiKey,
          authDomain,
          projectId,
          storageBucket,
          messagingSenderId,
          appId
        };

        window.FoodBridgeFirebase.saveConfig(newCfg);
      });
    }

    // Disconnect
    if (disconnectBtn) {
      disconnectBtn.addEventListener("click", () => {
        if (confirm("Disconnect live Firebase and revert to LocalStorage Demo Engine?")) {
          window.FoodBridgeFirebase.clearConfig();
        }
      });
    }

    // Seed Firestore
    if (seedBtn) {
      seedBtn.addEventListener("click", async () => {
        seedBtn.disabled = true;
        seedBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Seeding Firestore...';
        try {
          await window.foodBridgeDB.seedFirestore();
          alert("Cloud Firestore successfully seeded with FoodBridge default users, listings, and workflows!");
          window.location.reload();
        } catch (e) {
          alert("Error seeding Firestore: " + e.message);
          seedBtn.disabled = false;
          seedBtn.innerHTML = '<i class="fa-solid fa-seedling"></i> Seed Firestore with Demo Data';
        }
      });
    }
  }

  modalBackdrop.classList.add("active");
}

window.openFirebaseConnectionModal = openFirebaseConnectionModal;

window.setupDashboardLayout = setupDashboardLayout;
