/**
 * FOODSHARE - DONOR PORTAL CONTROLLER
 * Powers Donor Dashboard, Add Food, My Listings, Requests, History, and Profile.
 */

document.addEventListener("DOMContentLoaded", async () => {
  const donor = window.setupDashboardLayout("donor");
  if (!donor) return;

  const currentPath = window.location.pathname.toLowerCase();

  if (currentPath.includes("dashboard.html")) {
    await initDonorDashboard(donor);
  } else if (currentPath.includes("add-food.html")) {
    initAddFoodForm(donor);
  } else if (currentPath.includes("my-listings.html")) {
    await initMyListings(donor);
  } else if (currentPath.includes("requests.html")) {
    await initDonorRequests(donor);
  } else if (currentPath.includes("history.html")) {
    await initDonorHistory(donor);
  } else if (currentPath.includes("profile.html")) {
    initDonorProfile(donor);
  }
});

// =========================================================================
// DONOR DASHBOARD OVERVIEW
// =========================================================================
async function initDonorDashboard(donor) {
  const listings = await window.foodShareDB.getFoodListings({ donorId: donor.id });
  const requests = await window.foodShareDB.getDonationRequests({ donorId: donor.id });

  const totalListings = listings.length;
  const availableListings = listings.filter(l => l.status === "available" && l.availableQuantity > 0).length;
  const approvedRequests = requests.filter(r => r.status === "approved").length;
  const completedDonations = requests.filter(r => r.status === "completed").length;

  // Set Stat Values
  document.getElementById("stat-total-listings").textContent = totalListings;
  document.getElementById("stat-available-food").textContent = availableListings;
  document.getElementById("stat-approved-requests").textContent = approvedRequests;
  document.getElementById("stat-completed-donations").textContent = completedDonations;

  // Render Pending Requests Action Table
  const pendingRequests = requests.filter(r => r.status === "pending");
  const pendingTableBody = document.getElementById("pending-requests-tbody");
  const pendingEmpty = document.getElementById("pending-requests-empty");

  if (pendingRequests.length === 0) {
    if (pendingTableBody) pendingTableBody.innerHTML = "";
    if (pendingEmpty) pendingEmpty.style.display = "block";
  } else {
    if (pendingEmpty) pendingEmpty.style.display = "none";
    if (pendingTableBody) {
      pendingTableBody.innerHTML = pendingRequests.slice(0, 5).map(req => `
        <tr>
          <td>
            <strong>${escapeHTML(req.foodName)}</strong>
          </td>
          <td>
            <span class="badge badge-primary"><i class="fa-solid fa-building-ngo"></i> ${escapeHTML(req.ngoName)}</span>
          </td>
          <td>
            <span class="font-bold text-success">${req.requestedQuantity} ${req.unit}</span>
          </td>
          <td>
            <span class="text-muted" style="font-size: var(--font-size-xs);">${window.formatTimeAgo(req.createdAt)}</span>
          </td>
          <td>
            <div class="table-actions">
              <button class="btn btn-secondary btn-sm" onclick="handleApproveRequest('${req.id}')">
                <i class="fa-solid fa-check"></i> Approve
              </button>
              <button class="btn btn-danger btn-sm" onclick="handleRejectRequest('${req.id}')">
                <i class="fa-solid fa-xmark"></i> Reject
              </button>
            </div>
          </td>
        </tr>
      `).join("");
    }
  }

  // Render Recent Listings
  const recentListingsGrid = document.getElementById("recent-listings-grid");
  if (recentListingsGrid) {
    if (listings.length === 0) {
      recentListingsGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon"><i class="fa-solid fa-bowl-food"></i></div>
          <h4 class="empty-state-title">No Food Listings Yet</h4>
          <p class="empty-state-desc">You haven't listed any surplus food. List your first donation to feed those in need!</p>
          <a href="/donor/add-food.html" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Add Food Donation</a>
        </div>
      `;
    } else {
      recentListingsGrid.innerHTML = listings.slice(0, 3).map(listing => renderListingCardHTML(listing, true)).join("");
    }
  }
}

// =========================================================================
// ADD FOOD DONATION
// =========================================================================
function initAddFoodForm(donor) {
  const form = document.getElementById("add-food-form");
  if (!form) return;

  // Preset pickup address from donor profile
  const addressInput = document.getElementById("food-location");
  const phoneInput = document.getElementById("food-phone");
  const cityInput = document.getElementById("food-city");

  if (addressInput && donor.address) addressInput.value = donor.address;
  if (phoneInput && donor.phone) phoneInput.value = donor.phone;
  if (cityInput && donor.city) cityInput.value = donor.city;

  // Set default prep date to now and pickup deadline to +6 hours
  const now = new Date();
  const prepEl = document.getElementById("food-prep-time");
  const deadlineEl = document.getElementById("food-pickup-deadline");

  if (prepEl) {
    prepEl.value = toLocalISO(now);
  }
  if (deadlineEl) {
    const deadline = new Date(Date.now() + 6 * 3600 * 1000);
    deadlineEl.value = toLocalISO(deadline);
  }

  // Image Presets Selector
  document.querySelectorAll(".image-preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const url = btn.getAttribute("data-img-url");
      const imgInput = document.getElementById("food-image-url");
      const preview = document.getElementById("food-image-preview");
      if (imgInput) imgInput.value = url;
      if (preview) {
        preview.src = url;
        preview.style.display = "block";
      }
    });
  });

  const customImgInput = document.getElementById("food-image-url");
  if (customImgInput) {
    customImgInput.addEventListener("input", () => {
      const preview = document.getElementById("food-image-preview");
      if (preview && customImgInput.value) {
        preview.src = customImgInput.value;
        preview.style.display = "block";
      }
    });
  }

  // Form Submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector("button[type='submit']");

    try {
      // Gather allergens
      const allergens = [];
      document.querySelectorAll("input[name='allergens']:checked").forEach(cb => {
        allergens.push(cb.value);
      });
      if (allergens.length === 0) allergens.push("None");

      // Verify Safety Declaration
      const safetyChecked = document.getElementById("safety-declaration")?.checked;
      if (!safetyChecked) {
        throw new Error("You must certify that the food has been safely handled and stored.");
      }

      const listingData = {
        donorId: donor.id,
        donorName: donor.name,
        foodName: document.getElementById("food-name").value,
        category: document.getElementById("food-category").value,
        description: document.getElementById("food-description").value,
        quantity: parseInt(document.getElementById("food-quantity").value, 10),
        unit: document.getElementById("food-unit").value,
        imageUrl: document.getElementById("food-image-url").value || "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80",
        preparedAt: document.getElementById("food-prep-time").value,
        pickupDeadline: document.getElementById("food-pickup-deadline").value,
        storageType: document.getElementById("food-storage").value,
        allergens,
        location: document.getElementById("food-location").value,
        city: document.getElementById("food-city").value,
        contactPhone: document.getElementById("food-phone").value,
        safetyDeclaration: true
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing Listing...';
      }

      await window.foodShareDB.createFoodListing(listingData);

      window.showToast("Surplus food listing successfully published!", "success");
      setTimeout(() => {
        window.location.href = "/donor/my-listings.html";
      }, 1000);

    } catch (err) {
      window.showToast(err.message || "Failed to create listing.", "error");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publish Food Listing';
      }
    }
  });
}

// =========================================================================
// MY LISTINGS
// =========================================================================
async function initMyListings(donor) {
  const container = document.getElementById("my-listings-container");
  const emptyState = document.getElementById("my-listings-empty");
  const searchInput = document.getElementById("search-listings");
  const categoryFilter = document.getElementById("filter-category");

  async function render() {
    const search = searchInput?.value || "";
    const category = categoryFilter?.value || "All";

    const listings = await window.foodShareDB.getFoodListings({
      donorId: donor.id,
      search,
      category
    });

    if (listings.length === 0) {
      if (container) container.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      return;
    }

    if (emptyState) emptyState.style.display = "none";
    if (container) {
      container.innerHTML = listings.map(l => renderListingCardHTML(l, false)).join("");
    }
  }

  if (searchInput) searchInput.addEventListener("input", debounce(render, 250));
  if (categoryFilter) categoryFilter.addEventListener("change", render);

  await render();
}

// =========================================================================
// DONOR REQUESTS MANAGEMENT
// =========================================================================
async function initDonorRequests(donor) {
  const tbody = document.getElementById("requests-tbody");
  const emptyState = document.getElementById("requests-empty");
  const statusFilter = document.getElementById("filter-request-status");

  async function render() {
    const status = statusFilter?.value || "";
    const filter = { donorId: donor.id };
    if (status && status !== "All") filter.status = status;

    const requests = await window.foodShareDB.getDonationRequests(filter);

    if (requests.length === 0) {
      if (tbody) tbody.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      return;
    }

    if (emptyState) emptyState.style.display = "none";
    if (tbody) {
      tbody.innerHTML = requests.map(req => {
        let statusBadge = "";
        if (req.status === "pending") statusBadge = '<span class="badge badge-warning">Pending Review</span>';
        else if (req.status === "approved") statusBadge = '<span class="badge badge-success">Approved / In Transit</span>';
        else if (req.status === "completed") statusBadge = '<span class="badge badge-primary">Completed</span>';
        else if (req.status === "rejected") statusBadge = '<span class="badge badge-danger">Rejected</span>';
        else statusBadge = `<span class="badge badge-neutral">${req.status}</span>`;

        let actions = "-";
        if (req.status === "pending") {
          actions = `
            <div class="table-actions">
              <button class="btn btn-secondary btn-sm" onclick="handleApproveRequest('${req.id}')" title="Approve Request">
                <i class="fa-solid fa-check"></i> Approve
              </button>
              <button class="btn btn-danger btn-sm" onclick="handleRejectRequest('${req.id}')" title="Reject Request">
                <i class="fa-solid fa-xmark"></i> Reject
              </button>
            </div>
          `;
        } else if (req.status === "approved") {
          actions = `<span class="text-muted" style="font-size: var(--font-size-xs);"><i class="fa-solid fa-truck"></i> Volunteer: ${escapeHTML(req.volunteerName || 'Assigned')}</span>`;
        }

        return `
          <tr>
            <td>
              <strong>${escapeHTML(req.foodName)}</strong>
              <div class="text-muted" style="font-size: 0.75rem;">ID: ${req.id}</div>
            </td>
            <td>
              <span class="font-bold">${escapeHTML(req.ngoName)}</span>
              <div class="text-muted" style="font-size: 0.75rem;">"${escapeHTML(req.message || '')}"</div>
            </td>
            <td>
              <strong class="text-success">${req.requestedQuantity} ${req.unit}</strong>
            </td>
            <td>${statusBadge}</td>
            <td>${window.formatTimeAgo(req.createdAt)}</td>
            <td>${actions}</td>
          </tr>
        `;
      }).join("");
    }
  }

  if (statusFilter) statusFilter.addEventListener("change", render);
  await render();
}

// Global action handlers for Requests
window.handleApproveRequest = async function(requestId) {
  const donor = window.foodShareAuth.getCurrentUser();
  if (!confirm("Are you sure you want to approve this donation request? The requested quantity will be reserved and a volunteer will be dispatched for pickup.")) {
    return;
  }

  try {
    await window.foodShareDB.approveDonationRequest(requestId, donor.id);
    window.showToast("Donation request approved! Volunteer dispatch created.", "success");
    setTimeout(() => window.location.reload(), 600);
  } catch (err) {
    window.showToast(err.message || "Approval failed.", "error");
  }
};

window.handleRejectRequest = async function(requestId) {
  const donor = window.foodShareAuth.getCurrentUser();
  const reason = prompt("Please provide a reason for rejecting this request (optional):", "Food item committed or no longer available.");
  if (reason === null) return; // user cancelled

  try {
    await window.foodShareDB.rejectDonationRequest(requestId, donor.id, reason);
    window.showToast("Donation request rejected.", "info");
    setTimeout(() => window.location.reload(), 600);
  } catch (err) {
    window.showToast(err.message || "Failed to reject request.", "error");
  }
};

// =========================================================================
// DONOR HISTORY
// =========================================================================
async function initDonorHistory(donor) {
  const tbody = document.getElementById("history-tbody");
  const emptyState = document.getElementById("history-empty");

  const requests = await window.foodShareDB.getDonationRequests({
    donorId: donor.id,
    status: "completed"
  });

  if (requests.length === 0) {
    if (tbody) tbody.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  if (tbody) {
    tbody.innerHTML = requests.map(req => `
      <tr>
        <td><strong>${escapeHTML(req.foodName)}</strong></td>
        <td><span class="badge badge-primary"><i class="fa-solid fa-hand-holding-heart"></i> ${escapeHTML(req.ngoName)}</span></td>
        <td><strong class="text-success">${req.requestedQuantity} ${req.unit}</strong></td>
        <td><i class="fa-solid fa-person-biking text-muted"></i> ${escapeHTML(req.volunteerName || 'Volunteer')}</td>
        <td>${new Date(req.updatedAt).toLocaleDateString()}</td>
        <td><span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Fulfilled</span></td>
      </tr>
    `).join("");
  }
}

// =========================================================================
// DONOR PROFILE
// =========================================================================
function initDonorProfile(donor) {
  const form = document.getElementById("donor-profile-form");
  if (!form) return;

  // Fill existing values
  document.getElementById("profile-name").value = donor.name || "";
  document.getElementById("profile-email").value = donor.email || "";
  document.getElementById("profile-phone").value = donor.phone || "";
  document.getElementById("profile-address").value = donor.address || "";
  document.getElementById("profile-city").value = donor.city || "San Francisco";
  document.getElementById("profile-bio").value = donor.bio || "";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const updated = await window.foodShareDB.updateUser(donor.id, {
        name: document.getElementById("profile-name").value,
        phone: document.getElementById("profile-phone").value,
        address: document.getElementById("profile-address").value,
        city: document.getElementById("profile-city").value,
        bio: document.getElementById("profile-bio").value
      });

      window.foodShareAuth.saveSession(updated);
      window.showToast("Donor profile successfully updated!", "success");
    } catch (err) {
      window.showToast(err.message || "Failed to update profile.", "error");
    }
  });
}

// Helper to render card HTML
function renderListingCardHTML(l, isCompact = false) {
  const isUrgent = (new Date(l.pickupDeadline).getTime() - Date.now()) < 3 * 3600 * 1000;
  const deadlineDate = new Date(l.pickupDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });

  return `
    <div class="food-card" id="card-${l.id}">
      <div class="food-card-image-wrap">
        <img src="${l.imageUrl}" alt="${escapeHTML(l.foodName)}" loading="lazy">
        <div class="food-card-badges">
          <span class="food-badge-category">${escapeHTML(l.category)}</span>
          <span class="food-badge-storage"><i class="fa-regular fa-snowflake"></i> ${l.storageType}</span>
        </div>
      </div>
      <div class="food-card-body">
        <h3 class="food-card-title">${escapeHTML(l.foodName)}</h3>
        <div class="food-card-meta-grid">
          <div class="food-meta-item">
            <span class="food-meta-label">Available</span>
            <span class="food-meta-value qty">${l.availableQuantity} / ${l.quantity} ${l.unit}</span>
          </div>
          <div class="food-meta-item">
            <span class="food-meta-label">Status</span>
            <span class="food-meta-value"><span class="badge ${l.status === 'available' ? 'badge-success' : 'badge-neutral'}">${l.status}</span></span>
          </div>
        </div>
        <div class="food-card-location">
          <i class="fa-solid fa-location-dot"></i> ${escapeHTML(l.location)}, ${escapeHTML(l.city)}
        </div>
        <div class="food-card-deadline ${isUrgent ? 'urgent' : 'safe'}">
          <i class="fa-regular fa-clock"></i> Pickup by: ${deadlineDate}
        </div>
        ${!isCompact ? `
          <div class="food-card-footer">
            <button class="btn btn-outline btn-sm btn-full" onclick="openEditListingModal('${l.id}')">
              <i class="fa-solid fa-pen-to-square"></i> Edit
            </button>
            <button class="btn btn-danger btn-sm" onclick="handleDeleteListing('${l.id}')" title="Delete Listing">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// Edit & Delete Listing Handlers
window.handleDeleteListing = async function(listingId) {
  if (!confirm("Are you sure you want to delete this food listing? This cannot be undone.")) return;

  try {
    await window.foodShareDB.deleteFoodListing(listingId);
    window.showToast("Food listing deleted.", "info");
    const card = document.getElementById(`card-${listingId}`);
    if (card) card.remove();
  } catch (err) {
    window.showToast(err.message || "Failed to delete listing.", "error");
  }
};

window.openEditListingModal = async function(listingId) {
  const listing = await window.foodShareDB.getFoodListingById(listingId);
  if (!listing) return;

  document.getElementById("edit-listing-id").value = listing.id;
  document.getElementById("edit-food-name").value = listing.foodName;
  document.getElementById("edit-available-qty").value = listing.availableQuantity;
  document.getElementById("edit-storage").value = listing.storageType;
  document.getElementById("edit-description").value = listing.description;

  window.openModal("edit-listing-modal");
};

// Bind edit listing form if present
document.addEventListener("DOMContentLoaded", () => {
  const editForm = document.getElementById("edit-listing-form");
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("edit-listing-id").value;
      try {
        await window.foodShareDB.updateFoodListing(id, {
          foodName: document.getElementById("edit-food-name").value,
          availableQuantity: parseInt(document.getElementById("edit-available-qty").value, 10),
          storageType: document.getElementById("edit-storage").value,
          description: document.getElementById("edit-description").value
        });
        window.closeModal("edit-listing-modal");
        window.showToast("Food listing updated successfully!", "success");
        setTimeout(() => window.location.reload(), 500);
      } catch (err) {
        window.showToast(err.message || "Failed to update listing.", "error");
      }
    });
  }
});

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

function toLocalISO(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return (new Date(date - offset)).toISOString().slice(0, 16);
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

