const { query } = require('../config/db');
const bcrypt = require('bcryptjs');

const initDatabase = async () => {
  console.log('[Init DB] Starting schema migration...');

  try {
    // 1. Create Users Table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'buyer' CHECK (role IN ('admin', 'seller', 'buyer')),
        balance NUMERIC(12, 2) DEFAULT 1000.00,
        avatar_url VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[Init DB] Table "users" verified.');

    // 2. Create Auctions Table (for real-time auction platform preview & actions)
    await query(`
      CREATE TABLE IF NOT EXISTS auctions (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        category VARCHAR(50) DEFAULT 'Electronics',
        starting_bid NUMERIC(12, 2) NOT NULL DEFAULT 100.00,
        current_bid NUMERIC(12, 2) NOT NULL DEFAULT 100.00,
        reserve_price NUMERIC(12, 2) DEFAULT 0.00,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'ended', 'cancelled')),
        image_url TEXT,
        seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[Init DB] Table "auctions" verified.');

    // 3. Create Bids Table
    await query(`
      CREATE TABLE IF NOT EXISTS bids (
        id SERIAL PRIMARY KEY,
        auction_id INTEGER REFERENCES auctions(id) ON DELETE CASCADE,
        bidder_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC(12, 2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[Init DB] Table "bids" verified.');

    // 4. Seed Seed Users for Instant Testing (Admin, Seller, Buyer)
    const salt = await bcrypt.genSalt(10);
    const adminPw = await bcrypt.hash('Admin123!', salt);
    const sellerPw = await bcrypt.hash('Seller123!', salt);
    const buyerPw = await bcrypt.hash('Buyer123!', salt);

    const seedUsers = [
      { name: 'Admin Master', email: 'admin@auction.com', password: adminPw, role: 'admin', balance: 50000.0 },
      { name: 'Apex Seller', email: 'seller@auction.com', password: sellerPw, role: 'seller', balance: 12500.0 },
      { name: 'Pro Buyer', email: 'buyer@auction.com', password: buyerPw, role: 'buyer', balance: 3500.0 },
    ];

    for (const u of seedUsers) {
      await query(`
        INSERT INTO users (name, email, password, role, balance)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role;
      `, [u.name, u.email, u.password, u.role, u.balance]);
    }
    console.log('[Init DB] Seed users verified (Admin, Seller, Buyer).');

    // 5. Seed Featured Live Auctions
    const sellerRes = await query(`SELECT id FROM users WHERE role = 'seller' LIMIT 1;`);
    const sellerId = sellerRes.rows[0]?.id || 1;

    const seedAuctions = [
      {
        title: 'Vintage Rolex Submariner 1982 Matte Dial',
        description: 'Exquisite collector timepiece with all matching original tritium dial and oyster bracelet.',
        category: 'Luxury Watches',
        starting_bid: 4500.00,
        current_bid: 6850.00,
        image_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
        seller_id: sellerId,
        end_time: new Date(Date.now() + 2 * 3600 * 1000), // 2 hours from now
      },
      {
        title: 'CyberBlade Pro X9 Ultra Gaming Station',
        description: 'Liquid-cooled custom rig with RTX 4090, 64GB DDR5 RAM, and 4TB NVMe SSD.',
        category: 'Electronics',
        starting_bid: 2200.00,
        current_bid: 3100.00,
        image_url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=800&q=80',
        seller_id: sellerId,
        end_time: new Date(Date.now() + 5 * 3600 * 1000), // 5 hours from now
      },
      {
        title: '1967 Shelby GT500 Die-Cast Museum Replica 1:8',
        description: 'Handcrafted limited edition diecast automobile model signed by legendary restoration artists.',
        category: 'Collectibles',
        starting_bid: 800.00,
        current_bid: 1250.00,
        image_url: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80',
        seller_id: sellerId,
        end_time: new Date(Date.now() + 8 * 3600 * 1000), // 8 hours from now
      },
    ];

    for (const a of seedAuctions) {
      await query(`
        INSERT INTO auctions (title, description, category, starting_bid, current_bid, image_url, seller_id, end_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING;
      `, [a.title, a.description, a.category, a.starting_bid, a.current_bid, a.image_url, a.seller_id, a.end_time]);
    }
    console.log('[Init DB] Seed live auctions loaded successfully.');

    console.log('[Init DB] Database schema migration completed successfully!');
  } catch (error) {
    console.error('[Init DB Error]', error);
    throw error;
  }
};

if (require.main === module) {
  initDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = initDatabase;
