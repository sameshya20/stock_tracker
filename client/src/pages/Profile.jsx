import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { portfolioAPI } from '../services/api';
import { HiOutlineUser, HiOutlineEnvelope, HiOutlinePhone, HiOutlineBriefcase, HiOutlineChartBar, HiOutlineCurrencyDollar, HiOutlineCalendar } from 'react-icons/hi2';
import { formatCurrency } from '../utils/formatters';

const Profile = () => {
    const { user } = useAuth();
    const [summary, setSummary] = useState(null);

    useEffect(() => {
        portfolioAPI.getPortfolio().then(({ data }) => setSummary(data.summary)).catch(() => { });
    }, []);

    return (
        <div className="animate-fade-in space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-dark-text">Profile</h1>
                <p className="text-dark-text-secondary text-sm mt-1">Your account overview</p>
            </div>

            <div className="glass-card p-8">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-4xl font-bold text-white flex-shrink-0">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        <h2 className="text-2xl font-bold text-dark-text">{user?.name}</h2>
                        <p className="text-dark-text-secondary mt-1">{user?.bio || 'Stock market enthusiast'}</p>
                        <div className="flex flex-wrap gap-4 mt-4">
                            <span className="flex items-center gap-2 text-sm text-dark-text-secondary"><HiOutlineEnvelope className="text-primary" />{user?.email}</span>
                            {user?.phone && <span className="flex items-center gap-2 text-sm text-dark-text-secondary"><HiOutlinePhone className="text-primary" />{user.phone}</span>}
                            <span className="flex items-center gap-2 text-sm text-dark-text-secondary"><HiOutlineCalendar className="text-primary" />Joined {new Date(user?.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { icon: HiOutlineBriefcase, color: 'primary', label: 'Holdings', value: summary?.stockCount || 0 },
                    { icon: HiOutlineCurrencyDollar, color: 'accent', label: 'Investment', value: formatCurrency(summary?.totalInvestment || 0, user?.currency) },
                    { icon: HiOutlineChartBar, color: 'gain', label: 'Current Value', value: formatCurrency(summary?.currentValue || 0, user?.currency) },
                    { icon: HiOutlineCurrencyDollar, color: (summary?.totalProfitLoss || 0) >= 0 ? 'gain' : 'loss', label: 'Total P&L', value: `${(summary?.totalProfitLoss || 0) >= 0 ? '+' : ''}${formatCurrency(summary?.totalProfitLoss || 0, user?.currency)}` },
                ].map(({ icon: Icon, color, label, value }, i) => (
                    <div key={i} className="glass-card p-5 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-${color}/10 flex items-center justify-center`}>
                            <Icon className={`text-xl text-${color}`} />
                        </div>
                        <div>
                            <p className="text-xs text-dark-text-secondary">{label}</p>
                            <p className="text-xl font-bold text-dark-text">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-dark-text mb-4">Activity Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-dark-bg/50 rounded-xl">
                        <p className="text-3xl font-bold gradient-text">{summary?.stockCount || 0}</p>
                        <p className="text-sm text-dark-text-secondary mt-1">Active Positions</p>
                    </div>
                    <div className="text-center p-4 bg-dark-bg/50 rounded-xl">
                        <p className="text-3xl font-bold gradient-text">{summary?.totalProfitLossPercent?.toFixed(1) || '0.0'}%</p>
                        <p className="text-sm text-dark-text-secondary mt-1">Overall Returns</p>
                    </div>
                    <div className="text-center p-4 bg-dark-bg/50 rounded-xl">
                        <p className="text-3xl font-bold gradient-text">{formatCurrency(summary?.currentValue || 0, user?.currency)}</p>
                        <p className="text-sm text-dark-text-secondary mt-1">Portfolio Value</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
