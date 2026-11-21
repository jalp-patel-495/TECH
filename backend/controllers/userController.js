const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { findUserById } = require('../models/userModel');
const { placeBidTransaction } = require('../services/auctionEngine');

// GET /api/users/profile
const getProfile = async (req, res, next) => {
  try {
    const userRes = await query(`
      SELECT id, name, email, role, balance, avatar_url, phone, bio, preferences, created_at, updated_at
      FROM users
      WHERE id = $1;
    `, [req.user.id]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      profile: userRes.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/profile - Update name, phone, bio, avatar_url
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, bio, avatar_url } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name cannot be empty.' });
    }

    const updated = await query(`
      UPDATE users
      SET 
        name = $1,
        phone = COALESCE($2, phone),
        bio = COALESCE($3, bio),
        avatar_url = COALESCE($4, avatar_url),
        updated_at = NOW()
      WHERE id = $5
      RETURNING id, name, email, role, balance, avatar_url, phone, bio, preferences, created_at;
    `, [name.trim(), phone || null, bio || null, avatar_url || null, userId]);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      user: updated.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/password - Change password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide both current and new password.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    // Get current hash
    const userRes = await query(`SELECT password FROM users WHERE id = $1;`, [userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await query(`
      UPDATE users
      SET password = $1, updated_at = NOW()
      WHERE id = $2;
    `, [newHash, userId]);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully! Please keep your new credentials safe.',
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/settings - Update preferences
const updateSettings = async (req, res, next) => {
  try {
    const { preferences } = req.body;
    const userId = req.user.id;

    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid preferences object.' });
    }

    const updated = await query(`
      UPDATE users
      SET preferences = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, preferences;
    `, [JSON.stringify(preferences), userId]);

    res.status(200).json({
      success: true,
      message: 'Preferences saved successfully!',
      preferences: updated.rows[0].preferences,
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

    // Count lost auctions
    const lostRes = await query(`
      SELECT COUNT(DISTINCT a.id) as lost_count
      FROM bids b
      JOIN auctions a ON b.auction_id = a.id
      WHERE b.bidder_id = $1 
        AND a.status = 'completed' 
        AND (a.winner_id IS NULL OR a.winner_id != $1);
    `, [userId]);

    // Count watchlist
    const watchlistCountRes = await query(`
      SELECT COUNT(*) as count FROM watchlist WHERE user_id = $1;
    `, [userId]);

    res.status(200).json({
      success: true,
      dashboard: {
        role: 'buyer',
        activeAuctions: auctionsRes.rows,
        myBids: bidsRes.rows,
        stats: {
          totalBidsPlaced: bidsRes.rows.length,
          activeWatchedAuctions: parseInt(watchlistCountRes.rows[0].count, 10),
          auctionsWon: parseInt(wonRes.rows[0].won_count, 10),
          auctionsLost: parseInt(lostRes.rows[0].lost_count, 10),
          totalWonValue: parseFloat(wonRes.rows[0].total_won_value).toFixed(2),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/buyer/bids - Full bid history
const getBuyerBids = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const countRes = await query(`SELECT COUNT(*) as total FROM bids WHERE bidder_id = $1;`, [userId]);
    const total = parseInt(countRes.rows[0].total, 10);

    const bidsRes = await query(`
      SELECT 
        b.id, b.amount, b.created_at,
        a.id as auction_id, a.title as auction_title, a.category, a.status as auction_status,
        a.current_bid, a.image_url, a.end_time,
        (b.amount = a.current_bid) as is_high_bidder,
        (a.winner_id = $1) as is_winner
      FROM bids b
      JOIN auctions a ON b.auction_id = a.id
      WHERE b.bidder_id = $1
      ORDER BY b.created_at DESC
      LIMIT $2 OFFSET $3;
    `, [userId, limitNum, offset]);

    res.status(200).json({
      success: true,
      bids: bidsRes.rows,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1,
        limit: limitNum,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/buyer/won - Won auctions
const getBuyerWon = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const wonRes = await query(`
      SELECT 
        a.id, a.title, a.description, a.category, a.starting_bid,
        a.winning_price, a.current_bid, a.image_url, a.images, a.end_time,
        u.name as seller_name, u.email as seller_email
      FROM auctions a
      JOIN users u ON a.seller_id = u.id
      WHERE a.winner_id = $1
      ORDER BY a.end_time DESC;
    `, [userId]);

    res.status(200).json({
      success: true,
      wonAuctions: wonRes.rows,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/buyer/lost - Lost auctions
const getBuyerLost = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const lostRes = await query(`
      SELECT DISTINCT ON (a.id)
        a.id, a.title, a.description, a.category, a.starting_bid,
        a.winning_price, a.current_bid, a.image_url, a.end_time,
        w.name as winner_name,
        MAX(b.amount) as my_highest_bid
      FROM bids b
      JOIN auctions a ON b.auction_id = a.id
      LEFT JOIN users w ON a.winner_id = w.id
      WHERE b.bidder_id = $1 
        AND a.status = 'completed'
        AND (a.winner_id IS NULL OR a.winner_id != $1)
      GROUP BY a.id, a.title, a.description, a.category, a.starting_bid, a.winning_price, a.current_bid, a.image_url, a.end_time, w.name
      ORDER BY a.id, a.end_time DESC;
    `, [userId]);

    res.status(200).json({
      success: true,
      lostAuctions: lostRes.rows,
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
        a.image_url, a.start_time, a.end_time, a.created_at, a.winner_id, a.winning_price,
        (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) as bid_count,
        CASE 
          WHEN a.status = 'cancelled' THEN 'cancelled'
          WHEN a.status = 'completed' OR NOW() > a.end_time THEN 'completed'
          WHEN NOW() < a.start_time THEN 'upcoming'
          ELSE 'live'
        END as computed_status
      FROM auctions a
      WHERE a.seller_id = $1
      ORDER BY a.created_at DESC;
    `, [userId]);

    const activeCount = listingsRes.rows.filter(l => l.computed_status === 'live').length;
    const upcomingCount = listingsRes.rows.filter(l => l.computed_status === 'upcoming').length;
    const completedCount = listingsRes.rows.filter(l => l.computed_status === 'completed').length;
    const totalEarnings = listingsRes.rows
      .filter(l => l.winner_id !== null)
      .reduce((sum, l) => sum + parseFloat(l.winning_price || 0), 0);

    res.status(200).json({
      success: true,
      dashboard: {
        role: 'seller',
        listings: listingsRes.rows,
        stats: {
          totalListings: listingsRes.rows.length,
          activeListings: activeCount,
          upcomingListings: upcomingCount,
          completedListings: completedCount,
          realizedRevenue: totalEarnings.toFixed(2),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/seller/auctions - Filtered by status
const getSellerAuctions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status = 'all' } = req.query;

    let condition = 'WHERE a.seller_id = $1';
    const params = [userId];

    if (status && status !== 'all') {
      if (status === 'active' || status === 'live') {
        condition += ` AND NOW() >= a.start_time AND NOW() <= a.end_time AND a.status != 'cancelled' AND a.status != 'completed'`;
      } else if (status === 'upcoming') {
        condition += ` AND NOW() < a.start_time AND a.status != 'cancelled' AND a.status != 'completed'`;
      } else if (status === 'completed') {
        condition += ` AND (NOW() > a.end_time OR a.status = 'completed') AND a.status != 'cancelled'`;
      } else if (status === 'cancelled') {
        condition += ` AND a.status = 'cancelled'`;
      }
    }

    const auctionsRes = await query(`
      SELECT 
        a.id, a.title, a.description, a.category, a.starting_bid, a.current_bid,
        a.bid_increment, a.status, a.image_url, a.images, a.start_time, a.end_time,
        a.winner_id, a.winning_price, a.created_at,
        w.name as winner_name, w.email as winner_email,
        (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) as total_bids
      FROM auctions a
      LEFT JOIN users w ON a.winner_id = w.id
      ${condition}
      ORDER BY a.created_at DESC;
    `, params);

    res.status(200).json({
      success: true,
      auctions: auctionsRes.rows,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/seller/bids - Bid history on seller's items
const getSellerBids = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const bidsRes = await query(`
      SELECT 
        b.id, b.amount, b.created_at,
        a.id as auction_id, a.title as auction_title, a.current_bid, a.status as auction_status,
        u.name as bidder_name, u.email as bidder_email
      FROM bids b
      JOIN auctions a ON b.auction_id = a.id
      JOIN users u ON b.bidder_id = u.id
      WHERE a.seller_id = $1
      ORDER BY b.created_at DESC
      LIMIT 100;
    `, [userId]);

    res.status(200).json({
      success: true,
      bids: bidsRes.rows,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/seller/winners - Concluded auctions and winner details
const getSellerWinners = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const winnersRes = await query(`
      SELECT 
        a.id as auction_id, a.title as auction_title, a.category, a.end_time,
        a.starting_bid, a.winning_price,
        w.id as winner_id, w.name as winner_name, w.email as winner_email, w.phone as winner_phone
      FROM auctions a
      JOIN users w ON a.winner_id = w.id
      WHERE a.seller_id = $1 AND a.winner_id IS NOT NULL
      ORDER BY a.end_time DESC;
    `, [userId]);

    res.status(200).json({
      success: true,
      winners: winnersRes.rows,
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
  updateProfile,
  changePassword,
  updateSettings,
  getBuyerDashboard,
  getBuyerBids,
  getBuyerWon,
  getBuyerLost,
  getSellerDashboard,
  getSellerAuctions,
  getSellerBids,
  getSellerWinners,
  placeBid,
};
