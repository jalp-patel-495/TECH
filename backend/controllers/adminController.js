const { getAllUsers, getUserStats } = require('../models/userModel');
const { query, checkDbConnection } = require('../config/db');
const { cache } = require('../config/redis');

// GET /api/admin/overview
const getAdminOverview = async (req, res, next) => {
  try {
    const stats = await getUserStats();
    const users = await getAllUsers(10);

    // Get live auction metrics
    const auctionMetricsRes = await query(`
      SELECT 
        COUNT(*) AS total_auctions,
        COUNT(*) FILTER (WHERE status = 'live' OR (status = 'active' AND NOW() <= end_time)) AS active_auctions,
        COUNT(*) FILTER (WHERE status = 'upcoming' OR (NOW() < start_time AND status != 'cancelled')) AS upcoming_auctions,
        COUNT(*) FILTER (WHERE status = 'completed' OR NOW() > end_time) AS completed_auctions,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_auctions,
        COALESCE(SUM(current_bid), 0) AS total_auction_volume,
        COALESCE(SUM(winning_price), 0) AS total_realized_sales
      FROM auctions;
    `);

    // Total bids count
    const bidsCountRes = await query(`
      SELECT 
        COUNT(*) as total_bids,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted_bids,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_bids
      FROM bid_logs;
    `);

    const dbHealth = await checkDbConnection();
    const redisHealth = cache.getStatus();

    res.status(200).json({
      success: true,
      adminOverview: {
        userMetrics: {
          totalUsers: parseInt(stats.total_users, 10),
          admins: parseInt(stats.admin_count, 10),
          sellers: parseInt(stats.seller_count, 10),
          buyers: parseInt(stats.buyer_count, 10),
          totalEscrow: parseFloat(stats.total_escrow_balance).toFixed(2),
        },
        auctionMetrics: {
          totalAuctions: parseInt(auctionMetricsRes.rows[0].total_auctions, 10),
          activeAuctions: parseInt(auctionMetricsRes.rows[0].active_auctions, 10),
          upcomingAuctions: parseInt(auctionMetricsRes.rows[0].upcoming_auctions, 10),
          completedAuctions: parseInt(auctionMetricsRes.rows[0].completed_auctions, 10),
          cancelledAuctions: parseInt(auctionMetricsRes.rows[0].cancelled_auctions, 10),
          totalVolume: parseFloat(auctionMetricsRes.rows[0].total_auction_volume).toFixed(2),
          totalSales: parseFloat(auctionMetricsRes.rows[0].total_realized_sales).toFixed(2),
        },
        bidMetrics: {
          totalBids: parseInt(bidsCountRes.rows[0].total_bids || 0, 10),
          acceptedBids: parseInt(bidsCountRes.rows[0].accepted_bids || 0, 10),
          rejectedBids: parseInt(bidsCountRes.rows[0].rejected_bids || 0, 10),
        },
        infrastructure: {
          postgresql: dbHealth,
          redis: redisHealth,
          serverUptime: process.uptime(),
        },
        recentUsers: users,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/users - Query with role filter, search & pagination
const getAdminUsers = async (req, res, next) => {
  try {
    const { role = 'all', search = '', page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];
    let pIdx = 1;

    if (role && role !== 'all') {
      conditions.push(`role = $${pIdx}`);
      params.push(role);
      pIdx++;
    }

    if (search.trim()) {
      conditions.push(`(name ILIKE $${pIdx} OR email ILIKE $${pIdx})`);
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) as total FROM users ${whereClause};`, params);
    const total = parseInt(countRes.rows[0].total, 10);

    const usersRes = await query(`
      SELECT id, name, email, role, balance, is_active, avatar_url, created_at,
             (SELECT COUNT(*) FROM auctions WHERE seller_id = users.id) as listings_count,
             (SELECT COUNT(*) FROM bids WHERE bidder_id = users.id) as bids_count
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${pIdx} OFFSET $${pIdx + 1};
    `, [...params, limitNum, offset]);

    res.status(200).json({
      success: true,
      users: usersRes.rows,
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

// PUT /api/admin/users/:id/status - Toggle activate/deactivate
const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const targetUser = await query(`SELECT id, role, is_active FROM users WHERE id = $1;`, [id]);
    if (targetUser.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Do not allow deactivating the main admin
    if (targetUser.rows[0].role === 'admin' && isActive === false) {
      return res.status(400).json({ success: false, message: 'Administrator accounts cannot be deactivated.' });
    }

    const updated = await query(`
      UPDATE users
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, name, email, role, is_active;
    `, [isActive, id]);

    res.status(200).json({
      success: true,
      message: `User account has been ${isActive ? 'activated' : 'deactivated'} successfully.`,
      user: updated.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/auctions - All auctions with status filter
const getAdminAuctions = async (req, res, next) => {
  try {
    const { status = 'all', search = '', page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];
    let pIdx = 1;

    if (status && status !== 'all') {
      if (status === 'live') {
        conditions.push(`NOW() >= a.start_time AND NOW() <= a.end_time AND a.status != 'cancelled' AND a.status != 'completed'`);
      } else if (status === 'upcoming') {
        conditions.push(`NOW() < a.start_time AND a.status != 'cancelled' AND a.status != 'completed'`);
      } else if (status === 'completed') {
        conditions.push(`(NOW() > a.end_time OR a.status = 'completed') AND a.status != 'cancelled'`);
      } else if (status === 'cancelled') {
        conditions.push(`a.status = 'cancelled'`);
      }
    }

    if (search.trim()) {
      conditions.push(`(a.title ILIKE $${pIdx} OR a.category ILIKE $${pIdx} OR u.name ILIKE $${pIdx})`);
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`
      SELECT COUNT(*) as total 
      FROM auctions a 
      JOIN users u ON a.seller_id = u.id 
      ${whereClause};
    `, params);

    const total = parseInt(countRes.rows[0].total, 10);

    const auctionsRes = await query(`
      SELECT 
        a.id, a.title, a.category, a.starting_bid, a.current_bid, a.bid_increment,
        a.start_time, a.end_time, a.status, a.image_url, a.winner_id, a.winning_price,
        u.id as seller_id, u.name as seller_name, u.email as seller_email,
        w.name as winner_name, w.email as winner_email,
        (SELECT COUNT(*) FROM bids WHERE auction_id = a.id) as total_bids,
        CASE 
          WHEN a.status = 'cancelled' THEN 'cancelled'
          WHEN a.status = 'completed' OR NOW() > a.end_time THEN 'completed'
          WHEN NOW() < a.start_time THEN 'upcoming'
          ELSE 'live'
        END as computed_status
      FROM auctions a
      JOIN users u ON a.seller_id = u.id
      LEFT JOIN users w ON a.winner_id = w.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${pIdx} OFFSET $${pIdx + 1};
    `, [...params, limitNum, offset]);

    res.status(200).json({
      success: true,
      auctions: auctionsRes.rows,
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

// GET /api/admin/bids - Full bid logs (Accepted & Rejected)
const getAdminBids = async (req, res, next) => {
  try {
    const { status = 'all', page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    let condition = '';
    const params = [];

    if (status && status !== 'all') {
      condition = `WHERE bl.status = $1`;
      params.push(status);
    }

    const countRes = await query(`SELECT COUNT(*) as total FROM bid_logs bl ${condition};`, params);
    const total = parseInt(countRes.rows[0].total, 10);

    const pIdx = params.length + 1;
    const bidsRes = await query(`
      SELECT 
        bl.id, bl.auction_id, bl.bidder_id, bl.amount, bl.status, bl.reason, bl.created_at,
        a.title as auction_title, a.current_bid,
        u.name as bidder_name, u.email as bidder_email
      FROM bid_logs bl
      JOIN auctions a ON bl.auction_id = a.id
      JOIN users u ON bl.bidder_id = u.id
      ${condition}
      ORDER BY bl.created_at DESC
      LIMIT $${pIdx} OFFSET $${pIdx + 1};
    `, [...params, limitNum, offset]);

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

// GET /api/admin/winners - Winner Management
const getAdminWinners = async (req, res, next) => {
  try {
    const winnersRes = await query(`
      SELECT 
        a.id as auction_id, a.title as auction_title, a.category, a.end_time,
        a.starting_bid, a.winning_price, a.winner_id,
        w.name as winner_name, w.email as winner_email,
        s.name as seller_name, s.email as seller_email
      FROM auctions a
      JOIN users w ON a.winner_id = w.id
      JOIN users s ON a.seller_id = s.id
      WHERE a.winner_id IS NOT NULL
      ORDER BY a.end_time DESC;
    `);

    res.status(200).json({
      success: true,
      winners: winnersRes.rows,
    });
  } catch (error) {
    next(error);
  }
};

// Category Management CRUD
// POST /api/admin/categories
const createCategory = async (req, res, next) => {
  try {
    const { name, icon = 'Tag', description = '' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const insertRes = await query(`
      INSERT INTO categories (name, slug, icon, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `, [name.trim(), slug, icon, description]);

    res.status(201).json({
      success: true,
      message: 'Category created successfully!',
      category: insertRes.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'A category with this name already exists.' });
    }
    next(error);
  }
};

// PUT /api/admin/categories/:id
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, icon, description } = req.body;

    const slug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : undefined;

    const updateRes = await query(`
      UPDATE categories
      SET 
        name = COALESCE($1, name),
        slug = COALESCE($2, slug),
        icon = COALESCE($3, icon),
        description = COALESCE($4, description)
      WHERE id = $5
      RETURNING *;
    `, [name ? name.trim() : null, slug, icon, description, id]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Category updated successfully!',
      category: updateRes.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/admin/categories/:id
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const delRes = await query(`DELETE FROM categories WHERE id = $1 RETURNING id, name;`, [id]);

    if (delRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    res.status(200).json({
      success: true,
      message: `Category "${delRes.rows[0].name}" deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/reports - Analytics & Platform Reports
const getAdminReports = async (req, res, next) => {
  try {
    // 1. Category performance
    const catPerfRes = await query(`
      SELECT 
        a.category,
        COUNT(a.id) as total_auctions,
        COALESCE(SUM(a.current_bid), 0) as gross_volume,
        COUNT(b.id) as total_bids
      FROM auctions a
      LEFT JOIN bids b ON a.id = b.auction_id
      GROUP BY a.category
      ORDER BY gross_volume DESC;
    `);

    // 2. Daily bidding velocity (past 7 days)
    const dailyVelocityRes = await query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') as day,
        COUNT(*) as bid_count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM bids
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY day
      ORDER BY day ASC;
    `);

    // 3. User signup trend (past 7 days)
    const userGrowthRes = await query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') as day,
        COUNT(*) as new_users
      FROM users
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY day
      ORDER BY day ASC;
    `);

    // 4. Top active sellers
    const topSellersRes = await query(`
      SELECT 
        u.id, u.name, u.email,
        COUNT(a.id) as listings_count,
        COALESCE(SUM(a.winning_price), 0) as sales_volume
      FROM users u
      JOIN auctions a ON u.id = a.seller_id
      GROUP BY u.id, u.name, u.email
      ORDER BY sales_volume DESC
      LIMIT 5;
    `);

    // 5. Top buyers
    const topBuyersRes = await query(`
      SELECT 
        u.id, u.name, u.email,
        COUNT(a.id) as won_count,
        COALESCE(SUM(a.winning_price), 0) as spent_volume
      FROM users u
      JOIN auctions a ON u.id = a.winner_id
      GROUP BY u.id, u.name, u.email
      ORDER BY spent_volume DESC
      LIMIT 5;
    `);

    res.status(200).json({
      success: true,
      reports: {
        categoryPerformance: catPerfRes.rows,
        dailyVelocity: dailyVelocityRes.rows,
        userGrowth: userGrowthRes.rows,
        topSellers: topSellersRes.rows,
        topBuyers: topBuyersRes.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminOverview,
  getAdminUsers,
  toggleUserStatus,
  getAdminAuctions,
  getAdminBids,
  getAdminWinners,
  createCategory,
  updateCategory,
  deleteCategory,
  getAdminReports,
};
