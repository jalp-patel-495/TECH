const express = require('express');
const router = express.Router();
const { getAdminOverview, getAdminUsers } = require('../controllers/adminController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

// All admin routes strictly enforced with role 'admin'
router.get('/overview', authenticateJWT, authorizeRoles('admin'), getAdminOverview);
router.get('/users', authenticateJWT, authorizeRoles('admin'), getAdminUsers);

module.exports = router;
