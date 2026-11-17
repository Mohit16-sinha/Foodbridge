# 🌿 FoodBridge – Modern Surplus Food Redistribution Network

> *"Turning Surplus Food into Someone's Next Meal."*

**FoodBridge** is a modern, responsive web application engineered to bridge the gap between commercial food surpluses and local communities experiencing food insecurity. It coordinates **Food Donors** (restaurants, hotels, caterers), **Verified NGOs** (charities, community kitchens), **Volunteer Couriers**, and **System Administrators** into a streamlined, glassmorphic, transparent redistribution pipeline.

---

## 💎 Design System & Visual Architecture

- **Modern Glassmorphism UI**:
  - Translucent frosted surfaces (`backdrop-filter: blur(16px)` / `rgba(255, 255, 255, 0.75)`).
  - Ambient multi-layer drop shadows and delicate border strokes.
  - Floating status pills, glowing icons, and smooth micro-interactions.
- **Natural Botanical Color Palette**:
  - **Deep Botanical Forest**: `#11332B`
  - **Lush Foliage / Emerald Sage**: `#227150`
  - **Morning Dew Mint / Translucent**: `#E8F5EE`
  - **Harvest Amber / Sun Gold**: `#E7A034`
  - **Organic Warm Sand Canvas**: `#F9F8F3`
  - **Clean Frosted Glass**: `rgba(255, 255, 255, 0.78)`
  - **Organic Bark Charcoal**: `#1C2A24`
- **Typography**: Clean pairing of **Plus Jakarta Sans** and **Outfit** for crisp SaaS readability.
- **Pure Modern Vanilla Stack**: HTML5, CSS3, ES6+ JavaScript, Responsive Grid & Flexbox, with **zero framework bloat**.

---

## 👥 Seeded Demo Accounts

All accounts use the password: `demo123`

| Role | Demo Email | Password | Name / Entity | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Food Donor** | `donor@foodbridge.demo` | `demo123` | The Green Fork Bistro | Publish food, approve NGO requests, track couriers |
| **Verified NGO** | `ngo@foodbridge.demo` | `demo123` | Hope Feeding Mission | Browse map, request portions, receive deliveries |
| **Pending NGO** | `sunrise@foodbridge.demo` | `demo123` | Sunrise Relief Foundation | Test the Admin NGO Verification workflow! |
| **Volunteer Courier** | `volunteer@foodbridge.demo` | `demo123` | Alex Kumar | Claim pickup missions, update delivery status |
| **Platform Admin** | `admin@foodbridge.demo` | `demo123` | Platform Administrator | Verify NGOs, moderate listings, inspect reports |

*(Note: For backward compatibility, `@foodshare.demo` logins also automatically resolve)*

---

## 🚀 How to Run FoodBridge

FoodBridge is designed to run in any browser with zero compilation:

### Using a Local HTTP Server (Recommended)
```bash
# Using Python
python -m http.server 3000

# Using Node (npx)
npx serve -l 3000
```
Then open: `http://localhost:3000`

---

## 🔄 The 11-Step End-to-End Workflow

1. **Step 1 (Donor Listing)**: Donor logs in and publishes a surplus food listing (e.g. 50 meal packets, refrigerated storage, allergen tags, future deadline, safety declaration).
2. **Step 2 (NGO Discovery)**: Verified NGO views the listing on the interactive Leaflet OpenStreetMap.
3. **Step 3 (NGO Request)**: NGO requests 30 packets with a message (anti-overselling ensures request <= available quantity).
4. **Step 4 (Notification)**: Donor receives instant in-app notification.
5. **Step 5 (Approval)**: Donor approves request.
6. **Step 6 (Atomic Reservation)**: Available quantity automatically drops from 50 to 20.
7. **Step 7 (Dispatch)**: Volunteer courier mission is generated.
8. **Step 8 (Acceptance)**: Volunteer accepts the delivery mission.
9. **Step 9 (Pickup)**: Volunteer picks up the sealed food at the donor kitchen.
10. **Step 10 (Delivery)**: Volunteer delivers food to the NGO drop-off address.
11. **Step 11 (Completion)**: Mission is marked completed; donor, NGO, volunteer, and platform metrics update across all dashboards.

---

## 🛡️ Administrative NGO Verification Showcase

1. Log in as `sunrise@foodbridge.demo` (status: `pending`). Notice the yellow notification banner blocking unapproved organizations from requesting food.
2. Switch to **Admin** (`admin@foodbridge.demo`), navigate to **NGO Verification**, and click **Approve**.
3. Switch back to `sunrise@foodbridge.demo` — the account is now verified and can request food!

---

## 📂 Project Structure

```
FOODSHARE/
├── index.html                   # Glassmorphic landing page
├── about.html                   # Mission, food safety standards & guidelines
├── available-food.html          # Public directory with Leaflet OpenStreetMap
├── how-it-works.html            # 4-stage redistribution architecture walkthrough
├── contact.html                 # Direct emergency channels, contact form, FAQ
├── login.html                   # Login screen with 1-Click Demo Accounts Selector
├── register.html                # Registration with Donor, NGO & Volunteer roles
│
├── donor/                       # Donor Portal (6 pages)
├── ngo/                         # NGO Portal (5 pages)
├── volunteer/                   # Volunteer Courier Portal (5 pages)
├── admin/                       # Administrator Portal (7 pages)
│
├── css/
│   ├── main.css                 # Glassmorphic design tokens & natural color system
│   ├── landing.css              # Frosted glass hero, role cards, stats
│   ├── dashboard.css            # Modern glass sidebar, header, stat cards
│   └── components.css           # Glass food cards, routes, maps, empty states
│
├── js/
│   ├── firebase-config.js       # Firebase modular config & fallback detector
│   ├── seed-data.js             # Realistic seed dataset
│   ├── db-service.js            # Unified Database Abstraction Layer
│   ├── auth.js                  # Authentication, persistent sessions & route guards
│   ├── notifications.js         # Toasts, modals & notification bell dropdown
│   ├── dashboard-common.js      # Shared sidebar, role quickswitch & user info
│   ├── donor.js                 # Donor business logic
│   ├── ngo.js                   # NGO business logic & Leaflet integration
│   ├── volunteer.js             # Volunteer logistics & status advancement
│   └── admin.js                 # Admin management, verification & Chart.js
│
├── tests/
│   └── test_workflow.js         # Automated end-to-end integration test
├── firestore.rules              # Production Cloud Firestore Security Rules
└── README.md                    # Project documentation & presentation guide
```

---

## 🎓 College Project Evaluation Checklist

- [x] **Renamed to FoodBridge**: Consistent brand naming across all 30 HTML views, scripts, styles, and tests.
- [x] **Glassmorphism Design**: Frosted glass surfaces, translucent navigation bars, floating badges, and backdrop blur filters.
- [x] **Natural Colors**: Forest greens (`#11332B`), emerald sage (`#227150`), harvest gold (`#E7A034`), and warm sand canvas (`#F9F8F3`).
- [x] **Interactive Maps**: Leaflet.js with OpenStreetMap pins and popups.
- [x] **Visual Analytics**: Chart.js charts for category distribution and monthly trends.
- [x] **100% Tested**: Automated workflow verification suite passing without errors.
