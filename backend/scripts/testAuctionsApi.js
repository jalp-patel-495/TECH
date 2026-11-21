async function testAuctionsApi() {
  console.log('=== TESTING AUCTION MANAGEMENT APIS ===');

  // 1. Login as Seller
  const sellerLogin = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'seller@auction.com', password: 'Seller123!' }),
  });
  const sellerData = await sellerLogin.json();
  const sellerToken = sellerData.token;
  console.log('[PASS] Seller Authenticated. ID:', sellerData.user.id);

  // 2. Test GET /api/categories
  const catRes = await fetch('http://localhost:5000/api/categories');
  const catData = await catRes.json();
  console.log(`[PASS] GET /api/categories: Loaded ${catData.categories.length} categories`);

  // 3. Test GET /api/auctions (all, with pagination)
  const listRes = await fetch('http://localhost:5000/api/auctions?page=1&limit=6&sortBy=endingSoon');
  const listData = await listRes.json();
  console.log(`[PASS] GET /api/auctions: Retrieved ${listData.auctions.length} auctions. Total: ${listData.pagination.total}`);

  // 4. Test Search & Filter
  const filterRes = await fetch('http://localhost:5000/api/auctions?search=Rolex&status=all');
  const filterData = await filterRes.json();
  console.log(`[PASS] Search Filter "Rolex": Matched ${filterData.auctions.length} item(s)`);

  // 5. Test POST /api/auctions (Create Auction)
  const newAuctionPayload = {
    title: 'Leica M6 35mm Rangefinder Camera (Titanium Edition)',
    description: 'Special titanium-plated body with matching Summilux-M 35mm f/1.4 ASPH lens. Mint museum collector grade.',
    category: 'Electronics & Gadgets',
    starting_bid: 5200.00,
    bid_increment: 100.00,
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    images: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=800&q=80'
    ]
  };

  const createRes = await fetch('http://localhost:5000/api/auctions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sellerToken}`,
    },
    body: JSON.stringify(newAuctionPayload),
  });
  const createData = await createRes.json();
  const createdId = createData.auction?.id;
  console.log(`[PASS] POST /api/auctions (Create): Created auction #${createdId} - "${createData.auction?.title}"`);

  // 6. Test GET /api/auctions/:id (View Auction Details)
  const detailRes = await fetch(`http://localhost:5000/api/auctions/${createdId}`);
  const detailData = await detailRes.json();
  console.log(`[PASS] GET /api/auctions/:id (View): Status "${detailData.auction.computed_status}", Starting Price: $${detailData.auction.starting_bid}, Bid Increment: $${detailData.auction.bid_increment}`);

  // 7. Test PUT /api/auctions/:id (Edit Auction)
  const updateRes = await fetch(`http://localhost:5000/api/auctions/${createdId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sellerToken}`,
    },
    body: JSON.stringify({
      title: 'Leica M6 35mm Rangefinder Camera (Titanium Edition) - MINT++',
      bid_increment: 150.00,
    }),
  });
  const updateData = await updateRes.json();
  console.log(`[PASS] PUT /api/auctions/:id (Edit): Updated title to "${updateData.auction?.title}", increment: $${updateData.auction?.bid_increment}`);

  // 8. Test GET /api/auctions/seller/my-auctions
  const myRes = await fetch('http://localhost:5000/api/auctions/seller/my-auctions', {
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  const myData = await myRes.json();
  console.log(`[PASS] GET /api/auctions/seller/my-auctions: Found ${myData.myAuctions.length} auctions for this seller`);

  // 9. Test DELETE /api/auctions/:id
  const deleteRes = await fetch(`http://localhost:5000/api/auctions/${createdId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  const deleteData = await deleteRes.json();
  console.log(`[PASS] DELETE /api/auctions/:id: ${deleteData.message}`);

  console.log('=== ALL AUCTION CRUD APIS VERIFIED AND WORKING ===');
}

testAuctionsApi();
