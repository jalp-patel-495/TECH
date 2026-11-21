const express = require('express');
const router = express.Router();
const {
  getAdminOverview,
  getAdminUsers,
  toggleUserStatus,
  getAdminAuctions,
  getAdminBids,
  getAdminWinners,
  createCategory,
  updateCategory,
  deleteCategory,
  getAdminReports,
} = require('../controllers/adminController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// All admin routes strictly enforced with role 'admin'
router.use(authenticateJWT, authorizeRoles('admin'));

router.get('/overview', getAdminOverview);
router.get('/users', getAdminUsers);
router.put('/users/:id/status', toggleUserStatus);
router.get('/auctions', getAdminAuctions);
router.get('/bids', getAdminBids);
router.get('/winners', getAdminWinners);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);
router.get('/reports', getAdminReports);

module.exports = router;
