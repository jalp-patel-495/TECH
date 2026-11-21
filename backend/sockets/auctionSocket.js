const jwt = require('jsonwebtoken');
const { placeBidTransaction } = require('../services/auctionEngine');

/**
 * Socket.IO Real-Time Auction Engine
 */
const setupAuctionSocket = (io) => {
  let activeViewers = 0;

  io.on('connection', (socket) => {
    activeViewers++;
    io.emit('viewer_count', { count: activeViewers });
    console.log(`[Socket.IO] Client connected: ${socket.id} (Total: ${activeViewers})`);

    // Join room for a specific auction item
    socket.on('join_auction', ({ auctionId }) => {
      const room = `auction_${auctionId}`;
      socket.join(room);
      console.log(`[Socket.IO] Client ${socket.id} joined ${room}`);
      socket.emit('joined_room', { room, auctionId });
    });

    // Leave room
    socket.on('leave_auction', ({ auctionId }) => {
      const room = `auction_${auctionId}`;
      socket.leave(room);
    });

    // Real-time bid placement via WebSocket directly
    socket.on('place_bid', async (payload, callback) => {
      try {
        const { auctionId, amount, token } = payload || {};

        if (!token) {
          if (typeof callback === 'function') {
            return callback({ success: false, message: 'Authentication required to place bid.' });
          }
          return;
        }

        // Decode token
        let decoded;
        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_live_auction_jwt_token_key_2026_secure');
        } catch (e) {
          if (typeof callback === 'function') {
            return callback({ success: false, message: 'Invalid or expired authentication session.' });
          }
          return;
        }

        const result = await placeBidTransaction({
          auctionId: parseInt(auctionId, 10),
          bidderId: decoded.id,
          amount: parseFloat(amount),
          io,
        });

        if (typeof callback === 'function') {
          callback(result);
        }
      } catch (err) {
        console.error('[Socket.IO place_bid error]', err);
        if (typeof callback === 'function') {
          callback({ success: false, message: 'Server transaction error.' });
        }
      }
    });

    // Real-time ping for latency monitoring
    socket.on('ping_check', (data, callback) => {
      if (typeof callback === 'function') callback({ serverTime: Date.now() });
    });

    socket.on('disconnect', () => {
      activeViewers = Math.max(0, activeViewers - 1);
      io.emit('viewer_count', { count: activeViewers });
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (Total: ${activeViewers})`);
    });
  });
};

module.exports = setupAuctionSocket;
