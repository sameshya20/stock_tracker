const express = require('express');
const router = express.Router();
const { getPortfolio, addStock, updateStock, removeStock, getAnalytics } = require('../controllers/portfolioController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getPortfolio);
router.post('/add', protect, addStock);
router.get('/analytics', protect, getAnalytics);
router.put('/:stockId', protect, updateStock);
router.delete('/:stockId', protect, removeStock);

module.exports = router;
