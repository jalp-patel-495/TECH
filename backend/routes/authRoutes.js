const express = require('express');
const router = express.Router();
const { register, login, getMe, logout } = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/auth');

// Public authentication routes
router.post('/register', register);
router.post('/login', login);

// Protected routes (requires valid JWT)
router.get('/me', authenticateJWT, getMe);
router.post('/logout', authenticateJWT, logout);

module.exports = router;
