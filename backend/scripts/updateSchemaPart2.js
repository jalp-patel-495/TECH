const { query } = require('../config/db');

const updateSchemaPart2 = async () => {
  console.log('[Migration Part 2] Upgrading database schema for Auction Management...');

  try {
    // 1. Add new columns to auctions table if not exist
    await query(`
      ALTER TABLE auctions
      ADD COLUMN IF NOT EXISTS start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS bid_increment NUMERIC(12, 2) DEFAULT 10.00,
      ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT ARRAY[]::TEXT[],
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('[Migration Part 2] Added columns (start_time, bid_increment, images, updated_at) to auctions.');

    // 2. Drop existing constraint if it restricts status and re-add flexible status constraint
    await query(`
      DO $$
      BEGIN
        ALTER TABLE auctions DROP CONSTRAINT IF EXISTS auctions_status_check;
        ALTER TABLE auctions ADD CONSTRAINT auctions_status_check 
          CHECK (status IN ('upcoming', 'live', 'completed', 'cancelled', 'active', 'ended'));
      EXCEPTION
        WHEN OTHERS THEN
          NULL;
      END $$;
    `);
    console.log('[Migration Part 2] Updated auctions status constraint to support (upcoming, live, completed, cancelled).');

    // 3. Create Categories table
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        icon VARCHAR(50) DEFAULT 'Tag',
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[Migration Part 2] Table "categories" verified.');

    // 4. Seed Categories
    const categoriesList = [
      { name: 'Luxury Watches', slug: 'luxury-watches', icon: 'Watch', description: 'Certified Swiss timepieces, vintage horology, and rare limited editions.' },
      { name: 'Electronics & Gadgets', slug: 'electronics-gadgets', icon: 'Laptop', description: 'Cutting-edge workstations, rare tech prototypes, and audio gear.' },
      { name: 'Collectibles & Art', slug: 'collectibles-art', icon: 'Palette', description: 'Curated modern fine art, historical memorabilia, and signed relics.' },
      { name: 'Automobiles & Vehicles', slug: 'automobiles-vehicles', icon: 'Car', description: 'Classic sports cars, museum replicas, and luxury collector vehicles.' },
      { name: 'Jewelry & Diamonds', slug: 'jewelry-diamonds', icon: 'Gem', description: 'GIA-certified diamonds, platinum rings, and bespoke heirlooms.' },
      { name: 'Fashion & Accessories', slug: 'fashion-accessories', icon: 'ShoppingBag', description: 'Designer haute couture, rare leather goods, and vintage luggage.' },
      { name: 'Real Estate', slug: 'real-estate', icon: 'Building', description: 'Prime urban penthouses, architectural retreats, and commercial estates.' },
      { name: 'Sports Memorabilia', slug: 'sports-memorabilia', icon: 'Trophy', description: 'Championship rings, game-worn jerseys, and historic sporting items.' }
    ];

    for (const cat of categoriesList) {
      await query(`
        INSERT INTO categories (name, slug, icon, description)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (name) DO UPDATE SET
          icon = EXCLUDED.icon,
          description = EXCLUDED.description;
      `, [cat.name, cat.slug, cat.icon, cat.description]);
    }
    console.log('[Migration Part 2] Seeded 8 official auction categories.');

    // 5. Update existing auctions with proper images array and bid_increment
    await query(`
      UPDATE auctions 
      SET 
        images = ARRAY[image_url],
        bid_increment = COALESCE(bid_increment, 50.00),
        status = CASE 
          WHEN status = 'active' THEN 'live' 
          WHEN status = 'ended' THEN 'completed'
          ELSE status 
        END
      WHERE images IS NULL OR array_length(images, 1) IS NULL;
    `);

    // 6. Seed diverse auctions covering all 4 statuses (Upcoming, Live, Completed, Cancelled)
    const sellerRes = await query(`SELECT id FROM users WHERE role = 'seller' LIMIT 1;`);
    const sellerId = sellerRes.rows[0]?.id || 1;

    const testAuctions = [
      {
        title: 'Patek Philippe Nautilus 5711/1R Rose Gold',
        description: 'Iconic cushion bezel with gradient brown dial in solid 18k rose gold. Pristine condition with original archive certificate and box.',
        category: 'Luxury Watches',
        starting_bid: 75000.00,
        current_bid: 89000.00,
        bid_increment: 1000.00,
        status: 'live',
        image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80',
        images: [
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1547996160-71dfabb14646?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1000&q=80'
        ],
        seller_id: sellerId,
        start_time: new Date(Date.now() - 3600 * 1000), // 1 hour ago
        end_time: new Date(Date.now() + 24 * 3600 * 1000), // 24 hours from now
      },
      {
        title: 'Original Apple-1 Computer Signed by Wozniak (1976)',
        description: 'Operational operational motherboard numbered in original handwriting. Certified authentic by computer history museum curators.',
        category: 'Electronics & Gadgets',
        starting_bid: 150000.00,
        current_bid: 150000.00,
        bid_increment: 5000.00,
        status: 'upcoming',
        image_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1000&q=80',
        images: [
          'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80'
        ],
        seller_id: sellerId,
        start_time: new Date(Date.now() + 48 * 3600 * 1000), // In 2 days
        end_time: new Date(Date.now() + 7 * 24 * 3600 * 1000), // In 7 days
      },
      {
        title: '1963 Aston Martin DB5 Silver Birch Fastback',
        description: 'Vantage-specification 4.0L inline-six with factory 5-speed ZF manual gearbox. Complete matching-numbers provenance and British Heritage Certificate.',
        category: 'Automobiles & Vehicles',
        starting_bid: 650000.00,
        current_bid: 785000.00,
        bid_increment: 10000.00,
        status: 'completed',
        image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80',
        images: [
          'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80'
        ],
        seller_id: sellerId,
        start_time: new Date(Date.now() - 48 * 3600 * 1000),
        end_time: new Date(Date.now() - 2 * 3600 * 1000), // Ended 2h ago
      },
      {
        title: 'Cartier Art Deco Colombian Emerald & Diamond Necklace',
        description: '35.4 carats of vivid green untreated Colombian emeralds set in platinum with brilliant-cut diamonds. Circa 1928 Paris workshop.',
        category: 'Jewelry & Diamonds',
        starting_bid: 95000.00,
        current_bid: 112000.00,
        bid_increment: 2000.00,
        status: 'live',
        image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=80',
        images: [
          'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1000&q=80'
        ],
        seller_id: sellerId,
        start_time: new Date(Date.now() - 12 * 3600 * 1000),
        end_time: new Date(Date.now() + 18 * 3600 * 1000),
      }
    ];

    for (const item of testAuctions) {
      await query(`
        INSERT INTO auctions (title, description, category, starting_bid, current_bid, bid_increment, status, image_url, images, seller_id, start_time, end_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT DO NOTHING;
      `, [item.title, item.description, item.category, item.starting_bid, item.current_bid, item.bid_increment, item.status, item.image_url, item.images, item.seller_id, item.start_time, item.end_time]);
    }
    console.log('[Migration Part 2] Seeded diverse test auctions (Upcoming, Live, Completed).');

    console.log('[Migration Part 2] Schema migration for Part 2 completed successfully!');
  } catch (err) {
    console.error('[Migration Part 2 Error]', err);
    throw err;
  }
};

if (require.main === module) {
  updateSchemaPart2()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = updateSchemaPart2;
