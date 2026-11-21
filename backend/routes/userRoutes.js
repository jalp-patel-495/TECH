const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  changePassword,
  updateSettings,
  getBuyerDashboard,
  getBuyerBids,
  getBuyerWon,
  getBuyerLost,
  getSellerDashboard,
  getSellerAuctions,
  getSellerBids,
  getSellerWinners,
  placeBid,
} = require('../controllers/userController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// Profile & Account Settings (all authenticated users)
router.get('/profile', authenticateJWT, getProfile);
router.put('/profile', authenticateJWT, updateProfile);
router.put('/password', authenticateJWT, changePassword);
router.put('/settings', authenticateJWT, updateSettings);

// Buyer Routes
router.get('/buyer/dashboard', authenticateJWT, authorizeRoles('buyer', 'admin'), getBuyerDashboard);
router.get('/buyer/bids', authenticateJWT, authorizeRoles('buyer', 'admin'), getBuyerBids);
router.get('/buyer/won', authenticateJWT, authorizeRoles('buyer', 'admin'), getBuyerWon);
router.get('/buyer/lost', authenticateJWT, authorizeRoles('buyer', 'admin'), getBuyerLost);

// Seller Routes
router.get('/seller/dashboard', authenticateJWT, authorizeRoles('seller', 'admin'), getSellerDashboard);
router.get('/seller/auctions', authenticateJWT, authorizeRoles('seller', 'admin'), getSellerAuctions);
router.get('/seller/bids', authenticateJWT, authorizeRoles('seller', 'admin'), getSellerBids);
router.get('/seller/winners', authenticateJWT, authorizeRoles('seller', 'admin'), getSellerWinners);

// Placing a Bid
router.post('/bid', authenticateJWT, authorizeRoles('buyer', 'admin'), placeBid);

module.exports = router;
