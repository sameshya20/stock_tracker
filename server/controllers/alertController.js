const Alert = require('../models/Alert');
const StockService = require('../services/stockService');

// @desc    Get user alerts
// @route   GET /api/alerts
exports.getAlerts = async (req, res) => {
    try {
        const alerts = await Alert.findAll({
            where: { userId: req.user.id }
        });

        // Optional: append current prices
        const updatedAlerts = await Promise.all(
            alerts.map(async (alert) => {
                const alertJson = alert.toJSON();
                try {
                    const quote = await StockService.getQuote(alert.symbol);
                    alertJson.currentPrice = quote.price;
                } catch (e) {
                    alertJson.currentPrice = null;
                }
                return alertJson;
            })
        );

        res.json(updatedAlerts);
    } catch (error) {
        console.error('Fetch alerts error:', error);
        res.status(500).json({ message: 'Error fetching alerts' });
    }
};

// @desc    Create alert
// @route   POST /api/alerts
exports.createAlert = async (req, res) => {
    try {
        const { symbol, targetPrice, condition } = req.body;

        if (!symbol || !targetPrice || !condition) {
            return res.status(400).json({ message: 'Symbol, targetPrice, and condition are required' });
        }

        const alert = await Alert.create({
            userId: req.user.id,
            symbol: symbol.toUpperCase(),
            targetPrice: parseFloat(targetPrice),
            condition,
            isActive: true
        });

        res.status(201).json({ message: 'Alert created successfully', alert });
    } catch (error) {
        console.error('Create alert error:', error);
        res.status(500).json({ message: 'Error creating alert' });
    }
};

// @desc    Update/Toggle alert
// @route   PUT /api/alerts/:id
exports.updateAlert = async (req, res) => {
    try {
        const { isActive } = req.body;
        const alert = await Alert.findOne({ where: { id: req.params.id, userId: req.user.id } });

        if (!alert) {
            return res.status(404).json({ message: 'Alert not found' });
        }

        alert.isActive = isActive !== undefined ? isActive : alert.isActive;
        await alert.save();

        res.json({ message: 'Alert updated', alert });
    } catch (error) {
        res.status(500).json({ message: 'Error updating alert' });
    }
};

// @desc    Delete alert
// @route   DELETE /api/alerts/:id
exports.deleteAlert = async (req, res) => {
    try {
        const alert = await Alert.findOne({ where: { id: req.params.id, userId: req.user.id } });

        if (!alert) {
            return res.status(404).json({ message: 'Alert not found' });
        }

        await alert.destroy();
        res.json({ message: 'Alert removed' });
    } catch (error) {
        res.status(500).json({ message: 'Error removing alert' });
    }
};
