const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Watchlist = sequelize.define('Watchlist', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    }
}, {
    timestamps: true
});

const WatchlistItem = sequelize.define('WatchlistItem', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    symbol: {
        type: DataTypes.STRING,
        allowNull: false
    },
    companyName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    addedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    targetPrice: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        defaultValue: ''
    }
}, {
    timestamps: true
});

// Associations
Watchlist.hasMany(WatchlistItem, { as: 'stocks', foreignKey: 'watchlistId', onDelete: 'CASCADE' });
WatchlistItem.belongsTo(Watchlist, { foreignKey: 'watchlistId' });

module.exports = { Watchlist, WatchlistItem };
