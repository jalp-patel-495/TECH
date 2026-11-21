const { query } = require('../config/db');

const updateSchemaPart3 = async () => {
  console.log('[Migration Part 3] Adding winner tracking columns and performance indexes...');
  try {
    await query(`
      ALTER TABLE auctions
      ADD COLUMN IF NOT EXISTS winner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS winning_price NUMERIC(12, 2);
    `);

    // Performance index for concurrent bid queries
    await query(`
      CREATE INDEX IF NOT EXISTS idx_bids_auction_amount ON bids (auction_id, amount DESC);
      CREATE INDEX IF NOT EXISTS idx_auctions_status_endtime ON auctions (status, end_time);
    `);

    console.log('[Migration Part 3] Winner columns and indexes verified successfully.');
  } catch (err) {
    console.error('[Migration Part 3 Error]', err.message);
    throw err;
  }
};

if (require.main === module) {
  updateSchemaPart3()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = updateSchemaPart3;
