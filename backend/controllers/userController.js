const { query } = require('../config/db');
const { findUserById } = require('../models/userModel');
const { placeBidTransaction } = require('../services/auctionEngine');

// GET /api/users/profile
const getProfile = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        balance: user.balance,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/buyer/dashboard
const getBuyerDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch live auctions available for bidding
    const auctionsRes = await query(`
      SELECT 
        a.id, a.title, a.description, a.category, a.current_bid, a.starting_bid,
        a.bid_increment, a.image_url, a.images, a.end_time, a.status,
        u.name as seller_name,
        (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) as total_bids
      FROM auctions a
      JOIN users u ON a.seller_id = u.id
      WHERE a.status IN ('live', 'active') AND a.end_time > NOW()
      ORDER BY a.end_time ASC
      LIMIT 12;
    `);

    // Fetch user's recent bids
    const bidsRes = await query(`
      SELECT 
        b.id, b.amount, b.created_at,
        a.id as auction_id, a.title as auction_title, a.status as auction_status,
        a.current_bid, a.image_url,
        (b.amount = a.current_bid) as is_high_bidder
      FROM bids b
      JOIN auctions a ON b.auction_id = a.id
      WHERE b.bidder_id = $1
      ORDER BY b.created_at DESC
      LIMIT 15;
    `, [userId]);

    // Count won auctions
    const wonRes = await query(`
      SELECT COUNT(*) as won_count, COALESCE(SUM(winning_price), 0) as total_won_value
      FROM auctions
      WHERE winner_id = $1;
    `, [userId]);

    res.status(200).json({
      success: true,
      dashboard: {
        role: 'buyer',
        activeAuctions: auctionsRes.rows,
        myBids: bidsRes.rows,
        stats: {
          totalBidsPlaced: bidsRes.rows.length,
          activeWatchedAuctions: auctionsRes.rows.length,
          auctionsWon: parseInt(wonRes.rows[0].won_count, 10),
          totalWonValue: parseFloat(wonRes.rows[0].total_won_value).toFixed(2),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/seller/dashboard
const getSellerDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const listingsRes = await query(`
      SELECT 
        a.id, a.title, a.category, a.starting_bid, a.current_bid, a.status,
        a.image_url, a.end_time, a.created_at, a.winner_id, a.winning_price,
        (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) as bid_count
      FROM auctions a
      WHERE a.seller_id = $1
      ORDER BY a.created_at DESC;
    `, [userId]);

    const activeCount = listingsRes.rows.filter(l => l.status === 'live' || l.status === 'active').length;
    const totalEarnings = listingsRes.rows.reduce((sum, l) => sum + parseFloat(l.winning_price || l.current_bid || 0), 0);

    res.status(200).json({
      success: true,
      dashboard: {
        role: 'seller',
        listings: listingsRes.rows,
        stats: {
          totalListings: listingsRes.rows.length,
          activeListings: activeCount,
          estimatedRevenue: totalEarnings.toFixed(2),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/users/bid - Robust Real-Time Bidding with PostgreSQL Transaction & Row-Level Lock
const placeBid = async (req, res, next) => {
  try {
    const { auctionId, amount } = req.body;
    const bidderId = req.user.id;

    if (!auctionId || amount === undefined || amount === null) {
      return res.status(400).json({ success: false, message: 'Auction ID and bid amount are required.' });
    }

    const io = req.app.get('io');
    const result = await placeBidTransaction({
      auctionId: parseInt(auctionId, 10),
      bidderId,
      amount: parseFloat(amount),
      io,
    });

    if (!result.success) {
      return res.status(result.statusCode || 400).json({
        success: false,
        message: result.message,
        minRequired: result.minRequired,
        currentBid: result.currentBid,
        bidIncrement: result.bidIncrement,
      });
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  getBuyerDashboard,
  getSellerDashboard,
  placeBid,
};
