const StockService = require('../services/stockService');

// @desc    Get stock quote
// @route   GET /api/stocks/quote/:symbol
exports.getQuote = async (req, res) => {
    try {
        const { symbol } = req.params;
        const quote = await StockService.getQuote(symbol.toUpperCase());
        res.json(quote);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stock quote' });
    }
};

// @desc    Get multiple stock quotes
// @route   POST /api/stocks/quotes
exports.getMultipleQuotes = async (req, res) => {
    try {
        const { symbols } = req.body;
        if (!symbols || !Array.isArray(symbols)) {
            return res.status(400).json({ message: 'Please provide an array of symbols' });
        }
        const quotes = await Promise.all(
            symbols.map(s => StockService.getQuote(s.toUpperCase()))
        );
        res.json(quotes);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stock quotes' });
    }
};

// @desc    Get historical data
// @route   GET /api/stocks/history/:symbol
exports.getHistoricalData = async (req, res) => {
    try {
        const { symbol } = req.params;
        const { range = '1mo', interval = '1d' } = req.query;
        const data = await StockService.getHistoricalData(symbol.toUpperCase(), range, interval);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching historical data' });
    }
};

// @desc    Search stocks
// @route   GET /api/stocks/search
exports.searchStocks = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ message: 'Please provide a search query' });
        }
        const results = await StockService.searchStocks(q);
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: 'Error searching stocks' });
    }
};

// @desc    Get trending stocks
// @route   GET /api/stocks/trending
exports.getTrending = async (req, res) => {
    try {
        const stocks = await StockService.getTrendingStocks();
        res.json(stocks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching trending stocks' });
    }
};

// @desc    Get top gainers and losers
// @route   GET /api/stocks/movers
exports.getMovers = async (req, res) => {
    try {
        const data = await StockService.getGainersLosers();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching movers' });
    }
};

// @desc    Get Market Indices
// @route   GET /api/stocks/indices
exports.getIndices = async (req, res) => {
    try {
        const data = await StockService.getIndices();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching market indices' });
    }
};
