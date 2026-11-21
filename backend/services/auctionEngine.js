const { pool, query } = require('../config/db');
const {
  notifyBidPlaced,
  notifyAuctionExtended,
  notifyAuctionClosed,
  sendNotification,
} = require('./notificationService');

/**
 * Places a bid safely using PostgreSQL transactions and row-level locking (FOR UPDATE)
 * Implements 30-second anti-sniping extension rule and strict validation.
 */
const placeBidTransaction = async ({ auctionId, bidderId, amount, io }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Acquire exclusive row-level lock on the auction
    const lockSql = `
      SELECT id, title, starting_bid, current_bid, bid_increment, 
             start_time, end_time, status, seller_id
      FROM auctions
      WHERE id = $1
      FOR UPDATE;
    `;
    const lockRes = await client.query(lockSql, [auctionId]);

    if (lockRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, statusCode: 404, message: 'Auction lot not found.' };
    }

    const auction = lockRes.rows[0];

    // Prevent seller from bidding on their own auction
    if (auction.seller_id === bidderId) {
      await client.query('ROLLBACK');
      return { success: false, statusCode: 403, message: 'Sellers are not permitted to bid on their own listings.' };
    }

    const now = new Date();
    const startTime = new Date(auction.start_time);
    const endTime = new Date(auction.end_time);

    // 2. Reject bids on cancelled or completed auctions
    if (auction.status === 'cancelled') {
      await client.query('ROLLBACK');
      const msg = 'This auction has been cancelled and cannot accept bids.';
      await query(`INSERT INTO bid_logs (auction_id, bidder_id, amount, status, reason) VALUES ($1, $2, $3, 'rejected', $4)`, [auctionId, bidderId, amount || 0, msg]).catch(() => {});
      return { success: false, statusCode: 400, message: msg };
    }

    if (auction.status === 'completed' || now > endTime) {
      await client.query('ROLLBACK');
      const msg = 'Auction is officially closed. Bids can no longer be accepted.';
      await query(`INSERT INTO bid_logs (auction_id, bidder_id, amount, status, reason) VALUES ($1, $2, $3, 'rejected', $4)`, [auctionId, bidderId, amount || 0, msg]).catch(() => {});
      return { success: false, statusCode: 400, message: msg };
    }

    if (now < startTime) {
      await client.query('ROLLBACK');
      const msg = 'This auction has not started yet.';
      await query(`INSERT INTO bid_logs (auction_id, bidder_id, amount, status, reason) VALUES ($1, $2, $3, 'rejected', $4)`, [auctionId, bidderId, amount || 0, msg]).catch(() => {});
      return { success: false, statusCode: 400, message: msg };
    }

    // 3. Strict Bid Validation: Must exceed current highest bid plus minimum increment
    const currentBid = parseFloat(auction.current_bid);
    const bidIncrement = parseFloat(auction.bid_increment || 10.0);
    const minRequired = currentBid + bidIncrement;
    const bidAmountNum = parseFloat(amount);

    if (isNaN(bidAmountNum)) {
      await client.query('ROLLBACK');
      return { success: false, statusCode: 400, message: 'Invalid bid amount provided.' };
    }

    if (bidAmountNum < minRequired) {
      await client.query('ROLLBACK');
      const msg = `Your bid of $${bidAmountNum.toFixed(2)} is too low. It must be at least $${minRequired.toFixed(2)} (Current Bid: $${currentBid.toFixed(2)} + Increment: $${bidIncrement.toFixed(2)}).`;
      
      // Log rejected bid
      await query(`INSERT INTO bid_logs (auction_id, bidder_id, amount, status, reason) VALUES ($1, $2, $3, 'rejected', $4)`, [auctionId, bidderId, bidAmountNum, msg]).catch(() => {});
      
      // Send notification to bidder about rejection
      sendNotification({
        userId: bidderId,
        title: 'Bid Rejected',
        message: msg,
        type: 'bid_rejected',
        link: `/auctions/${auctionId}`,
        io,
      }).catch(() => {});

      return {
        success: false,
        statusCode: 400,
        message: msg,
        minRequired,
        currentBid,
        bidIncrement,
      };
    }

    // Find previous highest bidder before adding new bid
    const prevBidRes = await client.query(`
      SELECT bidder_id FROM bids 
      WHERE auction_id = $1 
      ORDER BY amount DESC, created_at ASC 
      LIMIT 1;
    `, [auctionId]);
    const previousHighBidderId = prevBidRes.rows[0]?.bidder_id || null;

    // 4. Anti-Sniping Rule: If a valid bid arrives in the last 30 seconds, extend auction by 30 seconds
    const secondsRemaining = (endTime.getTime() - now.getTime()) / 1000;
    let extended = false;
    let newEndTime = endTime;

    if (secondsRemaining <= 30 && secondsRemaining > 0) {
      newEndTime = new Date(endTime.getTime() + 30 * 1000);
      extended = true;
      console.log(`[Anti-Sniping] Auction #${auctionId} extended by 30s. New end time: ${newEndTime.toISOString()}`);
    }

    // 5. Insert Bid into PostgreSQL
    const insertBidSql = `
      INSERT INTO bids (auction_id, bidder_id, amount)
      VALUES ($1, $2, $3)
      RETURNING id, auction_id, bidder_id, amount, created_at;
    `;
    const bidRes = await client.query(insertBidSql, [auctionId, bidderId, bidAmountNum]);
    const createdBid = bidRes.rows[0];

    // Log accepted bid in bid_logs
    await client.query(`
      INSERT INTO bid_logs (auction_id, bidder_id, amount, status, reason)
      VALUES ($1, $2, $3, 'accepted', 'Bid accepted and confirmed as highest active bid');
    `, [auctionId, bidderId, bidAmountNum]);

    // 6. Update Auction's current_bid and optionally end_time
    if (extended) {
      await client.query(`
        UPDATE auctions
        SET current_bid = $1, end_time = $2, updated_at = NOW()
        WHERE id = $3;
      `, [bidAmountNum, newEndTime, auctionId]);
    } else {
      await client.query(`
        UPDATE auctions
        SET current_bid = $1, updated_at = NOW()
        WHERE id = $2;
      `, [bidAmountNum, auctionId]);
    }

    // Commit transaction cleanly
    await client.query('COMMIT');

    // 7. Get bidder details for real-time broadcast
    const userRes = await query(`SELECT name FROM users WHERE id = $1;`, [bidderId]);
    const bidderName = userRes.rows[0]?.name || 'Anonymous Bidder';

    // 8. Instant Real-Time Socket.IO Synchronization
    if (io) {
      // Broadcast to all viewers in this auction room
      io.to(`auction_${auctionId}`).emit('bid_update', {
        auctionId,
        newBid: bidAmountNum,
        bidderName,
        timestamp: createdBid.created_at,
        extended,
        newEndTime: extended ? newEndTime.toISOString() : null,
        nextMinBid: (bidAmountNum + bidIncrement).toFixed(2),
      });

      if (extended) {
        io.to(`auction_${auctionId}`).emit('auction_extended', {
          auctionId,
          newEndTime: newEndTime.toISOString(),
          secondsAdded: 30,
          message: '⚡ Anti-sniping rule triggered: Auction extended by 30 seconds!',
        });
      }

      // Global live ticker broadcast
      io.emit('live_ticker', {
        auctionId,
        auctionTitle: auction.title,
        amount: bidAmountNum,
        bidderName,
      });
    }

    // 9. Dispatch notifications (bidder accepted, seller alert, outbid alert)
    notifyBidPlaced({
      auctionId,
      auctionTitle: auction.title,
      bidderId,
      bidderName,
      amount: bidAmountNum,
      previousHighBidderId,
      sellerId: auction.seller_id,
      io,
    }).catch(console.error);

    if (extended) {
      query(`SELECT DISTINCT bidder_id FROM bids WHERE auction_id = $1;`, [auctionId])
        .then(res => {
          const bidderIds = res.rows.map(r => r.bidder_id);
          notifyAuctionExtended({ auctionId, auctionTitle: auction.title, bidderIds, io });
        })
        .catch(console.error);
    }

    return {
      success: true,
      message: extended 
        ? `Bid of $${bidAmountNum.toFixed(2)} accepted! Auction extended by 30 seconds.`
        : `Bid of $${bidAmountNum.toFixed(2)} accepted successfully!`,
      bid: createdBid,
      currentBid: bidAmountNum,
      extended,
      newEndTime: extended ? newEndTime.toISOString() : null,
      nextMinBid: (bidAmountNum + bidIncrement).toFixed(2),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[placeBidTransaction Error]', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Checks for expired auctions, selects exactly one highest bidder as winner,
 * or marks as 'No Winner' if zero bids exist.
 */
const closeExpiredAuctions = async (io) => {
  const client = await pool.connect();

  try {
    // Find all auctions whose end_time has passed and are not marked 'completed' or 'cancelled'
    const expiredRes = await client.query(`
      SELECT id, title, current_bid, starting_bid, seller_id
      FROM auctions
      WHERE end_time <= NOW()
        AND status IN ('live', 'active', 'upcoming')
      FOR UPDATE SKIP LOCKED;
    `);

    for (const auction of expiredRes.rows) {
      // Find highest bidder for this auction
      const highestBidRes = await client.query(`
        SELECT b.bidder_id, b.amount, u.name as winner_name, u.email as winner_email
        FROM bids b
        JOIN users u ON b.bidder_id = u.id
        WHERE b.auction_id = $1
        ORDER BY b.amount DESC, b.created_at ASC
        LIMIT 1;
      `, [auction.id]);

      // Find all unique bidders on this auction for won/lost notifications
      const allBiddersRes = await client.query(`
        SELECT DISTINCT bidder_id FROM bids WHERE auction_id = $1;
      `, [auction.id]);
      const allBidderIds = allBiddersRes.rows.map(r => r.bidder_id);

      if (highestBidRes.rows.length > 0) {
        const winner = highestBidRes.rows[0];
        const finalPrice = parseFloat(winner.amount);

        // Record winner and final price in PostgreSQL
        await client.query(`
          UPDATE auctions
          SET status = 'completed',
              winner_id = $1,
              winning_price = $2,
              updated_at = NOW()
          WHERE id = $3;
        `, [winner.bidder_id, finalPrice, auction.id]);

        console.log(`[Auction Closed] Lot #${auction.id} "${auction.title}" WON BY ${winner.winner_name} for $${finalPrice}`);

        // Broadcast to viewers and global listeners
        if (io) {
          io.to(`auction_${auction.id}`).emit('auction_closed', {
            auctionId: auction.id,
            status: 'completed',
            hasWinner: true,
            winnerId: winner.bidder_id,
            winnerName: winner.winner_name,
            finalPrice,
          });

          io.emit('auction_status_change', {
            auctionId: auction.id,
            status: 'completed',
            hasWinner: true,
            winnerName: winner.winner_name,
            finalPrice,
          });
        }

        // Send notifications
        notifyAuctionClosed({
          auctionId: auction.id,
          auctionTitle: auction.title,
          winnerId: winner.bidder_id,
          finalPrice,
          allBidderIds,
          sellerId: auction.seller_id,
          io,
        }).catch(console.error);

      } else {
        // No bids exist on this auction -> Concluded with No Winner
        await client.query(`
          UPDATE auctions
          SET status = 'completed',
              winner_id = NULL,
              winning_price = NULL,
              updated_at = NOW()
          WHERE id = $1;
        `, [auction.id]);

        console.log(`[Auction Closed] Lot #${auction.id} "${auction.title}" ENDED WITH NO WINNER (Zero bids).`);

        if (io) {
          io.to(`auction_${auction.id}`).emit('auction_closed', {
            auctionId: auction.id,
            status: 'completed',
            hasWinner: false,
            message: 'Auction closed with No Winner (no bids placed).',
          });

          io.emit('auction_status_change', {
            auctionId: auction.id,
            status: 'completed',
            hasWinner: false,
          });
        }

        notifyAuctionClosed({
          auctionId: auction.id,
          auctionTitle: auction.title,
          winnerId: null,
          finalPrice: null,
          allBidderIds: [],
          sellerId: auction.seller_id,
          io,
        }).catch(console.error);
      }
    }
  } catch (err) {
    console.error('[closeExpiredAuctions Error]', err.message);
  } finally {
    client.release();
  }
};

/**
 * Initializes continuous background worker checking auction expiration every 2 seconds
 */
const startAuctionBackgroundWorker = (io) => {
  console.log('[Auction Engine] Real-time timer and expiration worker started (2s interval).');
  const timer = setInterval(() => {
    closeExpiredAuctions(io).catch((err) => {
      console.error('[Background Worker Error]', err.message);
    });
  }, 2000);

  return timer;
};

module.exports = {
  placeBidTransaction,
  closeExpiredAuctions,
  startAuctionBackgroundWorker,
};
