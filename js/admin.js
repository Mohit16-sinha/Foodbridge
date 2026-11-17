/**
 * FOODSHARE - ADMIN PORTAL CONTROLLER
 * Powers Admin Dashboard, User Management, NGO Verification, Listings Moderation,
 * Donation Tracker, Volunteers Directory, and Chart.js Analytics Reports.
 */

document.addEventListener("DOMContentLoaded", async () => {
  const admin = window.setupDashboardLayout("admin");
  if (!admin) return;

  const currentPath = window.location.pathname.toLowerCase();

  if (currentPath.includes("dashboard.html")) {
    await initAdminDashboard();
  } else if (currentPath.includes("users.html")) {
    await initAdminUsers();
  } else if (currentPath.includes("ngos.html")) {
    await initAdminNGOVerification();
  } else if (currentPath.includes("food-listings.html")) {
    await initAdminFoodListings();
  } else if (currentPath.includes("donations.html")) {
    await initAdminDonations();
  } else if (currentPath.includes("volunteers.html")) {
    await initAdminVolunteers();
  } else if (currentPath.includes("reports.html")) {
    await initAdminReports();
  }
});

// =========================================================================
// ADMIN DASHBOARD OVERVIEW
// =========================================================================
async function initAdminDashboard() {
  try {
    const stats = (await window.foodShareDB.getPlatformStats()) || {};

    const elTotalUsers = document.getElementById("stat-total-users");
    if (elTotalUsers) elTotalUsers.textContent = stats.totalUsers ?? 0;

    const elTotalDonors = document.getElementById("stat-total-donors");
    if (elTotalDonors) elTotalDonors.textContent = stats.totalDonors ?? 0;

    const elTotalNgos = document.getElementById("stat-total-ngos");
    if (elTotalNgos) elTotalNgos.textContent = stats.totalNGOs ?? stats.totalNgos ?? 0;

    const elTotalVolunteers = document.getElementById("stat-total-volunteers");
    if (elTotalVolunteers) elTotalVolunteers.textContent = stats.totalVolunteers ?? 0;

    const elTotalListings = document.getElementById("stat-total-listings");
    if (elTotalListings) elTotalListings.textContent = stats.totalListings ?? 0;

    const elCompletedDonations = document.getElementById("stat-completed-donations");
    if (elCompletedDonations) elCompletedDonations.textContent = stats.completedDonations ?? stats.totalDonationsCompleted ?? 0;

    const elMealsDonated = document.getElementById("stat-meals-donated");
    const rawMeals = stats.totalMealsDonated ?? stats.totalQuantityDonated ?? 0;
    if (elMealsDonated) elMealsDonated.textContent = Number(rawMeals).toLocaleString();
  } catch (err) {
    console.error("[Admin Dashboard] Error updating stat cards:", err);
  }

  // Pending NGO Approvals Widget
  try {
    const pendingNGOs = await window.foodShareDB.getUsers({ role: "ngo", status: "pending" });
    const pendingContainer = document.getElementById("pending-ngos-list");
    const pendingEmpty = document.getElementById("pending-ngos-empty");

    if (!pendingNGOs || pendingNGOs.length === 0) {
      if (pendingContainer) pendingContainer.innerHTML = "";
      if (pendingEmpty) pendingEmpty.style.display = "block";
    } else {
      if (pendingEmpty) pendingEmpty.style.display = "none";
      if (pendingContainer) {
        pendingContainer.innerHTML = pendingNGOs.map(ngo => `
          <div class="card mb-3" style="padding: 1rem 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
              <div>
                <strong style="color: var(--color-primary); font-size: var(--font-size-sm);">${escapeHTML(ngo.name)}</strong>
                <div style="font-size: var(--font-size-xs); color: var(--color-muted);">
                  Reg: ${escapeHTML(ngo.regNumber || 'N/A')} | Contact: ${escapeHTML(ngo.contactPerson || 'N/A')}
                </div>
              </div>
              <div class="table-actions">
                <button class="btn btn-secondary btn-sm" onclick="handleVerifyNGO('${ngo.id}', 'approved')">
                  <i class="fa-solid fa-check"></i> Approve
                </button>
                <button class="btn btn-danger btn-sm" onclick="handleVerifyNGO('${ngo.id}', 'rejected')">
                  <i class="fa-solid fa-xmark"></i> Reject
                </button>
              </div>
            </div>
          </div>
        `).join("");
      }
    }
  } catch (err) {
    console.error("[Admin Dashboard] Error loading pending NGOs:", err);
  }

  // Mini Chart Preview if canvas exists
  try {
    const canvas = document.getElementById("mini-impact-chart");
    if (canvas && typeof Chart !== 'undefined') {
      new Chart(canvas, {
        type: "line",
        data: {
          labels: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"],
          datasets: [{
            label: "Meals Redistributed",
            data: [120, 240, 480, 850, 1420, 2850],
            borderColor: "#227150",
            backgroundColor: "rgba(34, 113, 80, 0.12)",
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointBackgroundColor: "#227150",
            pointRadius: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { 
            legend: { display: false },
            tooltip: {
              backgroundColor: "#11332B",
              titleColor: "#ffffff",
              bodyColor: "#E8F5EE",
              padding: 10,
              cornerRadius: 8
            }
          },
          scales: { 
            y: { 
              beginAtZero: true,
              grid: { color: "rgba(17, 51, 43, 0.06)" }
            },
            x: {
              grid: { display: false }
            }
          }
        }
      });
    }
  } catch (err) {
    console.error("[Admin Dashboard] Error initializing impact chart:", err);
  }
}

// =========================================================================
// USER MANAGEMENT
// =========================================================================
async function initAdminUsers() {
  const tbody = document.getElementById("users-tbody");
  const emptyState = document.getElementById("users-empty");
  const searchInput = document.getElementById("search-users");
  const roleFilter = document.getElementById("filter-user-role");

  async function render() {
    const filter = {
      search: searchInput?.value || "",
      role: roleFilter?.value !== "All" ? roleFilter?.value : ""
    };

    const users = await window.foodShareDB.getUsers(filter);

    if (users.length === 0) {
      if (tbody) tbody.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      return;
    }

    if (emptyState) emptyState.style.display = "none";
    if (tbody) {
      tbody.innerHTML = users.map(u => {
        const roleBadges = {
          donor: "badge-primary",
          ngo: "badge-info",
          volunteer: "badge-warning",
          admin: "badge-neutral"
        };

        const isActive = u.status !== 'deactivated';

        return `
          <tr>
            <td>
              <strong>${escapeHTML(u.name)}</strong>
              <div class="text-muted" style="font-size: 0.75rem;">${escapeHTML(u.email)}</div>
            </td>
            <td><span class="badge ${roleBadges[u.role] || 'badge-neutral'}">${u.role}</span></td>
            <td>${escapeHTML(u.city || 'San Francisco')}</td>
            <td>${escapeHTML(u.phone || 'N/A')}</td>
            <td>
              <span class="badge ${isActive ? 'badge-success' : 'badge-danger'}">
                ${u.status}
              </span>
            </td>
            <td>
              ${u.role !== 'admin' ? `
                <button class="btn btn-sm ${isActive ? 'btn-danger' : 'btn-secondary'}" 
                        onclick="handleToggleUserStatus('${u.id}', '${isActive ? 'deactivated' : 'active'}')">
                  ${isActive ? '<i class="fa-solid fa-ban"></i> Deactivate' : '<i class="fa-solid fa-check"></i> Activate'}
                </button>
              ` : '<span class="text-muted" style="font-size: var(--font-size-xs);">Superadmin</span>'}
            </td>
          </tr>
        `;
      }).join("");
    }
  }

  if (searchInput) searchInput.addEventListener("input", debounce(render, 250));
  if (roleFilter) roleFilter.addEventListener("change", render);
  await render();
}

window.handleToggleUserStatus = async function(userId, newStatus) {
  if (!confirm(`Are you sure you want to set this user account status to "${newStatus}"?`)) return;

  try {
    await window.foodShareDB.updateUser(userId, { status: newStatus });
    window.showToast(`User status updated to ${newStatus}.`, "info");
    setTimeout(() => window.location.reload(), 400);
  } catch (err) {
    window.showToast(err.message || "Failed to update user.", "error");
  }
};

// =========================================================================
// NGO VERIFICATION
// =========================================================================
async function initAdminNGOVerification() {
  const tbody = document.getElementById("ngos-tbody");
  const emptyState = document.getElementById("ngos-empty");
  const statusFilter = document.getElementById("filter-ngo-status");

  async function render() {
    const status = statusFilter?.value || "";
    const filter = { role: "ngo" };
    if (status && status !== "All") filter.status = status;

    const ngos = await window.foodShareDB.getUsers(filter);

    if (ngos.length === 0) {
      if (tbody) tbody.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      return;
    }

    if (emptyState) emptyState.style.display = "none";
    if (tbody) {
      tbody.innerHTML = ngos.map(ngo => {
        const statusBadges = {
          pending: '<span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Pending Review</span>',
          approved: '<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Approved & Active</span>',
          rejected: '<span class="badge badge-danger"><i class="fa-solid fa-ban"></i> Rejected</span>'
        };

        return `
          <tr>
            <td>
              <strong>${escapeHTML(ngo.name)}</strong>
              <div class="text-muted" style="font-size: 0.75rem;">${escapeHTML(ngo.email)}</div>
            </td>
            <td><code>${escapeHTML(ngo.regNumber || 'Not provided')}</code></td>
            <td>${escapeHTML(ngo.contactPerson || 'N/A')}</td>
            <td>${escapeHTML(ngo.address || 'N/A')}, ${escapeHTML(ngo.city || 'N/A')}</td>
            <td>${statusBadges[ngo.status] || ngo.status}</td>
            <td>
              <div class="table-actions">
                ${ngo.status !== 'approved' ? `
                  <button class="btn btn-secondary btn-sm" onclick="handleVerifyNGO('${ngo.id}', 'approved')" title="Approve NGO">
                    <i class="fa-solid fa-check"></i> Approve
                  </button>
                ` : ''}
                ${ngo.status !== 'rejected' ? `
                  <button class="btn btn-danger btn-sm" onclick="handleVerifyNGO('${ngo.id}', 'rejected')" title="Reject NGO">
                    <i class="fa-solid fa-xmark"></i> Reject
                  </button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join("");
    }
  }

  if (statusFilter) statusFilter.addEventListener("change", render);
  await render();
}

window.handleVerifyNGO = async function(ngoId, status) {
  let notes = "";
  if (status === 'rejected') {
    notes = prompt("Enter reason for rejection (optional):", "Incomplete documentation or unverified registration number.");
    if (notes === null) return;
  } else {
    if (!confirm("Confirm approval for this NGO? They will immediately receive permissions to request surplus food.")) {
      return;
    }
  }

  try {
    await window.foodShareDB.verifyNGO(ngoId, status, notes);
    window.showToast(`NGO has been ${status}! Notification sent to organization.`, "success");
    setTimeout(() => window.location.reload(), 500);
  } catch (err) {
    window.showToast(err.message || "Action failed.", "error");
  }
};

// =========================================================================
// FOOD LISTINGS MODERATION
// =========================================================================
async function initAdminFoodListings() {
  const tbody = document.getElementById("admin-listings-tbody");
  const emptyState = document.getElementById("admin-listings-empty");

  const listings = await window.foodShareDB.getFoodListings();

  if (listings.length === 0) {
    if (tbody) tbody.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  if (tbody) {
    tbody.innerHTML = listings.map(l => {
      const isExpired = new Date(l.pickupDeadline).getTime() <= Date.now();
      return `
        <tr>
          <td>
            <strong>${escapeHTML(l.foodName)}</strong>
            <div class="text-muted" style="font-size: 0.75rem;">Category: ${escapeHTML(l.category)}</div>
          </td>
          <td>${escapeHTML(l.donorName)}</td>
          <td><strong class="text-success">${l.availableQuantity} / ${l.quantity} ${l.unit}</strong></td>
          <td>
            <span class="badge ${isExpired ? 'badge-danger' : 'badge-success'}">
              ${isExpired ? 'Expired' : l.status}
            </span>
          </td>
          <td>${new Date(l.pickupDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="handleAdminDeleteListing('${l.id}')">
              <i class="fa-solid fa-trash-can"></i> Remove
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }
}

window.handleAdminDeleteListing = async function(listingId) {
  if (!confirm("Are you sure you want to remove this listing as platform administrator?")) return;

  try {
    await window.foodShareDB.deleteFoodListing(listingId);
    window.showToast("Listing removed by administrator.", "info");
    setTimeout(() => window.location.reload(), 400);
  } catch (err) {
    window.showToast(err.message || "Failed to remove listing.", "error");
  }
};

// =========================================================================
// DONATIONS WORKFLOW TRACKER
// =========================================================================
async function initAdminDonations() {
  const tbody = document.getElementById("admin-donations-tbody");
  const emptyState = document.getElementById("admin-donations-empty");

  const requests = await window.foodShareDB.getDonationRequests();

  if (requests.length === 0) {
    if (tbody) tbody.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  if (tbody) {
    tbody.innerHTML = requests.map(req => {
      const statusBadges = {
        pending: '<span class="badge badge-warning">Pending Donor</span>',
        approved: '<span class="badge badge-info">Approved - In Transit</span>',
        completed: '<span class="badge badge-success">Completed & Delivered</span>',
        rejected: '<span class="badge badge-danger">Rejected</span>',
        cancelled: '<span class="badge badge-neutral">Cancelled</span>'
      };

      return `
        <tr>
          <td>
            <strong>${escapeHTML(req.foodName)}</strong>
            <div class="text-muted" style="font-size: 0.75rem;">ID: ${req.id}</div>
          </td>
          <td>${escapeHTML(req.donorName)}</td>
          <td>${escapeHTML(req.ngoName)}</td>
          <td><strong class="text-success">${req.requestedQuantity} ${req.unit}</strong></td>
          <td><i class="fa-solid fa-person-biking text-muted"></i> ${escapeHTML(req.volunteerName || 'Not Assigned')}</td>
          <td>${statusBadges[req.status] || req.status}</td>
          <td>${window.formatTimeAgo(req.createdAt)}</td>
        </tr>
      `;
    }).join("");
  }
}

// =========================================================================
// VOLUNTEERS DIRECTORY
// =========================================================================
async function initAdminVolunteers() {
  const tbody = document.getElementById("volunteers-tbody");
  const emptyState = document.getElementById("volunteers-empty");

  const volunteers = await window.foodShareDB.getUsers({ role: "volunteer" });

  if (volunteers.length === 0) {
    if (tbody) tbody.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  if (tbody) {
    tbody.innerHTML = volunteers.map(v => `
      <tr>
        <td>
          <strong>${escapeHTML(v.name)}</strong>
          <div class="text-muted" style="font-size: 0.75rem;">${escapeHTML(v.email)}</div>
        </td>
        <td>${escapeHTML(v.phone || 'N/A')}</td>
        <td>${escapeHTML(v.city || 'San Francisco')}</td>
        <td><i class="fa-solid fa-car-side text-muted"></i> ${escapeHTML(v.vehicle || 'Standard')}</td>
        <td><strong class="text-primary font-bold">${v.completedTasks || 0} Deliveries</strong></td>
        <td><span class="badge badge-success">Active</span></td>
      </tr>
    `).join("");
  }
}

// =========================================================================
// CHART.JS REPORTS & ANALYTICS
// =========================================================================
async function initAdminReports() {
  if (typeof Chart === 'undefined') return;

  const listings = await window.foodShareDB.getFoodListings();
  const requests = await window.foodShareDB.getDonationRequests();

  // 1. Food Categories Distribution (Doughnut Chart)
  const categoryCounts = {};
  listings.forEach(l => {
    categoryCounts[l.category] = (categoryCounts[l.category] || 0) + 1;
  });

  const categoryCtx = document.getElementById("category-chart");
  if (categoryCtx) {
    new Chart(categoryCtx, {
      type: "doughnut",
      data: {
        labels: Object.keys(categoryCounts),
        datasets: [{
          data: Object.values(categoryCounts),
          backgroundColor: ["#173F35", "#2F855A", "#E7A83E", "#3182CE", "#DC5656", "#805AD5"]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  // 2. Monthly Redistribution Trend (Bar Chart)
  const monthlyCtx = document.getElementById("monthly-trend-chart");
  if (monthlyCtx) {
    new Chart(monthlyCtx, {
      type: "bar",
      data: {
        labels: ["May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"],
        datasets: [{
          label: "Food Quantity (Units)",
          data: [420, 680, 1150, 1890, 2400, 3100, 3850],
          backgroundColor: "#2F855A",
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  // 3. Workflow Status Pie Chart
  const statusCounts = { pending: 0, approved: 0, completed: 0, rejected: 0 };
  requests.forEach(r => {
    if (statusCounts[r.status] !== undefined) statusCounts[r.status]++;
  });

  const statusCtx = document.getElementById("status-chart");
  if (statusCtx) {
    new Chart(statusCtx, {
      type: "pie",
      data: {
        labels: ["Pending Donor", "Approved / In-Transit", "Completed", "Declined"],
        datasets: [{
          data: [statusCounts.pending, statusCounts.approved, statusCounts.completed, statusCounts.rejected],
          backgroundColor: ["#D69E2E", "#3182CE", "#2F855A", "#DC5656"]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }
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

