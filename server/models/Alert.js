const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');

const Alert = sequelize.define('Alert', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    symbol: {
        type: DataTypes.STRING,
        allowNull: false
    },
    targetPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    condition: {
        type: DataTypes.ENUM('above', 'below'),
        allowNull: false
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    lastTriggeredAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: true
});

User.hasMany(Alert, { foreignKey: 'userId', as: 'alerts' });
Alert.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = Alert;
