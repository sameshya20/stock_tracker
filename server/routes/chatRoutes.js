const express = require('express');
const router = express.Router();
const { sendMessage, getChatHistory, getChat, deleteChat } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.post('/message', protect, sendMessage);
router.get('/history', protect, getChatHistory);
router.get('/:chatId', protect, getChat);
router.delete('/:chatId', protect, deleteChat);

module.exports = router;
