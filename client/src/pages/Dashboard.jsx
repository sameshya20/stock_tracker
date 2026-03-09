import { useState, useEffect, useCallback } from 'react';
import { stockAPI, watchlistAPI } from '../services/api';
import { io } from 'socket.io-client';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HiOutlineMagnifyingGlass, HiOutlinePlus, HiOutlineArrowTrendingUp, HiOutlineArrowTrendingDown, HiOutlineStar, HiOutlineXMark, HiOutlineBell } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { alertAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';

const Dashboard = () => {
    const [indices, setIndices] = useState([]);
    const [trending, setTrending] = useState([]);
    const [gainers, setGainers] = useState([]);
    const [losers, setLosers] = useState([]);
    const [watchlist, setWatchlist] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedStock, setSelectedStock] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [chartRange, setChartRange] = useState('1d');
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);

    // Alert States
    const [showAlertModal, setShowAlertModal] = useState(false);
    const [alertTargetPrice, setAlertTargetPrice] = useState('');
    const [alertCondition, setAlertCondition] = useState('below');

    const { user } = useAuth();

    useEffect(() => {
        loadDashboardData();
    }, []);

    // Keep socket reference stable
    const [socket, setSocket] = useState(null);

    // Initialize socket connection once
    useEffect(() => {
        const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
        const newSocket = io(socketUrl, { transports: ['websocket', 'polling'] });
        setSocket(newSocket);
        return () => newSocket.disconnect();
    }, []);

    // Handle subscriptions and updates when dependencies change
    useEffect(() => {
        if (!socket) return;

        // Collect all symbols visible on the dashboard to track them live
        const allSymbols = [
            ...indices.map(s => s.symbol),
            ...trending.map(s => s.symbol),
            ...gainers.map(s => s.symbol),
            ...losers.map(s => s.symbol),
            ...watchlist.map(s => s.symbol),
            selectedStock?.symbol
        ].filter(Boolean);

        const uniqueSymbols = [...new Set(allSymbols)];

        // Re-subscribe to the specific list of symbols
        if (socket.connected && uniqueSymbols.length > 0) {
            socket.emit('subscribe', uniqueSymbols);
        }

        const handleConnect = () => {
            if (uniqueSymbols.length > 0) {
                socket.emit('subscribe', uniqueSymbols);
            }
        };

        const handleStockUpdate = (updatedQuotes) => {
            // Helper function to update stock arrays
            const updateStockArray = (arr) => arr.map(stock => {
                const updated = updatedQuotes.find(q => q.symbol === stock.symbol);
                return updated ? { ...stock, ...updated } : stock;
            });

            setIndices(prev => updateStockArray(prev));
            setTrending(prev => updateStockArray(prev));
            setGainers(prev => updateStockArray(prev));
            setLosers(prev => updateStockArray(prev));
            setWatchlist(prev => updateStockArray(prev));

            // Update selected stock
            if (selectedStock) {
                const freshSelectInfo = updatedQuotes.find(q => q.symbol === selectedStock.symbol);
                if (freshSelectInfo) {
                    setSelectedStock(prev => ({ ...prev, ...freshSelectInfo }));
                }
            }
        };

        socket.on('connect', handleConnect);
        socket.on('stockUpdate', handleStockUpdate);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('stockUpdate', handleStockUpdate);
        };
    }, [socket, indices.length, trending.length, gainers.length, losers.length, watchlist.length, selectedStock?.symbol]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const [indicesRes, trendingRes, moversRes, watchlistRes] = await Promise.all([
                stockAPI.getIndices().catch(() => ({ data: [] })),
                stockAPI.getTrending(),
                stockAPI.getMovers(),
                watchlistAPI.getWatchlist().catch(() => ({ data: [] }))
            ]);

            setIndices(indicesRes.data || []);
            setTrending(trendingRes.data);
            setGainers(moversRes.data.gainers || []);
            setLosers(moversRes.data.losers || []);
            setWatchlist(watchlistRes.data?.stocks || []);

            // Load chart for first stock
            if (trendingRes.data.length > 0) {
                const firstSymbol = trendingRes.data[0].symbol;
                setSelectedStock(trendingRes.data[0]);
                loadChartData(firstSymbol);
            }
        } catch (error) {
            console.error('Dashboard load error:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const loadChartData = async (symbol, range = chartRange) => {
        try {
            // Determine appropriate interval based on range
            let interval = '1d';
            if (range === '1d') interval = '5m';
            if (range === '5d') interval = '15m';
            if (range === '1mo') interval = '1d';
            if (range === '6mo') interval = '1wk';
            if (range === '1y' || range === '5y' || range === 'max') interval = '1mo';

            const { data } = await stockAPI.getHistoricalData(symbol, range, interval);

            setChartData(data.map(d => {
                const dateObj = new Date(d.date);
                let dateLabel = '';

                // Format appropriately based on range
                if (range === '1d' || range === '5d') {
                    dateLabel = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                } else if (range === '1mo' || range === '6mo') {
                    dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                } else {
                    dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                }

                return {
                    date: dateLabel,
                    price: d.close,
                    volume: d.volume,
                    fullDate: dateObj
                };
            }));
        } catch (error) {
            console.error('Chart data error:', error);
        }
    };

    const handleSearch = useCallback(async (query) => {
        if (!query || query.length < 1) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        try {
            const { data } = await stockAPI.searchStocks(query);
            setSearchResults(data.slice(0, 6));
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setSearching(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, handleSearch]);

    const selectStock = async (stock) => {
        try {
            const { data } = await stockAPI.getQuote(stock.symbol);
            setSelectedStock({ ...stock, ...data });
            loadChartData(stock.symbol);
            setSearchQuery('');
            setSearchResults([]);
        } catch (error) {
            console.error('Stock select error:', error);
        }
    };

    const addToWatchlist = async (symbol) => {
        try {
            await watchlistAPI.addStock({ symbol });
            toast.success(`${symbol} added to watchlist`);
            const { data } = await watchlistAPI.getWatchlist();
            setWatchlist(data.stocks || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add to watchlist');
        }
    };

    const removeFromWatchlist = async (stockId) => {
        try {
            await watchlistAPI.removeStock(stockId);
            setWatchlist(prev => prev.filter(s => s.id !== stockId));
            toast.success('Removed from watchlist');
        } catch (error) {
            toast.error('Failed to remove from watchlist');
        }
    };

    const changeChartRange = (range) => {
        setChartRange(range);
        if (selectedStock) {
            loadChartData(selectedStock.symbol, range);
        }
    };

    const handleSetAlert = async (e) => {
        e.preventDefault();
        try {
            await alertAPI.createAlert({
                symbol: selectedStock.symbol,
                targetPrice: alertTargetPrice,
                condition: alertCondition
            });
            toast.success(`Alert set for ${selectedStock.symbol} when price goes ${alertCondition} $${alertTargetPrice}`);
            setShowAlertModal(false);
            setAlertTargetPrice('');
        } catch (error) {
            toast.error('Failed to set alert');
        }
    };

    const formatNumber = (num) => {
        if (!num) return '0';
        if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toFixed(2);
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip">
                    <p className="text-xs text-dark-text-secondary">{label}</p>
                    <p className="text-sm font-bold text-dark-text">{formatCurrency(payload[0].value, user?.currency)}</p>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="animate-fade-in space-y-6">
                <div className="skeleton h-8 w-48 rounded-lg" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
                </div>
                <div className="skeleton h-80 rounded-xl" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6 max-w-[1600px]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-dark-text">Market Dashboard</h1>
                    <p className="text-dark-text-secondary text-sm mt-1">Real-time stock market data & analysis</p>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-80">
                    <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-text-secondary" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-dark-card border border-dark-border rounded-xl text-dark-text placeholder-dark-text-secondary/50 focus:outline-none focus:border-primary transition-all text-sm"
                        placeholder="Search stocks (e.g., AAPL, TSLA)..."
                    />
                    {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-dark-card border border-dark-border rounded-xl overflow-hidden shadow-xl z-50">
                            {searchResults.map((result, i) => (
                                <button
                                    key={i}
                                    onClick={() => selectStock(result)}
                                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-dark-card-hover transition-colors text-left"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-dark-text">{result.symbol}</p>
                                        <p className="text-xs text-dark-text-secondary">{result.name}</p>
                                    </div>
                                    <span className="text-xs text-dark-text-secondary">{result.exchange}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Indices */}
            {indices && indices.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {indices.map((idx, i) => (
                        <div key={i} className="glass-card p-4 flex flex-col justify-between">
                            <p className="text-sm font-medium text-dark-text-secondary">{idx.name || idx.companyName}</p>
                            <div className="mt-2 flex items-baseline justify-between">
                                <span className="text-xl font-bold text-dark-text">{formatNumber(idx.price)}</span>
                                <span className={`text-sm font-medium ${idx.changePercent >= 0 ? 'text-gain' : 'text-loss'}`}>
                                    {idx.changePercent >= 0 ? '+' : ''}{idx.changePercent?.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Selected Stock Card + Chart */}
            {selectedStock && (
                <div className="glass-card p-8 pb-4 relative">
                    <div className="flex flex-col lg:flex-col gap-6">
                        {/* Chart Area */}
                        <div className="lg:w-full space-y-2">
                            <div className="flex flex-col mb-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl text-dark-text-secondary">{selectedStock.companyName || selectedStock.name} ({selectedStock.symbol})</h2>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => {
                                                setAlertTargetPrice(selectedStock.price);
                                                setShowAlertModal(true);
                                            }}
                                            className="text-dark-text-secondary hover:text-primary transition-colors tooltip tooltip-left"
                                            title="Set Price Alert"
                                        >
                                            <HiOutlineBell className="text-2xl" />
                                        </button>
                                        <button
                                            onClick={() => addToWatchlist(selectedStock.symbol)}
                                            className="text-dark-text-secondary hover:text-warning transition-colors tooltip tooltip-left"
                                            title="Add to Watchlist"
                                        >
                                            <HiOutlineStar className="text-2xl" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-5xl font-bold tracking-tight text-dark-text mt-1">{formatCurrency(selectedStock.price, user?.currency)}</p>
                                <div className="flex flex-col mt-2">
                                    <div className={`flex items-center gap-1 text-sm font-medium ${selectedStock.changePercent >= 0 ? 'text-gain' : 'text-loss'}`}>
                                        <span>
                                            {selectedStock.change >= 0 ? '+' : ''}{formatCurrency(selectedStock.change, user?.currency)} ({selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent?.toFixed(2)}%)
                                        </span>
                                        <span className="text-dark-text-secondary ml-1">• Today</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-sm mt-1">
                                        <span className="text-dark-text font-medium">{formatCurrency(selectedStock.previousClose, user?.currency)}</span>
                                        <span className="text-dark-text-secondary">Previous Close</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                                {[
                                    { label: 'Open', value: formatCurrency(selectedStock.open, user?.currency) || '—' },
                                    { label: 'High', value: formatCurrency(selectedStock.high, user?.currency) || '—' },
                                    { label: 'Low', value: formatCurrency(selectedStock.low, user?.currency) || '—' },
                                    { label: 'Volume', value: formatNumber(selectedStock.volume) },
                                    { label: 'Mkt Cap', value: formatNumber(selectedStock.marketCap) },
                                    { label: 'Exchange', value: selectedStock.exchange || '—' },
                                ].map(({ label, value }) => (
                                    <div key={label} className="flex justify-between items-center py-2 border-b border-dark-border/30 last:border-0">
                                        <span className="text-sm text-dark-text-secondary">{label}</span>
                                        <span className="text-sm font-medium text-dark-text">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Chart Overlay Controls */}
                        <div className="relative mt-8">
                            <div className="flex items-center justify-end gap-1 mb-6 border-b border-dark-border/40 pb-3">
                                {['1d', '5d', '1mo', '6mo', '1y', '5y', 'max'].map(range => (
                                    <button
                                        key={range}
                                        onClick={() => changeChartRange(range)}
                                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${chartRange === range
                                            ? 'bg-dark-card-hover text-dark-text'
                                            : 'text-dark-text-secondary hover:text-dark-text'
                                            }`}
                                    >
                                        {range.toUpperCase()}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-8">
                                <ResponsiveContainer width="100%" height={320}>
                                    <AreaChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={selectedStock.changePercent >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.15} />
                                                <stop offset="95%" stopColor={selectedStock.changePercent >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2e42" vertical={false} opacity={0.3} />
                                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickMargin={12} minTickGap={30} />
                                        <YAxis hide={true} domain={['auto', 'auto']} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4f46e5', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                        <Area type="monotone" dataKey="price" stroke={selectedStock.changePercent >= 0 ? "#10b981" : "#ef4444"} fill="url(#colorPrice)" strokeWidth={2.5} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Trending, Gainers, Losers */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trending */}
                <div className="glass-card p-5">
                    <h3 className="text-lg font-semibold text-dark-text mb-4 flex items-center gap-2">
                        <span className="text-primary">🔥</span> Trending
                    </h3>
                    <div className="space-y-2">
                        {trending.slice(0, 6).map((stock, i) => (
                            <button
                                key={i}
                                onClick={() => selectStock(stock)}
                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-dark-card-hover transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                        {stock.symbol?.substring(0, 2)}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-dark-text">{stock.symbol}</p>
                                        <p className="text-xs text-dark-text-secondary">{stock.companyName || ''}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-dark-text">{formatCurrency(stock.price, user?.currency)}</p>
                                    <p className={`text-xs font-medium ${stock.changePercent >= 0 ? 'text-gain' : 'text-loss'}`}>
                                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Top Gainers */}
                <div className="glass-card p-5">
                    <h3 className="text-lg font-semibold text-dark-text mb-4 flex items-center gap-2">
                        <HiOutlineArrowTrendingUp className="text-gain" /> Top Gainers
                    </h3>
                    <div className="space-y-2">
                        {gainers.map((stock, i) => (
                            <button
                                key={i}
                                onClick={() => selectStock(stock)}
                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-dark-card-hover transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gain/10 flex items-center justify-center text-xs font-bold text-gain">
                                        {stock.symbol?.substring(0, 2)}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-dark-text">{stock.symbol}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-dark-text">{formatCurrency(stock.price, user?.currency)}</p>
                                    <p className="text-xs font-medium text-gain">+{stock.changePercent?.toFixed(2)}%</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Top Losers */}
                <div className="glass-card p-5">
                    <h3 className="text-lg font-semibold text-dark-text mb-4 flex items-center gap-2">
                        <HiOutlineArrowTrendingDown className="text-loss" /> Top Losers
                    </h3>
                    <div className="space-y-2">
                        {losers.map((stock, i) => (
                            <button
                                key={i}
                                onClick={() => selectStock(stock)}
                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-dark-card-hover transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-loss/10 flex items-center justify-center text-xs font-bold text-loss">
                                        {stock.symbol?.substring(0, 2)}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-dark-text">{stock.symbol}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-dark-text">{formatCurrency(stock.price, user?.currency)}</p>
                                    <p className="text-xs font-medium text-loss">{stock.changePercent?.toFixed(2)}%</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Watchlist */}
            <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-dark-text flex items-center gap-2">
                        <HiOutlineStar className="text-warning" /> Watchlist
                    </h3>
                </div>

                {watchlist.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-dark-text-secondary">No stocks in your watchlist yet</p>
                        <p className="text-xs text-dark-text-secondary mt-1">Search for stocks and click the star icon to add them</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-xs text-dark-text-secondary border-b border-dark-border">
                                    <th className="text-left pb-3 pl-3">Symbol</th>
                                    <th className="text-left pb-3">Name</th>
                                    <th className="text-right pb-3">Price</th>
                                    <th className="text-right pb-3">Change</th>
                                    <th className="text-right pb-3">Volume</th>
                                    <th className="text-right pb-3 pr-3">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {watchlist.map((stock) => (
                                    <tr
                                        key={stock.id}
                                        className="border-b border-dark-border/50 hover:bg-dark-card-hover transition-colors cursor-pointer"
                                        onClick={() => selectStock(stock)}
                                    >
                                        <td className="py-3 pl-3">
                                            <span className="text-sm font-medium text-dark-text">{stock.symbol}</span>
                                        </td>
                                        <td className="py-3">
                                            <span className="text-sm text-dark-text-secondary">{stock.companyName}</span>
                                        </td>
                                        <td className="py-3 text-right">
                                            <span className="text-sm font-medium text-dark-text">{formatCurrency(stock.price, user?.currency)}</span>
                                        </td>
                                        <td className="py-3 text-right">
                                            <span className={`text-sm font-medium ${stock.changePercent >= 0 ? 'text-gain' : 'text-loss'}`}>
                                                {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                                            </span>
                                        </td>
                                        <td className="py-3 text-right">
                                            <span className="text-sm text-dark-text-secondary">{formatNumber(stock.volume)}</span>
                                        </td>
                                        <td className="py-3 text-right pr-3">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeFromWatchlist(stock.id); }}
                                                className="text-dark-text-secondary hover:text-loss transition-colors p-1"
                                            >
                                                <HiOutlineXMark className="text-lg" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Price Alert Modal */}
            {showAlertModal && selectedStock && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-dark-card border border-dark-border rounded-xl p-6 w-full max-w-md animate-fade-in relative shadow-2xl">
                        <button
                            onClick={() => setShowAlertModal(false)}
                            className="absolute top-4 right-4 text-dark-text-secondary hover:text-dark-text transition-colors"
                        >
                            <HiOutlineXMark className="text-xl" />
                        </button>

                        <h3 className="text-xl font-bold text-dark-text mb-2 border-b border-dark-border/40 pb-4">
                            Set Price Alert for <span className="text-primary">{selectedStock.symbol}</span>
                        </h3>

                        <form onSubmit={handleSetAlert} className="space-y-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-text-secondary mb-1">Alert Condition</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setAlertCondition('above')}
                                        className={`py-2 rounded-lg font-medium text-sm transition-all border ${alertCondition === 'above' ? 'bg-gain/20 text-gain border-gain/50' : 'bg-dark-bg border-dark-border text-dark-text-secondary hover:bg-dark-card-hover'}`}
                                    >
                                        Goes Above
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAlertCondition('below')}
                                        className={`py-2 rounded-lg font-medium text-sm transition-all border ${alertCondition === 'below' ? 'bg-loss/20 text-loss border-loss/50' : 'bg-dark-bg border-dark-border text-dark-text-secondary hover:bg-dark-card-hover'}`}
                                    >
                                        Goes Below
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-dark-text-secondary mb-1">Target Price (USD)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-text-secondary">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={alertTargetPrice}
                                        onChange={(e) => setAlertTargetPrice(e.target.value)}
                                        className="w-full pl-8 pr-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-dark-text focus:outline-none focus:border-primary transition-colors"
                                        placeholder="e.g. 150.00"
                                    />
                                </div>
                                <p className="text-xs text-dark-text-secondary mt-2">
                                    Current Price: <span className="text-dark-text font-medium">${selectedStock.price?.toFixed(2)}</span>
                                </p>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors mt-2"
                            >
                                Create Alert
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div >
    );
};

export default Dashboard;
