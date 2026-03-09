const { Portfolio, PortfolioItem } = require('../models/Portfolio');
const StockService = require('../services/stockService');

// @desc    Get user portfolio
// @route   GET /api/portfolio
exports.getPortfolio = async (req, res) => {
    try {
        let portfolio = await Portfolio.findOne({
            where: { userId: req.user.id },
            include: [{ model: PortfolioItem, as: 'stocks' }]
        });

        if (!portfolio) {
            portfolio = await Portfolio.create({ userId: req.user.id });
            portfolio.stocks = [];
        }

        // Update current prices
        const stocks = portfolio.stocks || [];
        const updatedStocks = await Promise.all(
            stocks.map(async (stock) => {
                try {
                    const quote = await StockService.getQuote(stock.symbol);
                    if (quote.price) {
                        stock.currentPrice = quote.price;
                        await stock.save();
                    }
                } catch (e) {
                    // Keep existing price
                }
                return stock;
            })
        );

        // Calculate summary
        const summary = {
            totalInvestment: 0,
            currentValue: 0,
            totalProfitLoss: 0,
            totalProfitLossPercent: 0,
            stockCount: updatedStocks.length
        };

        updatedStocks.forEach(stock => {
            const investment = parseFloat(stock.buyPrice) * parseFloat(stock.quantity);
            const currentVal = parseFloat(stock.currentPrice) * parseFloat(stock.quantity);
            summary.totalInvestment += investment;
            summary.currentValue += currentVal;
        });

        summary.totalProfitLoss = summary.currentValue - summary.totalInvestment;
        summary.totalProfitLossPercent = summary.totalInvestment > 0
            ? ((summary.totalProfitLoss / summary.totalInvestment) * 100)
            : 0;

        res.json({ portfolio: { ...portfolio.toJSON(), stocks: updatedStocks }, summary });
    } catch (error) {
        console.error('Portfolio fetch error:', error);
        res.status(500).json({ message: 'Error fetching portfolio' });
    }
};

// @desc    Add stock to portfolio
// @route   POST /api/portfolio/add
exports.addStock = async (req, res) => {
    try {
        const { symbol, quantity, buyPrice, purchaseDate, notes } = req.body;

        if (!symbol || !quantity || !buyPrice) {
            return res.status(400).json({ message: 'Symbol, quantity, and buy price are required' });
        }

        let portfolio = await Portfolio.findOne({ where: { userId: req.user.id } });
        if (!portfolio) {
            portfolio = await Portfolio.create({ userId: req.user.id });
        }

        // Get current quote for the stock
        const quote = await StockService.getQuote(symbol.toUpperCase());

        const newStock = await PortfolioItem.create({
            portfolioId: portfolio.id,
            symbol: symbol.toUpperCase(),
            companyName: quote.companyName || symbol.toUpperCase(),
            quantity: parseFloat(quantity),
            buyPrice: parseFloat(buyPrice),
            currentPrice: quote.price || parseFloat(buyPrice),
            sector: quote.sector || 'Unknown',
            purchaseDate: purchaseDate || new Date(),
            notes: notes || ''
        });

        const updatedPortfolio = await Portfolio.findByPk(portfolio.id, {
            include: [{ model: PortfolioItem, as: 'stocks' }]
        });

        res.status(201).json({ message: 'Stock added to portfolio', portfolio: updatedPortfolio });
    } catch (error) {
        console.error('Add stock error:', error);
        res.status(500).json({ message: 'Error adding stock to portfolio' });
    }
};

// @desc    Update stock in portfolio
// @route   PUT /api/portfolio/:stockId
exports.updateStock = async (req, res) => {
    try {
        const { stockId } = req.params;
        const { quantity, buyPrice, notes } = req.body;

        const stock = await PortfolioItem.findByPk(stockId);
        if (!stock) {
            return res.status(404).json({ message: 'Stock not found in portfolio' });
        }

        if (quantity) stock.quantity = parseFloat(quantity);
        if (buyPrice) stock.buyPrice = parseFloat(buyPrice);
        if (notes !== undefined) stock.notes = notes;

        await stock.save();

        const portfolio = await Portfolio.findByPk(stock.portfolioId, {
            include: [{ model: PortfolioItem, as: 'stocks' }]
        });

        res.json({ message: 'Stock updated', portfolio });
    } catch (error) {
        res.status(500).json({ message: 'Error updating stock' });
    }
};

// @desc    Remove stock from portfolio
// @route   DELETE /api/portfolio/:stockId
exports.removeStock = async (req, res) => {
    try {
        const { stockId } = req.params;

        const stock = await PortfolioItem.findByPk(stockId);
        if (!stock) {
            return res.status(404).json({ message: 'Stock not found in portfolio' });
        }

        const portfolioId = stock.portfolioId;
        await stock.destroy();

        const portfolio = await Portfolio.findByPk(portfolioId, {
            include: [{ model: PortfolioItem, as: 'stocks' }]
        });

        res.json({ message: 'Stock removed from portfolio', portfolio });
    } catch (error) {
        res.status(500).json({ message: 'Error removing stock' });
    }
};

// @desc    Get portfolio analytics
// @route   GET /api/portfolio/analytics
exports.getAnalytics = async (req, res) => {
    try {
        const portfolio = await Portfolio.findOne({
            where: { userId: req.user.id },
            include: [{ model: PortfolioItem, as: 'stocks' }]
        });

        if (!portfolio || !portfolio.stocks || portfolio.stocks.length === 0) {
            return res.json({
                sectorDistribution: [],
                topPerformers: [],
                worstPerformers: [],
                portfolioHistory: [],
                stockAllocations: []
            });
        }

        // Sector distribution
        const sectorMap = {};
        portfolio.stocks.forEach(stock => {
            const sector = stock.sector || 'Unknown';
            const value = parseFloat(stock.currentPrice) * parseFloat(stock.quantity);
            sectorMap[sector] = (sectorMap[sector] || 0) + value;
        });
        const sectorDistribution = Object.entries(sectorMap).map(([name, value]) => ({ name, value }));

        // Stock allocations
        const totalValue = portfolio.stocks.reduce((sum, s) => sum + parseFloat(s.currentPrice) * parseFloat(s.quantity), 0);
        const stockAllocations = portfolio.stocks.map(s => ({
            symbol: s.symbol,
            name: s.companyName,
            value: parseFloat(s.currentPrice) * parseFloat(s.quantity),
            percentage: totalValue > 0 ? ((parseFloat(s.currentPrice) * parseFloat(s.quantity)) / totalValue * 100) : 0
        }));

        // Top and worst performers
        const stockPerformance = portfolio.stocks.map(s => ({
            symbol: s.symbol,
            name: s.companyName,
            profitLoss: (parseFloat(s.currentPrice) - parseFloat(s.buyPrice)) * parseFloat(s.quantity),
            profitLossPercent: ((parseFloat(s.currentPrice) - parseFloat(s.buyPrice)) / parseFloat(s.buyPrice)) * 100
        })).sort((a, b) => b.profitLossPercent - a.profitLossPercent);

        const topPerformers = stockPerformance.slice(0, 5);
        const worstPerformers = stockPerformance.slice(-5).reverse();

        // Simulated portfolio historical data
        const portfolioHistory = [];
        const days = 30;
        let baseValue = totalValue * 0.9;
        for (let i = days; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            baseValue += (Math.random() - 0.45) * totalValue * 0.02;
            portfolioHistory.push({
                date: date.toISOString().split('T')[0],
                value: Math.max(0, parseFloat(baseValue.toFixed(2)))
            });
        }

        res.json({
            sectorDistribution,
            topPerformers,
            worstPerformers,
            portfolioHistory,
            stockAllocations
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ message: 'Error fetching analytics' });
    }
};
