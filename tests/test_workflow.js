/**
 * FOODBRIDGE - AUTOMATED END-TO-END WORKFLOW TEST
 * Simulates Donor -> NGO -> Volunteer -> Admin workflow under FoodBridge branding.
 */

// Mock browser localStorage and window environment
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { for (const k in mockStorage) delete mockStorage[k]; }
};

global.window = {
  localStorage: global.localStorage
};

// Load code files
require('../js/firebase-config.js');
require('../js/seed-data.js');
require('../js/db-service.js');
require('../js/auth.js');

async function runTests() {
  console.log("=== STARTING FOODBRIDGE WORKFLOW VERIFICATION ===");
  const db = window.foodBridgeDB || window.foodShareDB;
  const auth = window.foodBridgeAuth || window.foodShareAuth;

  // 1. Initial State Check
  const initialStats = await db.getPlatformStats();
  console.log(`[PASS] Database initialized. Total users: ${initialStats.totalUsers}, Active listings: ${initialStats.activeListings}`);

  // 2. Authentication Test
  const donorUser = await auth.login("donor@foodbridge.demo", "demo123");
  console.log(`[PASS] Donor authentication successful: ${donorUser.name} (${donorUser.role})`);

  // 3. Step 1: Donor creates food listing (50 meal packets)
  const newListing = await db.createFoodListing({
    donorId: donorUser.id,
    donorName: donorUser.name,
    foodName: "Nutritious Lentil Stew with Steamed Rice",
    category: "Cooked Food",
    description: "Packed freshly in commercial food grade containers.",
    quantity: 50,
    unit: "meal packets",
    preparedAt: new Date().toISOString(),
    pickupDeadline: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    storageType: "Refrigerated",
    allergens: ["None"],
    location: "45 Market St",
    city: "San Francisco",
    contactPhone: "+1 (555) 234-5678",
    safetyDeclaration: true
  });
  console.log(`[PASS] Listing created: ID ${newListing.id}, Qty: ${newListing.quantity} ${newListing.unit}`);

  // 4. Step 2 & 3: Approved NGO requests 30 packets
  const ngoUser = await auth.login("ngo@foodbridge.demo", "demo123");
  console.log(`[PASS] NGO authentication successful: ${ngoUser.name} (Status: ${ngoUser.status})`);

  const request = await db.createDonationRequest({
    listingId: newListing.id,
    ngoId: ngoUser.id,
    requestedQuantity: 30,
    message: "Distributing to evening shelter beneficiaries."
  });
  console.log(`[PASS] Request created: ID ${request.id}, Requested: ${request.requestedQuantity} ${request.unit}`);

  // 5. Unapproved NGO test: Sunrise Relief Foundation (pending) should FAIL to request food
  const pendingNgo = await auth.login("sunrise@foodbridge.demo", "demo123");
  try {
    await db.createDonationRequest({
      listingId: newListing.id,
      ngoId: pendingNgo.id,
      requestedQuantity: 5,
      message: "Testing unapproved request"
    });
    console.error("[FAIL] Unapproved NGO was allowed to request food!");
    process.exit(1);
  } catch (err) {
    console.log(`[PASS] Security Rule Enforced: Unapproved NGO blocked from requesting food: "${err.message}"`);
  }

  // 6. Step 4 & 5: Donor approves the request
  const approvalResult = await db.approveDonationRequest(request.id, donorUser.id);
  console.log(`[PASS] Donor approved request ${request.id}. Status: ${approvalResult.request.status}`);

  // 7. Step 6: Verify atomic inventory reservation (50 - 30 = 20 remaining)
  const updatedListing = await db.getFoodListingById(newListing.id);
  if (updatedListing.availableQuantity !== 20) {
    console.error(`[FAIL] Expected available quantity 20, got ${updatedListing.availableQuantity}`);
    process.exit(1);
  }
  console.log(`[PASS] Inventory Atomically Reserved: Available quantity is now ${updatedListing.availableQuantity} / 50`);

  // 8. Step 7 & 8: Volunteer accepts task
  const volunteer = await auth.login("volunteer@foodbridge.demo", "demo123");
  const task = approvalResult.task;
  const acceptedTask = await db.acceptVolunteerTask(task.id, volunteer.id);
  console.log(`[PASS] Volunteer ${volunteer.name} accepted task ${task.id}. Status: ${acceptedTask.status}`);

  // 9. Step 9: Volunteer marks food picked up
  const pickedUpTask = await db.updateVolunteerTaskStatus(task.id, volunteer.id, "Picked Up");
  console.log(`[PASS] Volunteer picked up food: Status is now "${pickedUpTask.status}"`);

  // 10. Step 10 & 11: Volunteer marks food delivered & completed
  const completedTask = await db.updateVolunteerTaskStatus(task.id, volunteer.id, "Delivered");
  console.log(`[PASS] Volunteer delivered food: Status is now "${completedTask.status}"`);

  // 11. Verify parent request is completed
  const finalRequest = await db.getDonationRequestById(request.id);
  if (finalRequest.status !== "completed") {
    console.error(`[FAIL] Expected request status 'completed', got '${finalRequest.status}'`);
    process.exit(1);
  }
  console.log(`[PASS] Donation Request status synchronized to: "${finalRequest.status}"`);

  // 12. Test Admin NGO Verification
  const adminUser = await auth.login("admin@foodbridge.demo", "demo123");
  console.log(`[PASS] Admin logged in: ${adminUser.name}`);
  const approvedNGO = await db.verifyNGO(pendingNgo.id, "approved", "Credentials verified by admin");
  if (approvedNGO.status !== "approved") {
    console.error(`[FAIL] Expected NGO status 'approved', got '${approvedNGO.status}'`);
    process.exit(1);
  }
  console.log(`[PASS] Admin verified NGO "${approvedNGO.name}". Status updated to: "${approvedNGO.status}"`);

  // Now the previously pending NGO should be allowed to request food!
  const nowAllowedRequest = await db.createDonationRequest({
    listingId: newListing.id,
    ngoId: approvedNGO.id,
    requestedQuantity: 10,
    message: "Now approved and requesting."
  });
  console.log(`[PASS] Newly approved NGO can now request food: Request ID ${nowAllowedRequest.id}`);

  console.log("\n========================================================");
  console.log("🎉 ALL FOODBRIDGE WORKFLOW INTEGRITY TESTS PASSED 100%!");
  console.log("========================================================");
}

runTests().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
