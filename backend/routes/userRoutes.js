const express = require('express');
const router = express.Router();
const { getProfile, getBuyerDashboard, getSellerDashboard, placeBid } = require('../controllers/userController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// Common profile for all authenticated users
router.get('/profile', authenticateJWT, getProfile);

// Buyer-only or Admin dashboard
router.get('/buyer/dashboard', authenticateJWT, authorizeRoles('buyer', 'admin'), getBuyerDashboard);

// Seller-only or Admin dashboard
router.get('/seller/dashboard', authenticateJWT, authorizeRoles('seller', 'admin'), getSellerDashboard);

// Placing a bid (buyer or admin)
router.post('/bid', authenticateJWT, authorizeRoles('buyer', 'admin'), placeBid);

module.exports = router;
