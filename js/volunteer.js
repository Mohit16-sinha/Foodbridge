/**
 * FOODSHARE - VOLUNTEER PORTAL CONTROLLER
 * Powers Volunteer Dashboard, Available Tasks, My Active Tasks, Delivery History, and Profile.
 */

document.addEventListener("DOMContentLoaded", async () => {
  const volunteer = window.setupDashboardLayout("volunteer");
  if (!volunteer) return;

  const currentPath = window.location.pathname.toLowerCase();

  if (currentPath.includes("dashboard.html")) {
    await initVolunteerDashboard(volunteer);
  } else if (currentPath.includes("available-tasks.html")) {
    await initAvailableTasks(volunteer);
  } else if (currentPath.includes("my-tasks.html")) {
    await initMyTasks(volunteer);
  } else if (currentPath.includes("history.html")) {
    await initVolunteerHistory(volunteer);
  } else if (currentPath.includes("profile.html")) {
    initVolunteerProfile(volunteer);
  }
});

// =========================================================================
// VOLUNTEER DASHBOARD OVERVIEW
// =========================================================================
async function initVolunteerDashboard(volunteer) {
  const allTasks = await window.foodShareDB.getVolunteerTasks();
  const myTasks = allTasks.filter(t => t.volunteerId === volunteer.id);

  const assignedPickups = allTasks.filter(t => t.status === "Assigned").length;
  const pendingTasks = myTasks.filter(t => ["Accepted", "Picked Up"].includes(t.status)).length;
  const completedDeliveries = myTasks.filter(t => t.status === "Completed").length;

  document.getElementById("stat-assigned-pickups").textContent = assignedPickups;
  document.getElementById("stat-pending-tasks").textContent = pendingTasks;
  document.getElementById("stat-completed-deliveries").textContent = completedDeliveries;

  // Active Task Card
  const activeTaskContainer = document.getElementById("active-task-container");
  const currentActive = myTasks.find(t => ["Accepted", "Picked Up"].includes(t.status));

  if (activeTaskContainer) {
    if (currentActive) {
      activeTaskContainer.innerHTML = renderVolunteerTaskCard(currentActive, true);
    } else {
      activeTaskContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-solid fa-person-walking-luggage"></i></div>
          <h4 class="empty-state-title">No Active Missions</h4>
          <p class="empty-state-desc">You currently have no tasks in progress. Check available tasks to help deliver surplus food to an NGO.</p>
          <a href="/volunteer/available-tasks.html" class="btn btn-primary"><i class="fa-solid fa-compass"></i> Find Available Tasks</a>
        </div>
      `;
    }
  }

  // Available Tasks Preview
  const availableContainer = document.getElementById("available-preview-container");
  const availableTasks = allTasks.filter(t => !t.volunteerId || t.status === "Assigned");

  if (availableContainer) {
    if (availableTasks.length === 0) {
      availableContainer.innerHTML = `<p class="text-muted text-center" style="padding: 2rem;">No pending pickups right now. All donations have been assigned!</p>`;
    } else {
      availableContainer.innerHTML = availableTasks.slice(0, 2).map(t => renderVolunteerTaskCard(t, false)).join("");
    }
  }
}

// =========================================================================
// AVAILABLE TASKS
// =========================================================================
async function initAvailableTasks(volunteer) {
  const container = document.getElementById("available-tasks-list");
  const emptyState = document.getElementById("available-tasks-empty");

  const tasks = await window.foodShareDB.getVolunteerTasks({ availableOnly: true });

  if (tasks.length === 0) {
    if (container) container.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  if (container) {
    container.innerHTML = tasks.map(t => renderVolunteerTaskCard(t, false)).join("");
  }
}

// =========================================================================
// MY TASKS (ACTIVE WORKFLOW STEPPER)
// =========================================================================
async function initMyTasks(volunteer) {
  const container = document.getElementById("my-tasks-list");
  const emptyState = document.getElementById("my-tasks-empty");

  const myTasks = await window.foodShareDB.getVolunteerTasks({ volunteerId: volunteer.id });
  const activeTasks = myTasks.filter(t => ["Accepted", "Picked Up"].includes(t.status));

  if (activeTasks.length === 0) {
    if (container) container.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  if (container) {
    container.innerHTML = activeTasks.map(t => renderVolunteerTaskCard(t, true)).join("");
  }
}

// =========================================================================
// VOLUNTEER HISTORY
// =========================================================================
async function initVolunteerHistory(volunteer) {
  const tbody = document.getElementById("history-tbody");
  const emptyState = document.getElementById("history-empty");

  const myTasks = await window.foodShareDB.getVolunteerTasks({
    volunteerId: volunteer.id,
    status: "Completed"
  });

  if (myTasks.length === 0) {
    if (tbody) tbody.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  if (tbody) {
    tbody.innerHTML = myTasks.map(task => `
      <tr>
        <td><strong>${escapeHTML(task.foodName)}</strong></td>
        <td><strong class="text-success">${task.quantity} ${task.unit}</strong></td>
        <td>${escapeHTML(task.donorName)}</td>
        <td>${escapeHTML(task.ngoName)}</td>
        <td>${new Date(task.deliveredAt || task.completedAt || Date.now()).toLocaleDateString()}</td>
        <td><span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Delivered</span></td>
      </tr>
    `).join("");
  }
}

// =========================================================================
// VOLUNTEER PROFILE
// =========================================================================
function initVolunteerProfile(volunteer) {
  const form = document.getElementById("volunteer-profile-form");
  if (!form) return;

  document.getElementById("profile-name").value = volunteer.name || "";
  document.getElementById("profile-email").value = volunteer.email || "";
  document.getElementById("profile-phone").value = volunteer.phone || "";
  document.getElementById("profile-city").value = volunteer.city || "San Francisco";
  document.getElementById("profile-vehicle").value = volunteer.vehicle || "Car";
  document.getElementById("profile-bio").value = volunteer.bio || "";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const updated = await window.foodShareDB.updateUser(volunteer.id, {
        name: document.getElementById("profile-name").value,
        phone: document.getElementById("profile-phone").value,
        city: document.getElementById("profile-city").value,
        vehicle: document.getElementById("profile-vehicle").value,
        bio: document.getElementById("profile-bio").value
      });

      window.foodShareAuth.saveSession(updated);
      window.showToast("Volunteer profile updated successfully!", "success");
    } catch (err) {
      window.showToast(err.message || "Failed to update profile.", "error");
    }
  });
}

// Global Volunteer Task Actions
window.handleAcceptTask = async function(taskId) {
  const volunteer = window.foodShareAuth.getCurrentUser();
  if (!confirm("Confirm accepting this delivery mission? You will be responsible for picking up the food and transporting it to the NGO.")) {
    return;
  }

  try {
    await window.foodShareDB.acceptVolunteerTask(taskId, volunteer.id);
    window.showToast("Mission accepted! Check 'My Active Tasks' for pickup instructions.", "success");
    setTimeout(() => {
      window.location.href = "/volunteer/my-tasks.html";
    }, 600);
  } catch (err) {
    window.showToast(err.message || "Failed to accept task.", "error");
  }
};

window.handleUpdateTaskStatus = async function(taskId, nextStatus) {
  const volunteer = window.foodShareAuth.getCurrentUser();
  const prompts = {
    "Picked Up": "Confirm that you have arrived at the donor location and collected the food items?",
    "Delivered": "Confirm that you have safely arrived at the NGO and handed over the food?"
  };

  if (!confirm(prompts[nextStatus] || `Advance mission status to "${nextStatus}"?`)) {
    return;
  }

  try {
    await window.foodShareDB.updateVolunteerTaskStatus(taskId, volunteer.id, nextStatus);
    window.showToast(`Task status updated to: ${nextStatus}!`, "success");
    setTimeout(() => window.location.reload(), 600);
  } catch (err) {
    window.showToast(err.message || "Failed to update status.", "error");
  }
};

// Component Renderer for Task Cards
function renderVolunteerTaskCard(task, isMyTask = false) {
  const statusBadges = {
    Assigned: '<span class="badge badge-warning">Awaiting Volunteer</span>',
    Accepted: '<span class="badge badge-info">Accepted - Head to Pickup</span>',
    "Picked Up": '<span class="badge badge-primary">Picked Up - En Route to NGO</span>',
    Completed: '<span class="badge badge-success">Completed & Delivered</span>'
  };

  return `
    <div class="task-card mb-4" id="task-${task.id}">
      <div class="task-card-header">
        <div>
          <span class="task-id">MISSION #${task.id.toUpperCase().slice(-6)}</span>
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--color-primary); margin-top: 2px;">
            ${escapeHTML(task.foodName)}
          </h3>
        </div>
        ${statusBadges[task.status] || '<span class="badge badge-neutral">' + task.status + '</span>'}
      </div>

      <div class="task-route">
        <div class="route-stop">
          <div class="stop-type">1. Pickup Location (Donor)</div>
          <div class="stop-name">${escapeHTML(task.donorName)}</div>
          <div class="stop-address"><i class="fa-solid fa-location-dot"></i> ${escapeHTML(task.pickupAddress)}</div>
          ${task.donorPhone ? `<div style="font-size: 0.75rem; color: var(--color-secondary); margin-top: 2px;"><i class="fa-solid fa-phone"></i> ${escapeHTML(task.donorPhone)}</div>` : ''}
        </div>
        <div class="route-stop destination">
          <div class="stop-type">2. Delivery Destination (NGO)</div>
          <div class="stop-name">${escapeHTML(task.ngoName)}</div>
          <div class="stop-address"><i class="fa-solid fa-location-dot"></i> ${escapeHTML(task.deliveryAddress)}</div>
          ${task.ngoPhone ? `<div style="font-size: 0.75rem; color: var(--color-secondary); margin-top: 2px;"><i class="fa-solid fa-phone"></i> ${escapeHTML(task.ngoPhone)}</div>` : ''}
        </div>
      </div>

      <div class="task-details-box">
        <div><strong>Quantity:</strong> <span class="text-success font-bold">${task.quantity} ${task.unit}</span></div>
        <div><strong>Instructions:</strong> <span>${escapeHTML(task.notes || 'Handle safely with care.')}</span></div>
      </div>

      <div class="task-actions">
        ${!isMyTask ? `
          <button class="btn btn-primary btn-full" onclick="handleAcceptTask('${task.id}')">
            <i class="fa-solid fa-handshake-angle"></i> Accept Delivery Mission
          </button>
        ` : `
          ${task.status === 'Accepted' ? `
            <button class="btn btn-secondary btn-full" onclick="handleUpdateTaskStatus('${task.id}', 'Picked Up')">
              <i class="fa-solid fa-box-open"></i> Mark as Picked Up
            </button>
          ` : ''}
          ${task.status === 'Picked Up' ? `
            <button class="btn btn-primary btn-full" onclick="handleUpdateTaskStatus('${task.id}', 'Delivered')">
              <i class="fa-solid fa-circle-check"></i> Mark as Delivered & Complete
            </button>
          ` : ''}
        `}
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

