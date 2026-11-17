/**
 * FOODSHARE - TOASTS & IN-APP NOTIFICATION SYSTEM
 * Handles interactive toast messages, modal popups, and the notification bell dropdown.
 */

// Global Toast Dispatcher
function showToast(message, type = "success", title = "") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '<i class="fa-solid fa-circle-check"></i>',
    error: '<i class="fa-solid fa-circle-exclamation"></i>',
    warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
    info: '<i class="fa-solid fa-circle-info"></i>'
  };

  const defaultTitles = {
    success: "Success",
    error: "Attention",
    warning: "Notice",
    info: "Notification"
  };

  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-content">
      <div class="toast-title">${title || defaultTitles[type]}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" aria-label="Close">&times;</button>
  `;

  // Close button click
  toast.querySelector(".toast-close").addEventListener("click", () => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    setTimeout(() => toast.remove(), 250);
  });

  container.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(50px)";
      setTimeout(() => toast.remove(), 250);
    }
  }, 4500);
}

// Modal Helper Functions
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
}

// Auto-bind close buttons for all modals
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove("active");
        document.body.style.overflow = "";
      }
    });
  });

  document.querySelectorAll("[data-close-modal]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.getAttribute("data-close-modal");
      closeModal(modalId);
    });
  });
});

// Notifications Bell Manager
async function initNotificationsBell(userId) {
  const bellBtn = document.getElementById("notification-bell-btn");
  const dropdown = document.getElementById("notification-dropdown");
  const countBadge = document.getElementById("notification-unread-count");
  const listContainer = document.getElementById("notification-list");
  const markAllBtn = document.getElementById("mark-all-read-btn");

  if (!bellBtn || !dropdown || !listContainer) return;

  async function renderNotifications() {
    const notifs = await window.foodShareDB.getNotifications(userId);
    const unreadCount = notifs.filter(n => !n.read).length;

    if (countBadge) {
      if (unreadCount > 0) {
        countBadge.textContent = unreadCount > 9 ? "9+" : unreadCount;
        countBadge.style.display = "flex";
      } else {
        countBadge.style.display = "none";
      }
    }

    if (notifs.length === 0) {
      listContainer.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: var(--color-muted); font-size: var(--font-size-xs);">
          <i class="fa-regular fa-bell-slash" style="font-size: 1.75rem; margin-bottom: 0.5rem; display: block;"></i>
          No notifications yet.
        </div>
      `;
      return;
    }

    listContainer.innerHTML = notifs.map(n => {
      const timeAgo = formatTimeAgo(n.createdAt);
      const iconMap = {
        request: "fa-hand-holding-heart",
        approval: "fa-circle-check",
        task: "fa-truck-fast",
        food: "fa-bowl-food",
        admin: "fa-shield-halved",
        danger: "fa-triangle-exclamation"
      };
      const icon = iconMap[n.type] || "fa-bell";

      return `
        <div class="notification-item ${!n.read ? 'unread' : ''}" data-id="${n.id}" data-link="${n.link || '#'}">
          <div class="notification-item-icon">
            <i class="fa-solid ${icon}"></i>
          </div>
          <div style="flex: 1;">
            <div class="notification-item-text">
              <strong>${n.title}</strong><br>${n.message}
            </div>
            <div class="notification-item-time">${timeAgo}</div>
          </div>
        </div>
      `;
    }).join("");

    // Click handler for items
    listContainer.querySelectorAll(".notification-item").forEach(item => {
      item.addEventListener("click", async () => {
        const id = item.getAttribute("data-id");
        const link = item.getAttribute("data-link");
        await window.foodShareDB.markNotificationRead(id);
        if (link && link !== "#") {
          window.location.href = link;
        } else {
          renderNotifications();
        }
      });
    });
  }

  // Toggle Dropdown
  bellBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("active");
  });

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
      dropdown.classList.remove("active");
    }
  });

  // Mark all read button
  if (markAllBtn) {
    markAllBtn.addEventListener("click", async () => {
      await window.foodShareDB.markAllNotificationsRead(userId);
      await renderNotifications();
      showToast("All notifications marked as read.", "info");
    });
  }

  // Initial render
  await renderNotifications();
}

// Relative time formatting helper
function formatTimeAgo(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

window.showToast = showToast;
window.openModal = openModal;
window.closeModal = closeModal;
window.initNotificationsBell = initNotificationsBell;
window.formatTimeAgo = formatTimeAgo;

