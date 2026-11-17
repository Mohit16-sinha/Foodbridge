/**
 * FOODBRIDGE - MAIN PUBLIC JAVASCRIPT
 * Powers public pages, navigation, mobile drawer, contact form, and auth state in navbar.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Mobile Navigation Drawer Toggle
  const mobileToggle = document.getElementById("mobile-menu-btn");
  const mobileNav = document.getElementById("mobile-nav");

  if (mobileToggle && mobileNav) {
    mobileToggle.addEventListener("click", () => {
      mobileNav.classList.toggle("open");
      const icon = mobileToggle.querySelector("i");
      if (icon) {
        if (mobileNav.classList.contains("open")) {
          icon.className = "fa-solid fa-xmark";
        } else {
          icon.className = "fa-solid fa-bars";
        }
      }
    });
  }

  // Update Public Navbar Based on Auth State
  updateNavbarAuth();

  // Active Link Highlight
  highlightActiveNavLink();

  // Contact Form Submission Handler
  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const submitBtn = contactForm.querySelector("button[type='submit']");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending message...';
      }

      setTimeout(() => {
        window.showToast("Thank you! Your message has been received by FoodBridge. Our team will contact you shortly.", "success");
        contactForm.reset();
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Send Message <i class="fa-solid fa-paper-plane"></i>';
        }
      }, 700);
    });
  }

  // Newsletter Subscription Handler
  const newsletterForm = document.getElementById("newsletter-form");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      window.showToast("Thank you for subscribing to FoodBridge surplus redistribution updates!", "success");
      newsletterForm.reset();
    });
  }
});

function updateNavbarAuth() {
  const auth = window.foodBridgeAuth || window.foodShareAuth;
  const user = auth ? auth.getCurrentUser() : null;
  const navActions = document.getElementById("navbar-actions");
  const mobileNavActions = document.getElementById("mobile-nav-actions");

  if (!user) return;

  const dashboardUrl = getDashboardUrl(user.role);

  const authMarkup = `
    <a href="${dashboardUrl}" class="btn btn-primary btn-sm">
      <i class="fa-solid fa-gauge-high"></i> Dashboard (${user.role.toUpperCase()})
    </a>
    <button class="btn btn-outline btn-sm logout-trigger" title="Log out">
      <i class="fa-solid fa-right-from-bracket"></i>
    </button>
  `;

  if (navActions) navActions.innerHTML = authMarkup;
  if (mobileNavActions) mobileNavActions.innerHTML = authMarkup;

  document.querySelectorAll(".logout-trigger").forEach(btn => {
    btn.addEventListener("click", () => {
      if (confirm("Are you sure you want to log out of FoodBridge?")) {
        auth.logout();
      }
    });
  });
}

function getDashboardUrl(role) {
  switch ((role || "").toLowerCase()) {
    case "donor": return "/donor/dashboard.html";
    case "ngo": return "/ngo/dashboard.html";
    case "volunteer": return "/volunteer/dashboard.html";
    case "admin": return "/admin/dashboard.html";
    default: return "/login.html";
  }
}

function highlightActiveNavLink() {
  const currentPath = window.location.pathname.toLowerCase();
  document.querySelectorAll(".nav-link").forEach(link => {
    const href = link.getAttribute("href")?.toLowerCase() || "";
    if (href === currentPath || (currentPath === "/" && href === "index.html") || (currentPath.endsWith(href) && href !== "")) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

window.getDashboardUrl = getDashboardUrl;
