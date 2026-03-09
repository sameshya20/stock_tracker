const { Watchlist, WatchlistItem } = require('../models/Watchlist');
const StockService = require('../services/stockService');

// @desc    Get user watchlist
// @route   GET /api/watchlist
exports.getWatchlist = async (req, res) => {
    try {
        let watchlist = await Watchlist.findOne({
            where: { userId: req.user.id },
            include: [{ model: WatchlistItem, as: 'stocks' }]
        });

        if (!watchlist) {
            watchlist = await Watchlist.create({ userId: req.user.id });
            watchlist.stocks = [];
        }

        // Fetch current prices for all watchlist stocks
        const stocks = watchlist.stocks || [];
        const stocksWithPrices = await Promise.all(
            stocks.map(async (stock) => {
                try {
                    const quote = await StockService.getQuote(stock.symbol);
                    return {
                        ...stock.toJSON(),
                        price: quote.price,
                        change: quote.change,
                        changePercent: quote.changePercent,
                        volume: quote.volume
                    };
                } catch (e) {
                    return {
                        ...stock.toJSON(),
                        price: 0,
                        change: 0,
                        changePercent: 0,
                        volume: 0
                    };
                }
            })
        );
        return res.json({ ...watchlist.toJSON(), stocks: stocksWithPrices });
    } catch (error) {
        console.error('Watchlist fetch error:', error);
        res.status(500).json({ message: 'Error fetching watchlist' });
    }
};

// @desc    Add stock to watchlist
// @route   POST /api/watchlist/add
exports.addStock = async (req, res) => {
    try {
        const { symbol, targetPrice, notes } = req.body;

        if (!symbol) {
            return res.status(400).json({ message: 'Stock symbol is required' });
        }

        let watchlist = await Watchlist.findOne({ where: { userId: req.user.id } });
        if (!watchlist) {
            watchlist = await Watchlist.create({ userId: req.user.id });
        }

        // Check if already in watchlist
        const existing = await WatchlistItem.findOne({
            where: {
                watchlistId: watchlist.id,
                symbol: symbol.toUpperCase()
            }
        });

        if (existing) {
            return res.status(400).json({ message: 'Stock already in watchlist' });
        }

        // Get company name
        let companyName = symbol.toUpperCase();
        try {
            const quote = await StockService.getQuote(symbol.toUpperCase());
            companyName = quote.companyName || symbol.toUpperCase();
        } catch (e) { }

        await WatchlistItem.create({
            watchlistId: watchlist.id,
            symbol: symbol.toUpperCase(),
            companyName,
            targetPrice: targetPrice ? parseFloat(targetPrice) : null,
            notes: notes || ''
        });

        const updatedWatchlist = await Watchlist.findByPk(watchlist.id, {
            include: [{ model: WatchlistItem, as: 'stocks' }]
        });

        res.status(201).json({ message: 'Added to watchlist', watchlist: updatedWatchlist });
    } catch (error) {
        console.error('Add watchlist error:', error);
        res.status(500).json({ message: 'Error adding to watchlist' });
    }
};

// @desc    Remove stock from watchlist
// @route   DELETE /api/watchlist/:stockId
exports.removeStock = async (req, res) => {
    try {
        const { stockId } = req.params;

        const stock = await WatchlistItem.findByPk(stockId);
        if (!stock) {
            return res.status(404).json({ message: 'Stock not found' });
        }

        const watchlistId = stock.watchlistId;
        await stock.destroy();

        const updatedWatchlist = await Watchlist.findByPk(watchlistId, {
            include: [{ model: WatchlistItem, as: 'stocks' }]
        });

        res.json({ message: 'Removed from watchlist', watchlist: updatedWatchlist });
    } catch (error) {
        res.status(500).json({ message: 'Error removing from watchlist' });
    }
};

// @desc    Update watchlist item
// @route   PUT /api/watchlist/:stockId
exports.updateStock = async (req, res) => {
    try {
        const { stockId } = req.params;
        const { targetPrice, notes } = req.body;

        const stock = await WatchlistItem.findByPk(stockId);
        if (!stock) {
            return res.status(404).json({ message: 'Stock not found' });
        }

        if (targetPrice !== undefined) stock.targetPrice = targetPrice ? parseFloat(targetPrice) : null;
        if (notes !== undefined) stock.notes = notes;

        await stock.save();

        const updatedWatchlist = await Watchlist.findByPk(stock.watchlistId, {
            include: [{ model: WatchlistItem, as: 'stocks' }]
        });

        res.json({ message: 'Watchlist updated', watchlist: updatedWatchlist });
    } catch (error) {
        res.status(500).json({ message: 'Error updating watchlist' });
    }
};
