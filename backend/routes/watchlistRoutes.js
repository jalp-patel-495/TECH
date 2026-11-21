const express = require('express');
const router = express.Router();
const { getWatchlist, toggleWatchlist, checkWatchlist } = require('../controllers/watchlistController');
const { authenticateJWT } = require('../middleware/auth');

router.use(authenticateJWT);

router.get('/', getWatchlist);
router.post('/:auctionId', toggleWatchlist);
router.get('/check/:auctionId', checkWatchlist);

module.exports = router;
