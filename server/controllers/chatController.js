const { ChatHistory, ChatMessage } = require('../models/ChatHistory');
const chatbotService = require('../services/chatbotService');

// @desc    Send message to chatbot
// @route   POST /api/chat/message
exports.sendMessage = async (req, res) => {
    try {
        const { message, chatId } = req.body;

        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }

        // Find or create chat history
        let chat;
        if (chatId) {
            chat = await ChatHistory.findOne({
                where: { id: chatId, userId: req.user.id },
                include: [{ model: ChatMessage, as: 'messages' }]
            });
        }

        if (!chat) {
            chat = await ChatHistory.create({
                userId: req.user.id,
                title: message.substring(0, 50)
            });
            chat.messages = [];
        }

        // Add user message
        await ChatMessage.create({
            chatHistoryId: chat.id,
            role: 'user',
            content: message
        });

        const messages = await ChatMessage.findAll({
            where: { chatHistoryId: chat.id },
            order: [['createdAt', 'DESC']],
            limit: 30
        });
        // Reverse them back to chronological order
        messages.reverse();

        // Generate AI response using RAG
        const aiResponse = await chatbotService.generateResponse(
            message,
            messages.map(m => ({ role: m.role, content: m.content }))
        );

        // Add AI response
        const aiMsg = await ChatMessage.create({
            chatHistoryId: chat.id,
            role: 'assistant',
            content: aiResponse
        });

        const updatedMessages = await ChatMessage.findAll({
            where: { chatHistoryId: chat.id },
            order: [['createdAt', 'ASC']]
        });

        res.json({
            chatId: chat.id,
            response: aiResponse,
            messages: updatedMessages.map(m => ({
                role: m.role,
                content: m.content,
                timestamp: m.createdAt
            }))
        });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ message: 'Error processing chat message' });
    }
};

// @desc    Get chat history
// @route   GET /api/chat/history
exports.getChatHistory = async (req, res) => {
    try {
        const chats = await ChatHistory.findAll({
            where: { userId: req.user.id },
            order: [['updatedAt', 'DESC']],
            limit: 20
        });

        res.json(chats);
    } catch (error) {
        console.error('History fetch error:', error);
        res.status(500).json({ message: 'Error fetching chat history' });
    }
};

// @desc    Get specific chat
// @route   GET /api/chat/:chatId
exports.getChat = async (req, res) => {
    try {
        const chat = await ChatHistory.findOne({
            where: {
                id: req.params.chatId,
                userId: req.user.id
            },
            include: [{ model: ChatMessage, as: 'messages' }]
        });

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        res.json({
            chatId: chat.id,
            title: chat.title,
            messages: (chat.messages || []).map(m => ({
                role: m.role,
                content: m.content,
                timestamp: m.createdAt
            }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching chat' });
    }
};

// @desc    Delete chat
// @route   DELETE /api/chat/:chatId
exports.deleteChat = async (req, res) => {
    try {
        const chat = await ChatHistory.findOne({
            where: {
                id: req.params.chatId,
                userId: req.user.id
            }
        });

        if (chat) {
            await chat.destroy();
        }

        res.json({ message: 'Chat deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting chat' });
    }
};
