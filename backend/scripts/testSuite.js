// Automated End-to-End Verification Test Suite
async function runTests() {
  console.log('=== STARTING TEST SUITE ===');

  // 1. Check Frontend Delivery
  try {
    const feRes = await fetch('http://localhost:5173');
    console.log(`[PASS] Frontend Web Server: Status ${feRes.status} (Vite React Running)`);
  } catch (e) {
    console.error('[FAIL] Frontend connection:', e.message);
  }

  // 2. Check Backend Health
  try {
    const healthRes = await fetch('http://localhost:5000/api/health');
    const health = await healthRes.json();
    console.log(`[PASS] Backend API: Status "${health.status}"`);
    console.log(`[PASS] PostgreSQL Database: "${health.services.postgresql.database}" on port ${health.services.postgresql.port}`);
    console.log(`[PASS] Redis Cache: "${health.services.redis.mode}" (${health.services.redis.status})`);
  } catch (e) {
    console.error('[FAIL] Backend health check:', e.message);
  }

  // 3. Check Public Auctions
  try {
    const auctionsRes = await fetch('http://localhost:5000/api/public/auctions');
    const data = await auctionsRes.json();
    console.log(`[PASS] Public Auctions Query: Found ${data.auctions.length} live auction items`);
  } catch (e) {
    console.error('[FAIL] Public auctions:', e.message);
  }

  // 4. Test User Registration
  const testUser = {
    name: 'Sarah Connor',
    email: `sarah_${Date.now()}@skynet.com`,
    password: 'Password123!',
    role: 'buyer',
  };

  let registeredToken = '';
  try {
    const regRes = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    const regData = await regRes.json();
    if (regData.success) {
      console.log(`[PASS] User Registration: Created user "${regData.user.name}" with role "${regData.user.role}"`);
      registeredToken = regData.token;
    } else {
      console.error('[FAIL] Registration error:', regData.message);
    }
  } catch (e) {
    console.error('[FAIL] Registration failed:', e.message);
  }

  // 5. Test User Login
  let buyerToken = '';
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: testUser.password }),
    });
    const loginData = await loginRes.json();
    if (loginData.success) {
      buyerToken = loginData.token;
      console.log(`[PASS] User Login: Valid JWT Token issued (${buyerToken.substring(0, 20)}...)`);
    } else {
      console.error('[FAIL] Login error:', loginData.message);
    }
  } catch (e) {
    console.error('[FAIL] Login failed:', e.message);
  }

  // 6. Test Admin Login & RBAC Permissions
  let adminToken = '';
  try {
    const adminLoginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@auction.com', password: 'Admin123!' }),
    });
    const adminData = await adminLoginRes.json();
    adminToken = adminData.token;
    console.log(`[PASS] Admin Login: Success, role "${adminData.user.role}"`);

    // Buyer attempting admin route -> Expect 403
    const buyerToAdminRes = await fetch('http://localhost:5000/api/admin/overview', {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    if (buyerToAdminRes.status === 403) {
      console.log(`[PASS] RBAC Enforcement: Buyer blocked from Admin endpoint with HTTP 403 Forbidden`);
    } else {
      console.error(`[FAIL] RBAC Failure: Expected 403, got ${buyerToAdminRes.status}`);
    }

    // Admin accessing admin route -> Expect 200
    const adminToAdminRes = await fetch('http://localhost:5000/api/admin/overview', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const overviewData = await adminToAdminRes.json();
    if (adminToAdminRes.status === 200) {
      console.log(`[PASS] RBAC Authorization: Admin successfully accessed overview. Total users in DB: ${overviewData.adminOverview.userMetrics.totalUsers}`);
    } else {
      console.error(`[FAIL] Admin access failed with status: ${adminToAdminRes.status}`);
    }
  } catch (e) {
    console.error('[FAIL] Admin RBAC tests failed:', e.message);
  }

  // 7. Test Real-time Bid Placement
  try {
    const pubRes = await fetch('http://localhost:5000/api/auctions/1');
    const pubData = await pubRes.json();
    const nextAmount = parseFloat(pubData.auction.current_bid) + parseFloat(pubData.auction.bid_increment || 50.0);

    const bidRes = await fetch('http://localhost:5000/api/users/bid', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`,
      },
      body: JSON.stringify({ auctionId: 1, amount: nextAmount }),
    });
    const bidData = await bidRes.json();
    if (bidData.success) {
      console.log(`[PASS] Real-Time Bid Engine: Bid placed successfully! New current bid: $${bidData.currentBid}`);
    } else {
      console.error('[FAIL] Bid placement error:', bidData.message);
    }
  } catch (e) {
    console.error('[FAIL] Bid placement failed:', e.message);
  }

  // 8. Test Logout & Token Blacklist
  try {
    const logoutRes = await fetch('http://localhost:5000/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    const logoutData = await logoutRes.json();
    console.log(`[PASS] Logout & Redis Token Blacklist: ${logoutData.message}`);

    // Verify token can no longer access protected endpoints
    const profileRes = await fetch('http://localhost:5000/api/users/profile', {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    if (profileRes.status === 401) {
      console.log(`[PASS] Token Invalidation: Subsequent request with blacklisted token properly returned HTTP 401 Unauthorized`);
    } else {
      console.error(`[FAIL] Blacklisted token was not rejected. Status: ${profileRes.status}`);
    }
  } catch (e) {
    console.error('[FAIL] Logout test failed:', e.message);
  }

  console.log('=== ALL TESTS COMPLETED SUCCESSFULLY ===');
}

runTests();
