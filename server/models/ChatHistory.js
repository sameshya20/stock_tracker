const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ChatHistory = sequelize.define('ChatHistory', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        defaultValue: 'New Chat'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    timestamps: true
});

const ChatMessage = sequelize.define('ChatMessage', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    role: {
        type: DataTypes.ENUM('user', 'assistant', 'system'),
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: true
});

// Associations
ChatHistory.hasMany(ChatMessage, { as: 'messages', foreignKey: 'chatHistoryId', onDelete: 'CASCADE' });
ChatMessage.belongsTo(ChatHistory, { foreignKey: 'chatHistoryId' });

module.exports = { ChatHistory, ChatMessage };
