import { useState, useEffect } from 'react';
import { portfolioAPI } from '../services/api';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6'];

const Stats = () => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            const { data } = await portfolioAPI.getAnalytics();
            setAnalytics(data);
        } catch (error) {
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-72 rounded-xl" />)}
                </div>
            </div>
        );
    }

    const hasData = analytics?.portfolioHistory?.length > 0 || analytics?.stockAllocations?.length > 0;

    return (
        <div className="animate-fade-in space-y-6 max-w-[1600px]">
            <div>
                <h1 className="text-2xl font-bold text-dark-text">Analytics & Statistics</h1>
                <p className="text-dark-text-secondary text-sm mt-1">Portfolio performance insights</p>
            </div>

            {!hasData ? (
                <div className="glass-card p-12 text-center">
                    <p className="text-dark-text-secondary text-lg mb-2">No analytics data available</p>
                    <p className="text-dark-text-secondary text-sm">Add stocks to your portfolio to see analytics</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Portfolio Value Over Time */}
                    <div className="glass-card p-5 lg:col-span-2">
                        <h3 className="text-lg font-semibold text-dark-text mb-4">Portfolio Value Over Time</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={analytics.portfolioHistory}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2e42" />
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="value" stroke="#6366f1" fill="url(#colorValue)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Stock Allocation Pie Chart */}
                    <div className="glass-card p-5">
                        <h3 className="text-lg font-semibold text-dark-text mb-4">Stock Allocation</h3>
                        {analytics.stockAllocations?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={analytics.stockAllocations}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={3}
                                        dataKey="value"
                                        nameKey="symbol"
                                    >
                                        {analytics.stockAllocations.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={({ active, payload }) => {
                                        if (active && payload?.length) {
                                            return (
                                                <div className="custom-tooltip">
                                                    <p className="text-sm font-bold text-dark-text">{payload[0].name}</p>
                                                    <p className="text-xs text-dark-text-secondary">{formatCurrency(payload[0].value, user?.currency)} ({payload[0].payload.percentage?.toFixed(1)}%)</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }} />
                                    <Legend
                                        formatter={(value) => <span className="text-xs text-dark-text-secondary">{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[280px] text-dark-text-secondary text-sm">No data</div>
                        )}
                    </div>

                    {/* Sector Distribution */}
                    <div className="glass-card p-5">
                        <h3 className="text-lg font-semibold text-dark-text mb-4">Sector Distribution</h3>
                        {analytics.sectorDistribution?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={analytics.sectorDistribution}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2e42" />
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                                    <Tooltip content={({ active, payload, label }) => {
                                        if (active && payload?.length) {
                                            return (
                                                <div className="custom-tooltip">
                                                    <p className="text-xs text-dark-text-secondary">{label}</p>
                                                    <p className="text-sm font-bold text-dark-text">{formatCurrency(payload[0].value, user?.currency)}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }} />
                                    <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[280px] text-dark-text-secondary text-sm">No data</div>
                        )}
                    </div>

                    {/* Top Performers */}
                    <div className="glass-card p-5">
                        <h3 className="text-lg font-semibold text-dark-text mb-4">🏆 Top Performers</h3>
                        <div className="space-y-3">
                            {analytics.topPerformers?.map((stock, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-dark-bg/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-bold text-dark-text-secondary">#{i + 1}</span>
                                        <div>
                                            <p className="text-sm font-medium text-dark-text">{stock.symbol}</p>
                                            <p className="text-xs text-dark-text-secondary">{stock.name}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gain">
                                            +{stock.profitLossPercent?.toFixed(2)}%
                                        </p>
                                        <p className="text-xs text-gain">+{formatCurrency(stock.profitLoss, user?.currency)}</p>
                                    </div>
                                </div>
                            ))}
                            {(!analytics.topPerformers || analytics.topPerformers.length === 0) && (
                                <p className="text-dark-text-secondary text-sm text-center py-4">No data</p>
                            )}
                        </div>
                    </div>

                    {/* Worst Performers */}
                    <div className="glass-card p-5">
                        <h3 className="text-lg font-semibold text-dark-text mb-4">📉 Worst Performers</h3>
                        <div className="space-y-3">
                            {analytics.worstPerformers?.map((stock, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-dark-bg/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-bold text-dark-text-secondary">#{i + 1}</span>
                                        <div>
                                            <p className="text-sm font-medium text-dark-text">{stock.symbol}</p>
                                            <p className="text-xs text-dark-text-secondary">{stock.name}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-loss">
                                            {stock.profitLossPercent?.toFixed(2)}%
                                        </p>
                                        <p className="text-xs text-loss">{formatCurrency(stock.profitLoss, user?.currency)}</p>
                                    </div>
                                </div>
                            ))}
                            {(!analytics.worstPerformers || analytics.worstPerformers.length === 0) && (
                                <p className="text-dark-text-secondary text-sm text-center py-4">No data</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Stats;
