const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Portfolio = sequelize.define('Portfolio', {
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

const PortfolioItem = sequelize.define('PortfolioItem', {
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
    quantity: {
        type: DataTypes.DECIMAL(20, 4),
        allowNull: false
    },
    buyPrice: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false
    },
    currentPrice: {
        type: DataTypes.DECIMAL(20, 2),
        defaultValue: 0
    },
    sector: {
        type: DataTypes.STRING,
        defaultValue: 'Unknown'
    },
    purchaseDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    notes: {
        type: DataTypes.TEXT,
        defaultValue: ''
    }
}, {
    timestamps: true
});

// Associations
Portfolio.hasMany(PortfolioItem, { as: 'stocks', foreignKey: 'portfolioId', onDelete: 'CASCADE' });
PortfolioItem.belongsTo(Portfolio, { foreignKey: 'portfolioId' });

module.exports = { Portfolio, PortfolioItem };
