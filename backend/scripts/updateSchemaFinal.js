const { query } = require('../config/db');

const updateSchemaFinal = async () => {
  console.log('[Migration Final] Upgrading schema for Complete Admin, Seller, Buyer, Notifications & Watchlist...');

  try {
    // 1. Add fields to users table: is_active, phone, bio, preferences
    await query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS bio TEXT,
      ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"emailNotifications": true, "bidAlerts": true, "outbidAlerts": true, "theme": "dark", "currency": "USD"}'::JSONB;
    `);
    console.log('[Migration Final] Users table updated with is_active, phone, bio, preferences.');

    // 2. Watchlist table
    await query(`
      CREATE TABLE IF NOT EXISTS watchlist (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        auction_id INTEGER REFERENCES auctions(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, auction_id)
      );
      CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
    `);
    console.log('[Migration Final] Watchlist table verified.');

    // 3. Notifications table
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(150) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'system',
        is_read BOOLEAN DEFAULT FALSE,
        link VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
    `);
    console.log('[Migration Final] Notifications table verified.');

    // 4. Bid logs table (for auditing accepted and rejected bids)
    await query(`
      CREATE TABLE IF NOT EXISTS bid_logs (
        id SERIAL PRIMARY KEY,
        auction_id INTEGER REFERENCES auctions(id) ON DELETE CASCADE,
        bidder_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC(12, 2) NOT NULL,
        status VARCHAR(20) NOT NULL, -- 'accepted', 'rejected'
        reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_bid_logs_auction ON bid_logs(auction_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_bid_logs_bidder ON bid_logs(bidder_id, created_at DESC);
    `);
    console.log('[Migration Final] Bid logs table verified.');

    // 5. Backfill existing bids into bid_logs as accepted
    await query(`
      INSERT INTO bid_logs (auction_id, bidder_id, amount, status, reason, created_at)
      SELECT b.auction_id, b.bidder_id, b.amount, 'accepted', 'Bid successfully placed on live auction', b.created_at
      FROM bids b
      WHERE NOT EXISTS (
        SELECT 1 FROM bid_logs bl WHERE bl.auction_id = b.auction_id AND bl.bidder_id = b.bidder_id AND bl.amount = b.amount
      );
    `);

    // 6. Seed initial welcoming notification for existing users if none exist
    const usersRes = await query(`SELECT id FROM users;`);
    for (const u of usersRes.rows) {
      await query(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES ($1, 'Welcome to LIVEBID Matrix', 'Your account is verified and ready for live competitive bidding.', 'system', '/auctions')
        ON CONFLICT DO NOTHING;
      `, [u.id]);
    }
    console.log('[Migration Final] Welcome notifications seeded.');

    console.log('[Migration Final] All schema additions completed successfully!');
  } catch (err) {
    console.error('[Migration Final Error]', err);
    throw err;
  }
};

if (require.main === module) {
  updateSchemaFinal()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = updateSchemaFinal;
