const express = require('express');
const router = express.Router();
const {
  getAuctions,
  getAuctionById,
  createAuction,
  updateAuction,
  deleteAuction,
  uploadImages,
  getMyAuctions,
  getCategories,
} = require('../controllers/auctionController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public endpoints
router.get('/', getAuctions);
router.get('/categories', getCategories);

// Seller & Admin protected endpoints
router.get('/seller/my-auctions', authenticateJWT, authorizeRoles('seller', 'admin'), getMyAuctions);
router.post('/', authenticateJWT, authorizeRoles('seller', 'admin'), createAuction);
router.post('/upload', authenticateJWT, authorizeRoles('seller', 'admin'), upload.array('images', 5), uploadImages);
router.put('/:id', authenticateJWT, authorizeRoles('seller', 'admin'), updateAuction);
router.delete('/:id', authenticateJWT, authorizeRoles('seller', 'admin'), deleteAuction);

// Public auction details by ID (placed after specific endpoints like /categories and /seller/my-auctions)
router.get('/:id', getAuctionById);

module.exports = router;
