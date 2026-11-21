const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
require('dotenv').config();

const { checkDbConnection, query } = require('./config/db');
const { cache } = require('./config/redis');
const initDatabase = require('./scripts/initDb');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const auctionRoutes = require('./routes/auctionRoutes');
const { getCategories } = require('./controllers/auctionController');
const setupAuctionSocket = require('./sockets/auctionSocket');
const { startAuctionBackgroundWorker } = require('./services/auctionEngine');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Attach socket.io instance to express app
app.set('io', io);
setupAuctionSocket(io);

// Security & Parsing Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded product images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});
app.use('/api', apiLimiter);

// Health Check Endpoint (PostgreSQL + Redis + Server Uptime)
app.get('/api/health', async (req, res) => {
  const dbStatus = await checkDbConnection();
  const redisStatus = cache.getStatus();

  const isHealthy = dbStatus.connected;
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date(),
    services: {
      api: { status: 'online', uptime: process.uptime() },
      postgresql: dbStatus,
      redis: redisStatus,
      socketIo: { status: 'operational' },
    },
  });
});

// Real-Time Platform Statistics from PostgreSQL (Zero Fake/Static Data)
app.get('/api/public/stats', async (req, res, next) => {
  try {
    const start = Date.now();
    const statsRes = await query(`
      SELECT 
        (SELECT COALESCE(SUM(current_bid), 0) FROM auctions WHERE status != 'cancelled') AS total_volume,
        (SELECT COUNT(*) FROM auctions WHERE status IN ('live', 'active') AND end_time > NOW()) AS live_auctions,
        (SELECT COUNT(*) FROM auctions) AS total_auctions,
        (SELECT COUNT(*) FROM bids) AS total_bids,
        (SELECT COUNT(*) FROM users) AS total_users;
    `);
    const dbLatency = Date.now() - start;

    res.status(200).json({
      success: true,
      stats: {
        totalVolume: parseFloat(statsRes.rows[0].total_volume).toFixed(2),
        liveAuctions: parseInt(statsRes.rows[0].live_auctions, 10),
        totalAuctions: parseInt(statsRes.rows[0].total_auctions, 10),
        totalBids: parseInt(statsRes.rows[0].total_bids, 10),
        totalUsers: parseInt(statsRes.rows[0].total_users, 10),
        dbLatencyMs: dbLatency,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/categories', getCategories);

// Legacy/Compatibility Public Auctions Endpoint
app.get('/api/public/auctions', async (req, res, next) => {
  try {
    const auctionsRes = await query(`
      SELECT 
        a.id, a.title, a.description, a.category, a.starting_bid, a.current_bid,
        a.bid_increment, a.image_url, a.images, a.end_time, a.status,
        CASE 
          WHEN a.status = 'cancelled' THEN 'cancelled'
          WHEN a.status = 'completed' THEN 'completed'
          WHEN NOW() < a.start_time THEN 'upcoming'
          WHEN NOW() > a.end_time THEN 'completed'
          ELSE 'live'
        END AS computed_status,
        u.name as seller_name,
        (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) as bid_count
      FROM auctions a
      LEFT JOIN users u ON a.seller_id = u.id
      WHERE a.status != 'cancelled'
      ORDER BY a.end_time ASC
      LIMIT 8;
    `);

    const catRes = await query(`
      SELECT category, COUNT(*) as count
      FROM auctions
      GROUP BY category;
    `);

    res.status(200).json({
      success: true,
      auctions: auctionsRes.rows,
      categories: catRes.rows,
    });
  } catch (error) {
    next(error);
  }
});

// Root Welcome Route
app.get('/', (req, res) => {
  res.json({
    name: 'Live Auction Platform API',
    version: '3.0.0',
    documentation: '/api/health',
    environment: process.env.NODE_ENV,
  });
});

// Centralized Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start Server, Mount WebSocket & Background Timer Worker
const startServer = async () => {
  try {
    server.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`🚀 Live Auction Platform Server Active on port ${PORT}`);
      console.log(`📡 Real-Time Socket.IO: Connected with Anti-Sniping & Instant Broadcast`);
      console.log(`🗄️  PostgreSQL: Connected on port ${process.env.PGPORT || 5433}`);
      console.log(`⚡ Redis: ${cache.getStatus().mode}`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api`);
      console.log(`📁 Uploads Served at: http://localhost:${PORT}/uploads`);
      console.log(`===============================================`);

      // Start the real-time background worker for automatic auction closure & winner selection
      startAuctionBackgroundWorker(io);
    });
  } catch (error) {
    console.error('[Server Start Error] Failed to start:', error.message);
    process.exit(1);
  }
};

startServer();
