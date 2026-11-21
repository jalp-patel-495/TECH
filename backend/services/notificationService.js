const { query } = require('../config/db');

/**
 * Creates and dispatches a notification to a specific user
 */
const sendNotification = async ({ userId, title, message, type = 'system', link = null, io = null }) => {
  try {
    const res = await query(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, title, message, type, is_read, link, created_at;
    `, [userId, title, message, type, link]);

    const notification = res.rows[0];

    // Emit real-time notification to user's personal socket room
    if (io) {
      io.to(`user_${userId}`).emit('notification', notification);
      io.emit(`user_${userId}_notification`, notification);
    }

    return notification;
  } catch (err) {
    console.error('[NotificationService Error]', err.message);
    return null;
  }
};

/**
 * Dispatches notifications when a bid is accepted:
 * 1. To the bidder: "Bid Accepted"
 * 2. To the seller: "New Bid on your auction"
 * 3. To the previous highest bidder: "You have been outbid!"
 */
const notifyBidPlaced = async ({ auctionId, auctionTitle, bidderId, bidderName, amount, previousHighBidderId, sellerId, io }) => {
  const link = `/auctions/${auctionId}`;

  // 1. Notify current bidder
  await sendNotification({
    userId: bidderId,
    title: 'Bid Accepted!',
    message: `Your bid of $${amount.toFixed(2)} was successfully recorded on "${auctionTitle}".`,
    type: 'bid_accepted',
    link,
    io,
  });

  // 2. Notify seller
  if (sellerId && sellerId !== bidderId) {
    await sendNotification({
      userId: sellerId,
      title: 'New Bid on Your Listing',
      message: `${bidderName} placed a bid of $${amount.toFixed(2)} on "${auctionTitle}".`,
      type: 'new_highest_bid',
      link,
      io,
    });
  }

  // 3. Notify previous high bidder (Outbid notification)
  if (previousHighBidderId && previousHighBidderId !== bidderId) {
    await sendNotification({
      userId: previousHighBidderId,
      title: 'You Have Been Outbid!',
      message: `A higher bid of $${amount.toFixed(2)} was placed on "${auctionTitle}". Counter-bid now to stay in the lead!`,
      type: 'outbid',
      link,
      io,
    });
  }
};

/**
 * Dispatches notification when auction is extended via anti-sniping
 */
const notifyAuctionExtended = async ({ auctionId, auctionTitle, bidderIds = [], io }) => {
  const link = `/auctions/${auctionId}`;
  for (const uid of bidderIds) {
    await sendNotification({
      userId: uid,
      title: 'Auction Extended (+30s)',
      message: `Anti-sniping rule triggered on "${auctionTitle}": Deadline extended by 30 seconds!`,
      type: 'auction_extended',
      link,
      io,
    });
  }
};

/**
 * Dispatches notifications upon auction conclusion
 */
const notifyAuctionClosed = async ({ auctionId, auctionTitle, winnerId, finalPrice, allBidderIds = [], sellerId, io }) => {
  const link = `/auctions/${auctionId}`;

  if (winnerId) {
    // Notify winner
    await sendNotification({
      userId: winnerId,
      title: 'Congratulations! You Won!',
      message: `You won "${auctionTitle}" with the winning bid of $${parseFloat(finalPrice).toFixed(2)}!`,
      type: 'auction_won',
      link,
      io,
    });

    // Notify seller
    if (sellerId) {
      await sendNotification({
        userId: sellerId,
        title: 'Auction Successfully Concluded',
        message: `Your listing "${auctionTitle}" was won for $${parseFloat(finalPrice).toFixed(2)}.`,
        type: 'auction_concluded',
        link,
        io,
      });
    }

    // Notify other bidders that they lost
    const lostBidders = allBidderIds.filter(id => id !== winnerId);
    for (const uid of lostBidders) {
      await sendNotification({
        userId: uid,
        title: 'Auction Ended',
        message: `The auction for "${auctionTitle}" concluded. Better luck on the next lot!`,
        type: 'auction_lost',
        link,
        io,
      });
    }
  } else {
    // No winner
    if (sellerId) {
      await sendNotification({
        userId: sellerId,
        title: 'Auction Ended (No Winner)',
        message: `Your listing "${auctionTitle}" concluded with zero bids.`,
        type: 'auction_no_winner',
        link,
        io,
      });
    }
  }
};

module.exports = {
  sendNotification,
  notifyBidPlaced,
  notifyAuctionExtended,
  notifyAuctionClosed,
};
