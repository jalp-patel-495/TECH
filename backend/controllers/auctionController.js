const { query } = require('../config/db');
const { closeExpiredAuctions } = require('../services/auctionEngine');

/**
 * Helper to compute status expression in SQL
 */
const STATUS_SQL_EXPR = `
  CASE 
    WHEN a.status = 'cancelled' THEN 'cancelled'
    WHEN a.status = 'completed' THEN 'completed'
    WHEN NOW() < a.start_time THEN 'upcoming'
    WHEN NOW() > a.end_time THEN 'completed'
    ELSE 'live'
  END
`;

// GET /api/auctions - Search, Filter, Sort, Paginate
const getAuctions = async (req, res, next) => {
  try {
    const {
      search = '',
      category = 'All',
      status = 'all',
      minPrice,
      maxPrice,
      sortBy = 'endingSoon',
      page = 1,
      limit = 9,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Search query in title & description
    if (search.trim()) {
      conditions.push(`(a.title ILIKE $${paramIndex} OR a.description ILIKE $${paramIndex})`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    // Category filter
    if (category && category !== 'All') {
      conditions.push(`a.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    // Status filter
    if (status && status !== 'all') {
      const lowerStatus = status.toLowerCase();
      if (lowerStatus === 'upcoming') {
        conditions.push(`NOW() < a.start_time AND a.status != 'cancelled' AND a.status != 'completed'`);
      } else if (lowerStatus === 'live') {
        conditions.push(`NOW() >= a.start_time AND NOW() <= a.end_time AND a.status != 'cancelled' AND a.status != 'completed'`);
      } else if (lowerStatus === 'completed') {
        conditions.push(`(NOW() > a.end_time OR a.status = 'completed') AND a.status != 'cancelled'`);
      } else if (lowerStatus === 'cancelled') {
        conditions.push(`a.status = 'cancelled'`);
      }
    }

    // Price range filters
    if (minPrice && !isNaN(minPrice)) {
      conditions.push(`a.current_bid >= $${paramIndex}`);
      params.push(parseFloat(minPrice));
      paramIndex++;
    }
    if (maxPrice && !isNaN(maxPrice)) {
      conditions.push(`a.current_bid <= $${paramIndex}`);
      params.push(parseFloat(maxPrice));
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sorting expression
    let orderClause = 'ORDER BY a.end_time ASC';
    switch (sortBy) {
      case 'newest':
        orderClause = 'ORDER BY a.created_at DESC';
        break;
      case 'priceAsc':
        orderClause = 'ORDER BY a.current_bid ASC';
        break;
      case 'priceDesc':
        orderClause = 'ORDER BY a.current_bid DESC';
        break;
      case 'popular':
        orderClause = 'ORDER BY total_bids DESC, a.current_bid DESC';
        break;
      case 'endingSoon':
      default:
        orderClause = `
          ORDER BY 
            CASE WHEN ${STATUS_SQL_EXPR} = 'live' THEN 1 WHEN ${STATUS_SQL_EXPR} = 'upcoming' THEN 2 ELSE 3 END,
            a.end_time ASC
        `;
        break;
    }

    // Count total matching
    const countSql = `
      SELECT COUNT(*) as total
      FROM auctions a
      ${whereClause};
    `;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0].total, 10);
    const totalPages = Math.ceil(total / limitNum) || 1;

    // Fetch data slice
    const dataSql = `
      SELECT 
        a.id, a.title, a.description, a.category, 
        a.starting_bid, a.current_bid, a.bid_increment,
        a.image_url, a.images, a.seller_id,
        a.start_time, a.end_time, a.created_at,
        a.winner_id, a.winning_price,
        ${STATUS_SQL_EXPR} AS computed_status,
        u.name as seller_name, u.email as seller_email,
        w.name as winner_name,
        COALESCE(b_count.cnt, 0) AS total_bids
      FROM auctions a
      LEFT JOIN users u ON a.seller_id = u.id
      LEFT JOIN users w ON a.winner_id = w.id
      LEFT JOIN (
        SELECT auction_id, COUNT(*) as cnt 
        FROM bids 
        GROUP BY auction_id
      ) b_count ON b_count.auction_id = a.id
      ${whereClause}
      ${orderClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
    `;

    const dataRes = await query(dataSql, [...params, limitNum, offset]);

    res.status(200).json({
      success: true,
      auctions: dataRes.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auctions/:id - Full details + bid history + winner
const getAuctionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // First ensure expired auctions are settled
    if (req.app.get('io')) {
      await closeExpiredAuctions(req.app.get('io'));
    }

    const auctionSql = `
      SELECT 
        a.id, a.title, a.description, a.category, 
        a.starting_bid, a.current_bid, a.bid_increment, a.reserve_price,
        a.image_url, a.images, a.seller_id,
        a.start_time, a.end_time, a.created_at, a.updated_at,
        a.winner_id, a.winning_price,
        ${STATUS_SQL_EXPR} AS computed_status,
        u.name as seller_name, u.email as seller_email, u.created_at as seller_joined,
        w.name as winner_name, w.email as winner_email,
        (SELECT COUNT(*) FROM bids WHERE auction_id = a.id) as total_bids
      FROM auctions a
      LEFT JOIN users u ON a.seller_id = u.id
      LEFT JOIN users w ON a.winner_id = w.id
      WHERE a.id = $1;
    `;
    const auctionRes = await query(auctionSql, [id]);

    if (auctionRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Auction lot not found.' });
    }

    const auction = auctionRes.rows[0];

    // Fetch bid history for this auction
    const bidsSql = `
      SELECT 
        b.id, b.amount, b.created_at,
        u.name as bidder_name,
        u.id as bidder_id
      FROM bids b
      JOIN users u ON b.bidder_id = u.id
      WHERE b.auction_id = $1
      ORDER BY b.amount DESC, b.created_at DESC
      LIMIT 25;
    `;
    const bidsRes = await query(bidsSql, [id]);

    const formattedBids = bidsRes.rows.map((b) => {
      const parts = b.bidder_name.split(' ');
      const masked = parts.length > 1 ? `${parts[0]} ${parts[1].charAt(0)}.` : parts[0];
      return {
        ...b,
        bidder_masked_name: masked,
      };
    });

    const isClosed = auction.computed_status === 'completed' || new Date() > new Date(auction.end_time);

    res.status(200).json({
      success: true,
      auction: {
        ...auction,
        bids: formattedBids,
        next_min_bid: (parseFloat(auction.current_bid) + parseFloat(auction.bid_increment || 10)).toFixed(2),
        isClosed,
        hasWinner: !!auction.winner_id,
        winner: auction.winner_id ? {
          id: auction.winner_id,
          name: auction.winner_name,
          email: auction.winner_email,
          price: auction.winning_price || auction.current_bid,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auctions - Create New Auction (Seller / Admin)
const createAuction = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category = 'Electronics & Gadgets',
      starting_bid = 100.0,
      bid_increment = 10.0,
      start_time,
      end_time,
      images = [],
      image_url,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Product title and description are required.' });
    }

    if (!end_time) {
      return res.status(400).json({ success: false, message: 'Auction end time is required.' });
    }

    const parsedStart = start_time ? new Date(start_time) : new Date();
    const parsedEnd = new Date(end_time);

    if (isNaN(parsedEnd.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid end time format.' });
    }

    if (parsedEnd <= parsedStart) {
      return res.status(400).json({ success: false, message: 'Auction end time must occur after the start time.' });
    }

    const startPrice = parseFloat(starting_bid) || 100.0;
    const increment = parseFloat(bid_increment) || 10.0;

    const imageList = Array.isArray(images) && images.length > 0 
      ? images 
      : [image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'];
    const primaryImage = image_url || imageList[0];

    const initialStatus = new Date() < parsedStart ? 'upcoming' : 'live';

    const insertSql = `
      INSERT INTO auctions (
        title, description, category, starting_bid, current_bid, 
        bid_increment, status, image_url, images, seller_id, 
        start_time, end_time
      )
      VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    const insertRes = await query(insertSql, [
      title.trim(),
      description.trim(),
      category,
      startPrice,
      increment,
      initialStatus,
      primaryImage,
      imageList,
      req.user.id,
      parsedStart,
      parsedEnd,
    ]);

    const createdAuction = insertRes.rows[0];

    // Emit real-time notification
    if (req.app.get('io')) {
      req.app.get('io').emit('new_auction', {
        id: createdAuction.id,
        title: createdAuction.title,
        current_bid: createdAuction.current_bid,
        category: createdAuction.category,
        image_url: createdAuction.image_url,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Auction created successfully!',
      auction: createdAuction,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/auctions/:id - Edit Auction (Owner Seller or Admin)
const updateAuction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      category,
      bid_increment,
      end_time,
      images,
      image_url,
      status,
    } = req.body;

    const checkRes = await query('SELECT * FROM auctions WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Auction lot not found.' });
    }

    const auction = checkRes.rows[0];

    if (auction.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only edit auctions that you have listed.',
      });
    }

    const updates = [];
    const params = [id];
    let idx = 2;

    if (title) {
      updates.push(`title = $${idx++}`);
      params.push(title.trim());
    }
    if (description) {
      updates.push(`description = $${idx++}`);
      params.push(description.trim());
    }
    if (category) {
      updates.push(`category = $${idx++}`);
      params.push(category);
    }
    if (bid_increment) {
      updates.push(`bid_increment = $${idx++}`);
      params.push(parseFloat(bid_increment));
    }
    if (end_time) {
      updates.push(`end_time = $${idx++}`);
      params.push(new Date(end_time));
    }
    if (status) {
      updates.push(`status = $${idx++}`);
      params.push(status);
    }
    if (images && Array.isArray(images)) {
      updates.push(`images = $${idx++}`);
      params.push(images);
      if (images.length > 0) {
        updates.push(`image_url = $${idx++}`);
        params.push(images[0]);
      }
    } else if (image_url) {
      updates.push(`image_url = $${idx++}`);
      params.push(image_url);
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      return res.status(400).json({ success: false, message: 'No fields provided for update.' });
    }

    const updateSql = `
      UPDATE auctions
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *;
    `;
    const updateRes = await query(updateSql, params);

    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').to(`auction_${id}`).emit('auction_updated', {
        id,
        updatedFields: req.body,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Auction updated successfully!',
      auction: updateRes.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/auctions/:id - Delete or Cancel Auction (Owner Seller or Admin)
const deleteAuction = async (req, res, next) => {
  try {
    const { id } = req.params;

    const checkRes = await query('SELECT * FROM auctions WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Auction not found' });
    }

    const auction = checkRes.rows[0];

    if (auction.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to delete this auction.',
      });
    }

    const bidsRes = await query('SELECT COUNT(*) as count FROM bids WHERE auction_id = $1', [id]);
    const bidCount = parseInt(bidsRes.rows[0].count, 10);

    if (bidCount > 0) {
      await query(`UPDATE auctions SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [id]);
      
      if (req.app.get('io')) {
        req.app.get('io').to(`auction_${id}`).emit('auction_closed', {
          auctionId: id,
          status: 'cancelled',
          message: 'This auction has been cancelled by the seller.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Auction had active bids and has been safely marked as Cancelled.',
        cancelled: true,
      });
    } else {
      await query('DELETE FROM auctions WHERE id = $1', [id]);
      return res.status(200).json({
        success: true,
        message: 'Auction deleted permanently.',
        deleted: true,
      });
    }
  } catch (error) {
    next(error);
  }
};

// POST /api/auctions/upload - Handle Product Image Upload
const uploadImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No image files uploaded.' });
    }

    const host = req.get('host');
    const protocol = req.protocol;

    const uploadedUrls = req.files.map((file) => {
      return `${protocol}://${host}/uploads/${file.filename}`;
    });

    res.status(200).json({
      success: true,
      message: `${uploadedUrls.length} image(s) uploaded successfully.`,
      images: uploadedUrls,
      primaryImage: uploadedUrls[0],
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auctions/seller/my-auctions - Get current seller's auctions
const getMyAuctions = async (req, res, next) => {
  try {
    const sellerId = req.user.id;
    const { status = 'all', search = '' } = req.query;

    const conditions = ['a.seller_id = $1'];
    const params = [sellerId];
    let idx = 2;

    if (search.trim()) {
      conditions.push(`(a.title ILIKE $${idx} OR a.category ILIKE $${idx})`);
      params.push(`%${search.trim()}%`);
      idx++;
    }

    if (status && status !== 'all') {
      const lower = status.toLowerCase();
      if (lower === 'upcoming') {
        conditions.push(`NOW() < a.start_time AND a.status != 'cancelled' AND a.status != 'completed'`);
      } else if (lower === 'live') {
        conditions.push(`NOW() >= a.start_time AND NOW() <= a.end_time AND a.status != 'cancelled' AND a.status != 'completed'`);
      } else if (lower === 'completed') {
        conditions.push(`(NOW() > a.end_time OR a.status = 'completed') AND a.status != 'cancelled'`);
      } else if (lower === 'cancelled') {
        conditions.push(`a.status = 'cancelled'`);
      }
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const sql = `
      SELECT 
        a.id, a.title, a.category, a.starting_bid, a.current_bid, a.bid_increment,
        a.status, a.image_url, a.images, a.start_time, a.end_time, a.created_at,
        a.winner_id, a.winning_price,
        ${STATUS_SQL_EXPR} AS computed_status,
        w.name as winner_name,
        (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) as total_bids
      FROM auctions a
      LEFT JOIN users w ON a.winner_id = w.id
      ${whereClause}
      ORDER BY a.created_at DESC;
    `;

    const result = await query(sql, params);

    // Get live status breakdown for this seller
    const statsSql = `
      SELECT 
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE NOW() >= start_time AND NOW() <= end_time AND status != 'cancelled' AND status != 'completed') as live_count,
        COUNT(*) FILTER (WHERE NOW() < start_time AND status != 'cancelled' AND status != 'completed') as upcoming_count,
        COUNT(*) FILTER (WHERE (NOW() > end_time OR status = 'completed') AND status != 'cancelled') as completed_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        COALESCE(SUM(COALESCE(winning_price, current_bid)), 0) as total_revenue
      FROM auctions
      WHERE seller_id = $1;
    `;
    const statsRes = await query(statsSql, [sellerId]);

    res.status(200).json({
      success: true,
      myAuctions: result.rows,
      summary: statsRes.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/categories - All auction categories with active auction count
const getCategories = async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        c.id, c.name, c.slug, c.icon, c.description,
        COUNT(a.id) as active_auction_count
      FROM categories c
      LEFT JOIN auctions a ON a.category = c.name AND NOW() >= a.start_time AND NOW() <= a.end_time AND a.status != 'cancelled' AND a.status != 'completed'
      GROUP BY c.id, c.name, c.slug, c.icon, c.description
      ORDER BY c.id ASC;
    `;
    const result = await query(sql);

    res.status(200).json({
      success: true,
      categories: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuctions,
  getAuctionById,
  createAuction,
  updateAuction,
  deleteAuction,
  uploadImages,
  getMyAuctions,
  getCategories,
};
