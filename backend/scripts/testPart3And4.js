// Comprehensive Verification for Parts 3 & 4:
// 1. Simultaneous Bidding (PostgreSQL Row-Level Locking & Race-Condition Prevention)
// 2. 30-Second Anti-Sniping Timer Extension
// 3. Automatic Auction Expiration & Single Winner Selection
// 4. Zero-Bid Auction Expiration & "No Winner" Handling

const { query } = require('../config/db');

async function runTestSuite() {
  console.log('===============================================================');
  console.log('   PARTS 3 & 4: CONCURRENCY, ANTI-SNIPING & WINNER SELECTION   ');
  console.log('===============================================================\n');

  // 1. Authenticate Seller and Buyers
  const sellerLogin = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'seller@auction.com', password: 'Seller123!' }),
  });
  const sellerData = await sellerLogin.json();
  const sellerToken = sellerData.token;

  const buyerLogin = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'buyer@auction.com', password: 'Buyer123!' }),
  });
  const buyerData = await buyerLogin.json();
  const buyerToken = buyerData.token;

  // Create a second test buyer for simultaneous bidding
  const buyer2Email = `buyer2_${Date.now()}@auction.com`;
  const regBuyer2 = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Marcus Vance',
      email: buyer2Email,
      password: 'Password123!',
      role: 'buyer',
    }),
  });
  const buyer2Data = await regBuyer2.json();
  const buyer2Token = buyer2Data.token;

  console.log('[PASS] Authenticated Seller and 2 Distinct Buyers for Concurrency Tests.');

  // --------------------------------------------------------------------------
  // TEST 1: SIMULTANEOUS BIDDING CONCURRENCY
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 1: Simultaneous Bidding (Row-Level Locking) ---');
  
  const freshAuctionRes = await fetch('http://localhost:5000/api/auctions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sellerToken}` },
    body: JSON.stringify({
      title: 'Patek Philippe Concurrency Test Lot',
      description: 'Test lot for simultaneous bidding concurrency validation.',
      category: 'Luxury Watches',
      starting_bid: 1000.00,
      bid_increment: 50.00,
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80']
    }),
  });
  const freshAuction = await freshAuctionRes.json();
  const auctionId = freshAuction.auction.id;
  console.log(`Created test auction lot #${auctionId}. Starting: $1000, Increment: $50`);

  // Both buyers fire bids at the EXACT SAME time for $1100
  console.log('Firing 2 simultaneous bids of $1100.00 at the exact same millisecond...');
  const [bidRes1, bidRes2] = await Promise.all([
    fetch('http://localhost:5000/api/users/bid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${buyerToken}` },
      body: JSON.stringify({ auctionId, amount: 1100.00 }),
    }).then(r => r.json()),
    fetch('http://localhost:5000/api/users/bid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${buyer2Token}` },
      body: JSON.stringify({ auctionId, amount: 1100.00 }),
    }).then(r => r.json())
  ]);

  const acceptedCount = (bidRes1.success ? 1 : 0) + (bidRes2.success ? 1 : 0);
  const rejectedCount = (!bidRes1.success ? 1 : 0) + (!bidRes2.success ? 1 : 0);

  if (acceptedCount === 1 && rejectedCount === 1) {
    console.log('[PASS] Concurrency Safety: Exactly ONE simultaneous bid of $1100 was accepted.');
    console.log(`       Second simultaneous bid was safely rejected: "${bidRes1.message || bidRes2.message}"`);
  } else {
    throw new Error(`Concurrency race condition detected! Accepted: ${acceptedCount}, Rejected: ${rejectedCount}`);
  }

  // --------------------------------------------------------------------------
  // TEST 2: 30-SECOND ANTI-SNIPING EXTENSION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: 30-Second Anti-Sniping Extension ---');
  
  const initialEndTime = new Date(Date.now() + 15 * 1000);
  const snipingAuctionRes = await fetch('http://localhost:5000/api/auctions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sellerToken}` },
    body: JSON.stringify({
      title: 'Anti-Sniping Timer Test Lot',
      description: 'Auction configured with 15 seconds remaining.',
      category: 'Electronics & Gadgets',
      starting_bid: 500.00,
      bid_increment: 20.00,
      start_time: new Date().toISOString(),
      end_time: initialEndTime.toISOString(),
      images: ['https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80']
    }),
  });
  const snipingAuction = await snipingAuctionRes.json();
  const snipingId = snipingAuction.auction.id;
  console.log(`Created anti-sniping test lot #${snipingId} ending in 15 seconds.`);

  // Place a valid bid during the final 30 seconds
  const snipeBidRes = await fetch('http://localhost:5000/api/users/bid', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${buyerToken}` },
    body: JSON.stringify({ auctionId: snipingId, amount: 550.00 }),
  });
  const snipeBid = await snipeBidRes.json();

  if (snipeBid.extended) {
    console.log('[PASS] Anti-Sniping Rule Triggered: Bid placed in final 15s extended the auction by 30 seconds.');
    console.log(`       Original End Time: ${initialEndTime.toISOString()}`);
    console.log(`       Extended End Time: ${snipeBid.newEndTime}`);
  } else {
    throw new Error('Anti-sniping did not trigger on bid within last 30s');
  }

  // --------------------------------------------------------------------------
  // TEST 3: AUTOMATIC AUCTION CLOSURE & WINNER SELECTION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Auction Completion & Winner Selection ---');

  const fastAuctionRes = await fetch('http://localhost:5000/api/auctions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sellerToken}` },
    body: JSON.stringify({
      title: 'Winner Selection Validation Lot',
      description: 'Testing automatic winner selection.',
      category: 'Collectibles & Art',
      starting_bid: 200.00,
      bid_increment: 10.00,
      start_time: new Date(Date.now() - 10000).toISOString(),
      end_time: new Date(Date.now() + 60000).toISOString(),
      images: ['https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=400&q=80']
    }),
  });
  const fastAuction = await fastAuctionRes.json();
  const fastId = fastAuction.auction.id;

  // Place winning bid of $250.00 by Pro Buyer
  const winBidRes = await fetch('http://localhost:5000/api/users/bid', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${buyerToken}` },
    body: JSON.stringify({ auctionId: fastId, amount: 250.00 }),
  });
  await winBidRes.json();
  console.log(`Placed bid of $250.00 by ${buyerData.user.name}.`);

  // Simulate countdown expiration
  await query(`UPDATE auctions SET end_time = NOW() - INTERVAL '1 second' WHERE id = $1;`, [fastId]);
  console.log('Auction time expired. Waiting 2.5 seconds for background worker to finalize winner...');

  await new Promise(r => setTimeout(r, 2500));

  // Check auction details
  const closedRes = await fetch(`http://localhost:5000/api/auctions/${fastId}`);
  const closedData = await closedRes.json();

  if (closedData.auction.isClosed && closedData.auction.hasWinner && closedData.auction.winner) {
    console.log('[PASS] Winner Selection: Auction automatically closed.');
    console.log(`       Official Winner: "${closedData.auction.winner.name}" (ID: ${closedData.auction.winner.id})`);
    console.log(`       Winning Price: $${closedData.auction.winner.price}`);
  } else {
    throw new Error('Auction did not close or winner was not selected properly: ' + JSON.stringify(closedData));
  }

  // --------------------------------------------------------------------------
  // TEST 4: AUCTION EXPIRED WITH ZERO BIDS ("NO WINNER")
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Zero-Bid Expiry ("No Winner") ---');

  const zeroBidAuctionRes = await fetch('http://localhost:5000/api/auctions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sellerToken}` },
    body: JSON.stringify({
      title: 'Zero Bids Expiry Test Lot',
      description: 'Testing No Winner handling.',
      category: 'Automobiles & Vehicles',
      starting_bid: 999.00,
      bid_increment: 50.00,
      start_time: new Date(Date.now() - 10000).toISOString(),
      end_time: new Date(Date.now() - 1000).toISOString(), // Already in the past
      images: ['https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=400&q=80']
    }),
  });
  const zeroBidAuction = await zeroBidAuctionRes.json();
  const zeroBidId = zeroBidAuction.auction.id;
  console.log(`Created zero-bid lot #${zeroBidId}. Waiting 2.5 seconds for background worker to finalize...`);

  await new Promise(r => setTimeout(r, 2500));

  const zeroClosedRes = await fetch(`http://localhost:5000/api/auctions/${zeroBidId}`);
  const zeroClosedData = await zeroClosedRes.json();

  if (zeroClosedData.auction.isClosed && !zeroClosedData.auction.hasWinner && zeroClosedData.auction.winner === null) {
    console.log('[PASS] No Winner Handling: Auction automatically closed with No Winner (hasWinner = false, winner = null).');
  } else {
    throw new Error('Zero bid auction failed No Winner verification: ' + JSON.stringify(zeroClosedData));
  }

  console.log('\n===============================================================');
  console.log('   ALL CONCURRENCY, TIMER & WINNER TESTS PASSED 100%!         ');
  console.log('===============================================================');
}

runTestSuite().then(() => process.exit(0)).catch(err => {
  console.error('Test Suite Error:', err);
  process.exit(1);
});
