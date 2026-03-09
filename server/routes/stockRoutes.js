const express = require('express');
const router = express.Router();
const { getQuote, getMultipleQuotes, getHistoricalData, searchStocks, getTrending, getMovers, getIndices } = require('../controllers/stockController');
const { protect } = require('../middleware/auth');

router.get('/quote/:symbol', protect, getQuote);
router.post('/quotes', protect, getMultipleQuotes);
router.get('/history/:symbol', protect, getHistoricalData);
router.get('/search', protect, searchStocks);
router.get('/trending', protect, getTrending);
router.get('/movers', protect, getMovers);
router.get('/indices', protect, getIndices);

module.exports = router;
