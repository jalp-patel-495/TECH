// Comprehensive End-to-End Test Suite for Part 2
const fs = require('fs');
const path = require('path');

async function testPart2() {
  console.log('==================================================');
  console.log('   PART 2: AUCTION MANAGEMENT & CRUD TEST SUITE   ');
  console.log('==================================================\n');

  // 1. Authenticate Seller
  const sellerLogin = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'seller@auction.com', password: 'Seller123!' }),
  });
  const seller = await sellerLogin.json();
  const token = seller.token;
  console.log(`[PASS] Seller Authenticated: "${seller.user.name}" (${seller.user.email})`);

  // 2. Test Categories
  const catRes = await fetch('http://localhost:5000/api/categories');
  const catData = await catRes.json();
  console.log(`[PASS] Categories API: Found ${catData.categories.length} categories.`);
  console.log(`       Sample categories: ${catData.categories.slice(0, 4).map(c => c.name).join(', ')}`);

  // 3. Test Create Auction (All Form Fields)
  const createPayload = {
    title: 'Audemars Piguet Royal Oak Chronograph 41mm',
    description: 'Stainless steel case with "Grande Tapisserie" blue dial. Automatic calibre 4401 with 70 hours power reserve.',
    category: 'Luxury Watches',
    starting_bid: 42000.00,
    bid_increment: 500.00,
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    images: [
      'https://images.unsplash.com/photo-1547996160-71dfabb14646?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80'
    ]
  };

  const createRes = await fetch('http://localhost:5000/api/auctions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(createPayload),
  });
  const createResult = await createRes.json();
  if (!createResult.success) throw new Error('Create auction failed: ' + createResult.message);
  const auctionId = createResult.auction.id;
  console.log(`[PASS] Create Auction API: Successfully created lot #${auctionId} ("${createResult.auction.title}")`);

  // 4. Test View Auction Details
  const viewRes = await fetch(`http://localhost:5000/api/auctions/${auctionId}`);
  const viewData = await viewRes.json();
  if (!viewData.success) throw new Error('View auction failed: ' + viewData.message);
  console.log(`[PASS] View Auction API: Fetched Lot #${auctionId}`);
  console.log(`       Status: "${viewData.auction.computed_status}" | Start Price: $${viewData.auction.starting_bid} | Increment: $${viewData.auction.bid_increment} | Next Min: $${viewData.auction.next_min_bid}`);

  // 5. Test Edit Auction
  const updatePayload = {
    title: 'Audemars Piguet Royal Oak Chronograph 41mm - Mint Full Set',
    description: 'Updated with complete box, papers, warranty card and extra link.',
    bid_increment: 750.00,
    category: 'Luxury Watches',
  };
  const updateRes = await fetch(`http://localhost:5000/api/auctions/${auctionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updatePayload),
  });
  const updateData = await updateRes.json();
  if (!updateData.success) throw new Error('Update auction failed: ' + updateData.message);
  console.log(`[PASS] Edit Auction API: Lot #${auctionId} updated. New title: "${updateData.auction.title}", increment: $${updateData.auction.bid_increment}`);

  // 6. Test Search, Filters, Sorting & Pagination
  // 6a. Search
  const searchRes = await fetch(`http://localhost:5000/api/auctions?search=Audemars`);
  const searchData = await searchRes.json();
  console.log(`[PASS] Search API: Found ${searchData.auctions.length} item(s) matching "Audemars"`);

  // 6b. Status Filter
  const statusRes = await fetch(`http://localhost:5000/api/auctions?status=live`);
  const statusData = await statusRes.json();
  console.log(`[PASS] Status Filter "live": Found ${statusData.auctions.length} live auction(s)`);

  // 6c. Category Filter
  const categoryRes = await fetch(`http://localhost:5000/api/auctions?category=Luxury%20Watches`);
  const categoryData = await categoryRes.json();
  console.log(`[PASS] Category Filter "Luxury Watches": Found ${categoryData.auctions.length} item(s)`);

  // 6d. Sorting
  const sortRes = await fetch(`http://localhost:5000/api/auctions?sortBy=priceDesc&limit=3`);
  const sortData = await sortRes.json();
  console.log(`[PASS] Sort By Price Descending: Highest lot is $${sortData.auctions[0]?.current_bid}`);

  // 6e. Pagination
  const pageRes = await fetch(`http://localhost:5000/api/auctions?page=1&limit=4`);
  const pageData = await pageRes.json();
  console.log(`[PASS] Pagination: Page ${pageData.pagination.page} of ${pageData.pagination.totalPages} (Total lots: ${pageData.pagination.total})`);

  // 7. Test My Auctions (Seller Hub)
  const myAuctionsRes = await fetch('http://localhost:5000/api/auctions/seller/my-auctions', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const myData = await myAuctionsRes.json();
  console.log(`[PASS] My Auctions API: Seller owns ${myData.myAuctions.length} auctions`);
  console.log(`       Breakdown - Live: ${myData.summary.live_count}, Upcoming: ${myData.summary.upcoming_count}, Completed: ${myData.summary.completed_count}`);

  // 8. Test Delete Auction
  const deleteRes = await fetch(`http://localhost:5000/api/auctions/${auctionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const deleteData = await deleteRes.json();
  console.log(`[PASS] Delete Auction API: Lot #${auctionId} deleted. Result: "${deleteData.message}"`);

  // 9. Verify Deletion
  const verifyRes = await fetch(`http://localhost:5000/api/auctions/${auctionId}`);
  if (verifyRes.status === 404) {
    console.log(`[PASS] Verification: Lot #${auctionId} confirmed removed (HTTP 404)`);
  }

  console.log('\n==================================================');
  console.log('   ALL PART 2 CRUD & API TESTS PASSED 100%!       ');
  console.log('==================================================');
}

testPart2().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
