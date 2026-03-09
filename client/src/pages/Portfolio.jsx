import { useState, useEffect } from 'react';
import { portfolioAPI, stockAPI, watchlistAPI } from '../services/api';
import { HiOutlinePlus, HiOutlineTrash, HiOutlinePencil, HiOutlineXMark, HiOutlineStar } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';

const Portfolio = () => {
    const [portfolio, setPortfolio] = useState(null);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ symbol: '', quantity: '', buyPrice: '', notes: '' });
    const [searchResults, setSearchResults] = useState([]);
    const [adding, setAdding] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        loadPortfolio();
    }, []);

    const loadPortfolio = async () => {
        try {
            setLoading(true);
            const { data } = await portfolioAPI.getPortfolio();
            setPortfolio(data.portfolio);
            setSummary(data.summary);
        } catch (error) {
            toast.error('Failed to load portfolio');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query) => {
        setAddForm(prev => ({ ...prev, symbol: query }));
        if (query.length >= 1) {
            try {
                const { data } = await stockAPI.searchStocks(query);
                setSearchResults(data.slice(0, 5));
            } catch (error) {
                setSearchResults([]);
            }
        } else {
            setSearchResults([]);
        }
    };

    const selectSearchResult = async (result) => {
        setAddForm(prev => ({ ...prev, symbol: result.symbol }));
        setSearchResults([]);
        try {
            const { data } = await stockAPI.getQuote(result.symbol);
            setAddForm(prev => ({ ...prev, buyPrice: data.price?.toString() || '' }));
        } catch (e) { }
    };

    const handleAddStock = async (e) => {
        e.preventDefault();
        if (!addForm.symbol || !addForm.quantity || !addForm.buyPrice) {
            toast.error('Please fill all required fields');
            return;
        }
        setAdding(true);
        try {
            await portfolioAPI.addStock(addForm);
            toast.success(`${addForm.symbol.toUpperCase()} added to portfolio!`);
            setShowAddModal(false);
            setAddForm({ symbol: '', quantity: '', buyPrice: '', notes: '' });
            loadPortfolio();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add stock');
        } finally {
            setAdding(false);
        }
    };

    const handleRemoveStock = async (stockId, symbol) => {
        if (!confirm(`Remove ${symbol} from portfolio?`)) return;
        try {
            await portfolioAPI.removeStock(stockId);
            toast.success(`${symbol} removed from portfolio`);
            loadPortfolio();
        } catch (error) {
            toast.error('Failed to remove stock');
        }
    };

    const handleAddToWatchlist = async (symbol) => {
        try {
            await watchlistAPI.addStock({ symbol });
            toast.success(`${symbol} added to watchlist`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add to watchlist');
        }
    };

    if (loading) {
        return (
            <div className="animate-fade-in space-y-6">
                <div className="skeleton h-8 w-64 rounded-lg" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}
                </div>
                <div className="skeleton h-96 rounded-xl" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6 max-w-[1600px]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-dark-text">Portfolio</h1>
                    <p className="text-dark-text-secondary text-sm mt-1">Manage your investments</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 gradient-bg text-white rounded-xl font-medium hover:opacity-90 transition-all text-sm"
                >
                    <HiOutlinePlus className="text-lg" /> Add Stock
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-5">
                    <p className="text-xs text-dark-text-secondary mb-1">Total Investment</p>
                    <p className="text-2xl font-bold text-dark-text">{formatCurrency(summary?.totalInvestment, user?.currency)}</p>
                </div>
                <div className="glass-card p-5">
                    <p className="text-xs text-dark-text-secondary mb-1">Current Value</p>
                    <p className="text-2xl font-bold text-dark-text">{formatCurrency(summary?.currentValue, user?.currency)}</p>
                </div>
                <div className="glass-card p-5">
                    <p className="text-xs text-dark-text-secondary mb-1">Total P&L</p>
                    <p className={`text-2xl font-bold ${(summary?.totalProfitLoss || 0) >= 0 ? 'text-gain' : 'text-loss'}`}>
                        {(summary?.totalProfitLoss || 0) >= 0 ? '+' : ''}{formatCurrency(summary?.totalProfitLoss, user?.currency)}
                    </p>
                </div>
                <div className="glass-card p-5">
                    <p className="text-xs text-dark-text-secondary mb-1">P&L %</p>
                    <p className={`text-2xl font-bold ${(summary?.totalProfitLossPercent || 0) >= 0 ? 'text-gain' : 'text-loss'}`}>
                        {(summary?.totalProfitLossPercent || 0) >= 0 ? '+' : ''}{summary?.totalProfitLossPercent?.toFixed(2) || '0.00'}%
                    </p>
                </div>
            </div>

            {/* Holdings Table */}
            <div className="glass-card p-5">
                <h3 className="text-lg font-semibold text-dark-text mb-4">Holdings</h3>
                {!portfolio?.stocks?.length ? (
                    <div className="text-center py-12">
                        <p className="text-dark-text-secondary text-lg mb-2">No stocks in your portfolio</p>
                        <p className="text-dark-text-secondary text-sm mb-4">Add your first stock to start tracking!</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 gradient-bg text-white rounded-xl font-medium hover:opacity-90 transition-all text-sm"
                        >
                            <HiOutlinePlus /> Add Your First Stock
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-xs text-dark-text-secondary border-b border-dark-border">
                                    <th className="text-left pb-3 pl-3">Stock</th>
                                    <th className="text-right pb-3">Qty</th>
                                    <th className="text-right pb-3">Buy Price</th>
                                    <th className="text-right pb-3">Current</th>
                                    <th className="text-right pb-3">Investment</th>
                                    <th className="text-right pb-3">Current Value</th>
                                    <th className="text-right pb-3">P&L</th>
                                    <th className="text-right pb-3">P&L %</th>
                                    <th className="text-right pb-3 pr-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {portfolio.stocks.map((stock) => {
                                    const investment = stock.buyPrice * stock.quantity;
                                    const currentValue = stock.currentPrice * stock.quantity;
                                    const pl = currentValue - investment;
                                    const plPercent = (pl / investment) * 100;

                                    return (
                                        <tr key={stock.id} className="border-b border-dark-border/50 hover:bg-dark-card-hover transition-colors">
                                            <td className="py-4 pl-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                                        {stock.symbol.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-dark-text">{stock.symbol}</p>
                                                        <p className="text-xs text-dark-text-secondary">{stock.companyName}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 text-right text-sm text-dark-text">{stock.quantity}</td>
                                            <td className="py-4 text-right text-sm text-dark-text">{formatCurrency(stock.buyPrice, user?.currency)}</td>
                                            <td className="py-4 text-right text-sm font-medium text-dark-text">{formatCurrency(stock.currentPrice, user?.currency)}</td>
                                            <td className="py-4 text-right text-sm text-dark-text">{formatCurrency(investment, user?.currency)}</td>
                                            <td className="py-4 text-right text-sm text-dark-text">{formatCurrency(currentValue, user?.currency)}</td>
                                            <td className={`py-4 text-right text-sm font-medium ${pl >= 0 ? 'text-gain' : 'text-loss'}`}>
                                                {pl >= 0 ? '+' : ''}{formatCurrency(pl, user?.currency)}
                                            </td>
                                            <td className={`py-4 text-right text-sm font-medium ${plPercent >= 0 ? 'text-gain' : 'text-loss'}`}>
                                                {plPercent >= 0 ? '+' : ''}{plPercent.toFixed(2)}%
                                            </td>
                                            <td className="py-4 text-right pr-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleAddToWatchlist(stock.symbol)}
                                                        className="text-dark-text-secondary hover:text-warning transition-colors p-1.5"
                                                        title="Add to watchlist"
                                                    >
                                                        <HiOutlineStar className="text-lg" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveStock(stock.id, stock.symbol)}
                                                        className="text-dark-text-secondary hover:text-loss transition-colors p-1.5"
                                                        title="Remove stock"
                                                    >
                                                        <HiOutlineTrash className="text-lg" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Stock Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-6 w-full max-w-md animate-fade-in">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-dark-text">Add Stock to Portfolio</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-dark-text-secondary hover:text-dark-text">
                                <HiOutlineXMark className="text-xl" />
                            </button>
                        </div>

                        <form onSubmit={handleAddStock} className="space-y-4">
                            <div className="relative">
                                <label className="block text-sm font-medium text-dark-text-secondary mb-2">Stock Symbol</label>
                                <input
                                    type="text"
                                    value={addForm.symbol}
                                    onChange={(e) => handleSearch(e.target.value.toUpperCase())}
                                    className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-dark-text placeholder-dark-text-secondary/50 focus:outline-none focus:border-primary transition-all text-sm"
                                    placeholder="Search stock (e.g., AAPL)"
                                    required
                                />
                                {searchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-dark-card border border-dark-border rounded-xl overflow-hidden shadow-xl z-10">
                                        {searchResults.map((r, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => selectSearchResult(r)}
                                                className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-dark-card-hover transition-colors text-left text-sm"
                                            >
                                                <span className="font-medium text-dark-text">{r.symbol}</span>
                                                <span className="text-xs text-dark-text-secondary truncate ml-2">{r.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-dark-text-secondary mb-2">Quantity</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        value={addForm.quantity}
                                        onChange={(e) => setAddForm(prev => ({ ...prev, quantity: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-dark-text placeholder-dark-text-secondary/50 focus:outline-none focus:border-primary transition-all text-sm"
                                        placeholder="10"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-dark-text-secondary mb-2">Buy Price ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={addForm.buyPrice}
                                        onChange={(e) => setAddForm(prev => ({ ...prev, buyPrice: e.target.value }))}
                                        className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-dark-text placeholder-dark-text-secondary/50 focus:outline-none focus:border-primary transition-all text-sm"
                                        placeholder="150.00"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-dark-text-secondary mb-2">Notes (optional)</label>
                                <input
                                    type="text"
                                    value={addForm.notes}
                                    onChange={(e) => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
                                    className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-dark-text placeholder-dark-text-secondary/50 focus:outline-none focus:border-primary transition-all text-sm"
                                    placeholder="Add notes about this trade..."
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-dark-border text-dark-text-secondary hover:bg-dark-card-hover transition-all text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={adding}
                                    className="flex-1 py-2.5 rounded-xl gradient-bg text-white font-medium hover:opacity-90 transition-all disabled:opacity-50 text-sm flex items-center justify-center"
                                >
                                    {adding ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Add Stock'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Portfolio;
