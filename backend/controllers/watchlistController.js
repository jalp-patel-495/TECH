const { query } = require('../config/db');

// GET /api/watchlist
const getWatchlist = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const watchlistRes = await query(`
      SELECT 
        w.id as watchlist_id, w.created_at as saved_at,
        a.id, a.title, a.description, a.category, a.starting_bid, a.current_bid,
        a.bid_increment, a.image_url, a.images, a.start_time, a.end_time, a.status,
        u.name as seller_name,
        (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) as total_bids,
        CASE 
          WHEN a.status = 'cancelled' THEN 'cancelled'
          WHEN a.status = 'completed' OR NOW() > a.end_time THEN 'completed'
          WHEN NOW() < a.start_time THEN 'upcoming'
          ELSE 'live'
        END as computed_status
      FROM watchlist w
      JOIN auctions a ON w.auction_id = a.id
      JOIN users u ON a.seller_id = u.id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC;
    `, [userId]);

    res.status(200).json({
      success: true,
      watchlist: watchlistRes.rows,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/watchlist/:auctionId - Toggle add / remove
const toggleWatchlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const auctionId = parseInt(req.params.auctionId, 10);

    const checkRes = await query(`SELECT id FROM watchlist WHERE user_id = $1 AND auction_id = $2;`, [userId, auctionId]);

    if (checkRes.rows.length > 0) {
      // Remove
      await query(`DELETE FROM watchlist WHERE user_id = $1 AND auction_id = $2;`, [userId, auctionId]);
      return res.status(200).json({
        success: true,
        isWatchlisted: false,
        message: 'Removed from your watchlist.',
      });
    } else {
      // Add
      await query(`INSERT INTO watchlist (user_id, auction_id) VALUES ($1, $2);`, [userId, auctionId]);
      return res.status(200).json({
        success: true,
        isWatchlisted: true,
        message: 'Saved to your watchlist.',
      });
    }
  } catch (error) {
    next(error);
  }
};

// GET /api/watchlist/check/:auctionId
const checkWatchlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const auctionId = parseInt(req.params.auctionId, 10);

    const checkRes = await query(`SELECT id FROM watchlist WHERE user_id = $1 AND auction_id = $2;`, [userId, auctionId]);
    res.status(200).json({
      success: true,
      isWatchlisted: checkRes.rows.length > 0,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWatchlist,
  toggleWatchlist,
  checkWatchlist,
};
