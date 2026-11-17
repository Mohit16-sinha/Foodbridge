/**
 * FOODSHARE - NGO PORTAL CONTROLLER
 * Powers NGO Dashboard, Available Food, My Requests, Received Donations, and Profile.
 */

document.addEventListener("DOMContentLoaded", async () => {
  const ngo = window.setupDashboardLayout("ngo");
  if (!ngo) return;

  // Show Pending Approval warning if not approved
  displayApprovalBanner(ngo);

  const currentPath = window.location.pathname.toLowerCase();

  if (currentPath.includes("dashboard.html")) {
    await initNGODashboard(ngo);
  } else if (currentPath.includes("available-food.html")) {
    await initNGOAvailableFood(ngo);
  } else if (currentPath.includes("my-requests.html")) {
    await initNGOMyRequests(ngo);
  } else if (currentPath.includes("received-donations.html")) {
    await initNGOReceivedDonations(ngo);
  } else if (currentPath.includes("profile.html")) {
    initNGOProfile(ngo);
  }
});

function displayApprovalBanner(ngo) {
  if (ngo.status !== 'approved') {
    const main = document.querySelector(".dashboard-content");
    if (main && !document.getElementById("approval-warning-banner")) {
      const banner = document.createElement("div");
      banner.id = "approval-warning-banner";
      banner.className = "card mb-6";
      banner.style.backgroundColor = "#FEFCBF";
      banner.style.borderColor = "#D69E2E";
      banner.style.padding = "1.25rem 1.5rem";
      banner.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 1rem;">
          <div style="color: #B7791F; font-size: 1.5rem; margin-top: 2px;">
            <i class="fa-solid fa-clock-rotate-left"></i>
          </div>
          <div style="flex: 1;">
            <h4 style="color: #744210; font-weight: 700; margin-bottom: 0.25rem;">NGO Account Verification In Progress</h4>
            <p style="color: #975A16; font-size: var(--font-size-sm); margin: 0;">
              Your organization registration is currently under review by FoodBridge administrators. 
              You can browse available food listings, but requesting food is disabled until your account is approved.
            </p>
          </div>
        </div>
      `;
      main.insertBefore(banner, main.firstChild);
    }
  }
}

// =========================================================================
// NGO DASHBOARD OVERVIEW
// =========================================================================
async function initNGODashboard(ngo) {
  const availableListings = await window.foodShareDB.getFoodListings({ availableOnly: true });
  const requests = await window.foodShareDB.getDonationRequests({ ngoId: ngo.id });

  const pendingCount = requests.filter(r => r.status === "pending").length;
  const approvedCount = requests.filter(r => r.status === "approved").length;
  const receivedCount = requests.filter(r => r.status === "completed").length;

  document.getElementById("stat-available-donations").textContent = availableListings.length;
  document.getElementById("stat-pending-requests").textContent = pendingCount;
  document.getElementById("stat-approved-requests").textContent = approvedCount;
  document.getElementById("stat-received-donations").textContent = receivedCount;

  // Active Requests Table
  const tbody = document.getElementById("active-requests-tbody");
  const emptyState = document.getElementById("active-requests-empty");

  const active = requests.filter(r => ['pending', 'approved'].includes(r.status));

  if (active.length === 0) {
    if (tbody) tbody.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
  } else {
    if (emptyState) emptyState.style.display = "none";
    if (tbody) {
      tbody.innerHTML = active.map(req => {
        const badge = req.status === "approved" 
          ? '<span class="badge badge-success"><i class="fa-solid fa-truck"></i> Approved - Dispatch Assigned</span>'
          : '<span class="badge badge-warning"><i class="fa-solid fa-hourglass-half"></i> Pending Donor Review</span>';

        return `
          <tr>
            <td><strong>${escapeHTML(req.foodName)}</strong></td>
            <td>${escapeHTML(req.donorName)}</td>
            <td><strong class="text-success">${req.requestedQuantity} ${req.unit}</strong></td>
            <td>${badge}</td>
            <td>${window.formatTimeAgo(req.createdAt)}</td>
            <td>
              ${req.status === 'pending' ? `
                <button class="btn btn-outline btn-sm" onclick="handleCancelRequest('${req.id}')" style="color: var(--color-danger); border-color: var(--color-danger);">
                  Cancel
                </button>
              ` : `
                <a href="/ngo/my-requests.html" class="btn btn-primary btn-sm">Track</a>
              `}
            </td>
          </tr>
        `;
      }).join("");
    }
  }

  // Recommended Listings Preview
  const previewGrid = document.getElementById("available-preview-grid");
  if (previewGrid) {
    previewGrid.innerHTML = availableListings.slice(0, 3).map(l => renderNGOFoodCard(l, ngo)).join("");
  }
}

// =========================================================================
// BROWSE AVAILABLE FOOD WITH MAP & FILTERS
// =========================================================================
let mapInstance = null;
let mapMarkers = [];

async function initNGOAvailableFood(ngo) {
  const container = document.getElementById("available-food-grid");
  const emptyState = document.getElementById("available-food-empty");
  const searchInput = document.getElementById("search-food");
  const categoryFilter = document.getElementById("filter-category");
  const cityFilter = document.getElementById("filter-city");
  const sortSelect = document.getElementById("sort-by");

  // Initialize Leaflet Map
  initLeafletMap();

  async function render() {
    const filter = {
      availableOnly: true,
      search: searchInput?.value || "",
      category: categoryFilter?.value || "All",
      city: cityFilter?.value || "All",
      sortBy: sortSelect?.value || "deadline"
    };

    const listings = await window.foodShareDB.getFoodListings(filter);

    // Update Map Pins
    updateMapPins(listings);

    if (listings.length === 0) {
      if (container) container.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      return;
    }

    if (emptyState) emptyState.style.display = "none";
    if (container) {
      container.innerHTML = listings.map(l => renderNGOFoodCard(l, ngo)).join("");
    }
  }

  if (searchInput) searchInput.addEventListener("input", debounce(render, 250));
  if (categoryFilter) categoryFilter.addEventListener("change", render);
  if (cityFilter) cityFilter.addEventListener("change", render);
  if (sortSelect) sortSelect.addEventListener("change", render);

  // Request Food Modal Submission
  const reqForm = document.getElementById("request-food-form");
  if (reqForm) {
    reqForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const listingId = document.getElementById("request-listing-id").value;
      const quantity = parseInt(document.getElementById("request-quantity").value, 10);
      const message = document.getElementById("request-message").value;
      const submitBtn = reqForm.querySelector("button[type='submit']");

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting Request...';
        }

        await window.foodShareDB.createDonationRequest({
          listingId,
          ngoId: ngo.id,
          requestedQuantity: quantity,
          message
        });

        window.closeModal("request-food-modal");
        window.showToast("Donation request successfully sent to donor!", "success");
        setTimeout(() => {
          window.location.href = "/ngo/my-requests.html";
        }, 1000);

      } catch (err) {
        window.showToast(err.message || "Failed to submit request.", "error");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Confirm Request <i class="fa-solid fa-paper-plane"></i>';
        }
      }
    });
  }

  await render();
}

function initLeafletMap() {
  const mapEl = document.getElementById("food-map");
  if (!mapEl || typeof L === 'undefined') return;

  // San Francisco center default
  mapInstance = L.map("food-map").setView([37.7749, -122.4194], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(mapInstance);
}

function updateMapPins(listings) {
  if (!mapInstance || typeof L === 'undefined') return;

  // Clear existing markers
  mapMarkers.forEach(m => mapInstance.removeLayer(m));
  mapMarkers = [];

  const bounds = [];

  listings.forEach(l => {
    const lat = l.lat || (37.7749 + (Math.random() - 0.5) * 0.04);
    const lng = l.lng || (-122.4194 + (Math.random() - 0.5) * 0.04);

    const marker = L.marker([lat, lng]).addTo(mapInstance);
    
    marker.bindPopup(`
      <div style="font-family: var(--font-family); padding: 4px;">
        <div class="custom-popup-title">${escapeHTML(l.foodName)}</div>
        <div class="custom-popup-subtitle"><i class="fa-solid fa-store"></i> ${escapeHTML(l.donorName)}</div>
        <div style="font-size: 0.75rem; margin: 6px 0; color: #2F855A; font-weight: 700;">
          ${l.availableQuantity} ${l.unit} available
        </div>
        <button class="btn btn-primary btn-sm btn-full" onclick="openRequestModal('${l.id}')">
          Request This Food
        </button>
      </div>
    `);

    mapMarkers.push(marker);
    bounds.push([lat, lng]);
  });

  if (bounds.length > 0) {
    mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }
}

// Opens the Request Food Modal
window.openRequestModal = async function(listingId) {
  const ngo = window.foodShareAuth.getCurrentUser();
  if (ngo.status !== 'approved') {
    window.showToast("Your NGO account is currently pending administrative verification. Unapproved organizations cannot request food.", "warning");
    return;
  }

  const listing = await window.foodShareDB.getFoodListingById(listingId);
  if (!listing) return;

  document.getElementById("request-listing-id").value = listing.id;
  document.getElementById("modal-food-name").textContent = listing.foodName;
  document.getElementById("modal-donor-name").textContent = listing.donorName;
  document.getElementById("modal-available-qty").textContent = `${listing.availableQuantity} ${listing.unit}`;
  document.getElementById("modal-deadline").textContent = new Date(listing.pickupDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
  document.getElementById("modal-pickup-location").textContent = `${listing.location}, ${listing.city}`;

  const qtyInput = document.getElementById("request-quantity");
  qtyInput.max = listing.availableQuantity;
  qtyInput.value = Math.min(listing.availableQuantity, 10);
  document.getElementById("modal-unit-label").textContent = listing.unit;

  window.openModal("request-food-modal");
};

// =========================================================================
// MY REQUESTS
// =========================================================================
async function initNGOMyRequests(ngo) {
  const container = document.getElementById("my-requests-list");
  const emptyState = document.getElementById("my-requests-empty");
  const statusFilter = document.getElementById("filter-status");

  async function render() {
    const status = statusFilter?.value || "";
    const filter = { ngoId: ngo.id };
    if (status && status !== "All") filter.status = status;

    const requests = await window.foodShareDB.getDonationRequests(filter);

    if (requests.length === 0) {
      if (container) container.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      return;
    }

    if (emptyState) emptyState.style.display = "none";
    if (container) {
      container.innerHTML = requests.map(req => renderNGORequestItem(req)).join("");
    }
  }

  if (statusFilter) statusFilter.addEventListener("change", render);
  await render();
}

window.handleCancelRequest = async function(requestId) {
  const ngo = window.foodShareAuth.getCurrentUser();
  if (!confirm("Are you sure you want to cancel this pending request?")) return;

  try {
    await window.foodShareDB.cancelDonationRequest(requestId, ngo.id);
    window.showToast("Request cancelled.", "info");
    setTimeout(() => window.location.reload(), 500);
  } catch (err) {
    window.showToast(err.message || "Failed to cancel request.", "error");
  }
};

// =========================================================================
// RECEIVED DONATIONS
// =========================================================================
async function initNGOReceivedDonations(ngo) {
  const tbody = document.getElementById("received-tbody");
  const emptyState = document.getElementById("received-empty");

  const completed = await window.foodShareDB.getDonationRequests({
    ngoId: ngo.id,
    status: "completed"
  });

  if (completed.length === 0) {
    if (tbody) tbody.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  if (tbody) {
    tbody.innerHTML = completed.map(req => `
      <tr>
        <td><strong>${escapeHTML(req.foodName)}</strong></td>
        <td><i class="fa-solid fa-store text-muted"></i> ${escapeHTML(req.donorName)}</td>
        <td><strong class="text-success">${req.requestedQuantity} ${req.unit}</strong></td>
        <td><i class="fa-solid fa-person-biking text-muted"></i> ${escapeHTML(req.volunteerName || 'Volunteer')}</td>
        <td>${new Date(req.updatedAt).toLocaleDateString()}</td>
        <td><span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Distributed</span></td>
      </tr>
    `).join("");
  }
}

// =========================================================================
// NGO PROFILE
// =========================================================================
function initNGOProfile(ngo) {
  const form = document.getElementById("ngo-profile-form");
  if (!form) return;

  document.getElementById("profile-name").value = ngo.name || "";
  document.getElementById("profile-email").value = ngo.email || "";
  document.getElementById("profile-reg-number").value = ngo.regNumber || "";
  document.getElementById("profile-contact-person").value = ngo.contactPerson || "";
  document.getElementById("profile-phone").value = ngo.phone || "";
  document.getElementById("profile-address").value = ngo.address || "";
  document.getElementById("profile-city").value = ngo.city || "San Francisco";
  document.getElementById("profile-bio").value = ngo.bio || "";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const updated = await window.foodShareDB.updateUser(ngo.id, {
        name: document.getElementById("profile-name").value,
        regNumber: document.getElementById("profile-reg-number").value,
        contactPerson: document.getElementById("profile-contact-person").value,
        phone: document.getElementById("profile-phone").value,
        address: document.getElementById("profile-address").value,
        city: document.getElementById("profile-city").value,
        bio: document.getElementById("profile-bio").value
      });

      window.foodShareAuth.saveSession(updated);
      window.showToast("NGO profile successfully updated!", "success");
    } catch (err) {
      window.showToast(err.message || "Failed to update profile.", "error");
    }
  });
}

// UI Render Helpers
function renderNGOFoodCard(l, ngo) {
  const isUrgent = (new Date(l.pickupDeadline).getTime() - Date.now()) < 3 * 3600 * 1000;
  const deadlineDate = new Date(l.pickupDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
  const isApproved = ngo.status === 'approved';

  return `
    <div class="food-card">
      <div class="food-card-image-wrap">
        <img src="${l.imageUrl}" alt="${escapeHTML(l.foodName)}" loading="lazy">
        <div class="food-card-badges">
          <span class="food-badge-category">${escapeHTML(l.category)}</span>
          <span class="food-badge-storage"><i class="fa-regular fa-snowflake"></i> ${l.storageType}</span>
        </div>
      </div>
      <div class="food-card-body">
        <h3 class="food-card-title">${escapeHTML(l.foodName)}</h3>
        <div class="food-card-donor">
          <i class="fa-solid fa-store"></i> ${escapeHTML(l.donorName)}
        </div>
        <div class="food-card-meta-grid">
          <div class="food-meta-item">
            <span class="food-meta-label">Available Qty</span>
            <span class="food-meta-value qty">${l.availableQuantity} ${l.unit}</span>
          </div>
          <div class="food-meta-item">
            <span class="food-meta-label">Total Qty</span>
            <span class="food-meta-value">${l.quantity} ${l.unit}</span>
          </div>
        </div>
        <div class="food-card-location">
          <i class="fa-solid fa-location-dot"></i> ${escapeHTML(l.location)}, ${escapeHTML(l.city)}
        </div>
        <div class="food-card-deadline ${isUrgent ? 'urgent' : 'safe'}">
          <i class="fa-regular fa-clock"></i> Pickup by: ${deadlineDate}
        </div>
        <div class="food-card-allergens">
          ${(l.allergens || ["None"]).map(a => `<span class="allergen-tag">${a}</span>`).join("")}
        </div>
        <div class="food-card-footer">
          <button class="btn btn-primary btn-full ${!isApproved ? 'disabled' : ''}" 
                  onclick="openRequestModal('${l.id}')"
                  ${!isApproved ? 'title="Account pending admin approval"' : ''}>
            <i class="fa-solid fa-hand-holding-heart"></i> Request Food
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderNGORequestItem(req) {
  let badgeClass = "badge-neutral";
  let statusText = req.status;

  if (req.status === "pending") {
    badgeClass = "badge-warning";
    statusText = "Awaiting Donor Approval";
  } else if (req.status === "approved") {
    badgeClass = "badge-success";
    statusText = "Approved / In Transit";
  } else if (req.status === "completed") {
    badgeClass = "badge-primary";
    statusText = "Completed & Delivered";
  } else if (req.status === "rejected") {
    badgeClass = "badge-danger";
    statusText = "Declined by Donor";
  }

  return `
    <div class="card mb-4">
      <div class="card-body">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--color-primary); margin-bottom: 0.25rem;">
              ${escapeHTML(req.foodName)}
            </h3>
            <div style="font-size: var(--font-size-xs); color: var(--color-muted);">
              Donor: <strong>${escapeHTML(req.donorName)}</strong> | Requested: ${window.formatTimeAgo(req.createdAt)}
            </div>
          </div>
          <span class="badge ${badgeClass}" style="font-size: var(--font-size-xs); padding: 0.35rem 0.75rem;">
            ${statusText}
          </span>
        </div>

        <div style="margin: 1rem 0; padding: 0.85rem; background: var(--color-bg); border-radius: var(--radius-md); font-size: var(--font-size-sm);">
          <div><strong>Requested Quantity:</strong> <span class="text-success font-bold">${req.requestedQuantity} ${req.unit}</span></div>
          <div style="margin-top: 4px;"><strong>Your Note to Donor:</strong> <em>"${escapeHTML(req.message || 'No additional note')}"</em></div>
          ${req.volunteerName ? `
            <div style="margin-top: 4px;">
              <i class="fa-solid fa-truck text-secondary"></i> <strong>Assigned Volunteer:</strong> ${escapeHTML(req.volunteerName)}
            </div>
          ` : ''}
        </div>

        ${req.status === 'approved' ? `
          <div style="background: var(--color-light-green); border: 1px solid rgba(47, 133, 90, 0.2); border-radius: var(--radius-md); padding: 0.85rem; font-size: var(--font-size-xs); color: var(--color-primary);">
            <i class="fa-solid fa-circle-check text-success"></i> <strong>Approved!</strong> Volunteer is dispatched to pick up the food from the donor. Expect delivery shortly.
          </div>
        ` : ''}

        ${req.status === 'pending' ? `
          <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
            <button class="btn btn-outline btn-sm text-danger" onclick="handleCancelRequest('${req.id}')">
              <i class="fa-solid fa-trash-can"></i> Cancel Request
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// Utilities
function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

