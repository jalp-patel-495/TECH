const { getAllUsers, getUserStats } = require('../models/userModel');
const { query, checkDbConnection } = require('../config/db');
const { cache } = require('../config/redis');

// GET /api/admin/overview
const getAdminOverview = async (req, res, next) => {
  try {
    const stats = await getUserStats();
    const users = await getAllUsers(20);

    // Get live auction metrics
    const auctionMetricsRes = await query(`
      SELECT 
        COUNT(*) AS total_auctions,
        COUNT(*) FILTER (WHERE status = 'active') AS active_auctions,
        COUNT(*) FILTER (WHERE status = 'ended') AS ended_auctions,
        COALESCE(SUM(current_bid), 0) AS total_auction_volume
      FROM auctions;
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
          endedAuctions: parseInt(auctionMetricsRes.rows[0].ended_auctions, 10),
          totalVolume: parseFloat(auctionMetricsRes.rows[0].total_auction_volume).toFixed(2),
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

// GET /api/admin/users
const getAdminUsers = async (req, res, next) => {
  try {
    const users = await getAllUsers(100);
    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminOverview,
  getAdminUsers,
};
