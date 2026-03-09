import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineChartPie, HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2';
import toast from 'react-hot-toast';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            toast.success('Welcome back!');
            navigate('/');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-bg flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-dark-bg to-accent/20" />
                <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(6, 182, 212, 0.1) 0%, transparent 50%)'
                }} />
                <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
                    <div className="w-20 h-20 rounded-2xl gradient-bg flex items-center justify-center mb-8 animate-pulse-glow">
                        <HiOutlineChartPie className="text-white text-4xl" />
                    </div>
                    <h1 className="text-5xl font-bold gradient-text mb-4">AI Stock Tracker</h1>
                    <p className="text-dark-text-secondary text-lg text-center max-w-md">
                        Real-time stock tracking, AI-powered insights, and intelligent portfolio management
                    </p>

                    {/* Floating cards */}
                    <div className="mt-12 grid grid-cols-2 gap-4 max-w-md">
                        {[
                            { label: 'Real-time Data', value: 'Live Updates' },
                            { label: 'AI Analysis', value: 'RAG Powered' },
                            { label: 'Portfolio', value: 'Smart Tracking' },
                            { label: 'Analytics', value: 'Deep Insights' },
                        ].map((item, i) => (
                            <div key={i} className="glass-card p-4 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                                <p className="text-xs text-dark-text-secondary">{item.label}</p>
                                <p className="text-sm font-semibold text-dark-text">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md animate-fade-in">
                    <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
                        <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                            <HiOutlineChartPie className="text-white text-2xl" />
                        </div>
                        <h1 className="text-2xl font-bold gradient-text">AI Stock Tracker</h1>
                    </div>

                    <h2 className="text-3xl font-bold text-dark-text mb-2">Welcome back</h2>
                    <p className="text-dark-text-secondary mb-8">Sign in to your account to continue</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-dark-text-secondary mb-2">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-xl text-dark-text placeholder-dark-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                                placeholder="Enter your email"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-dark-text-secondary mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-xl text-dark-text placeholder-dark-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all pr-12"
                                    placeholder="Enter your password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-text-secondary hover:text-dark-text"
                                >
                                    {showPassword ? <HiOutlineEyeSlash className="text-xl" /> : <HiOutlineEye className="text-xl" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-xl font-semibold text-white gradient-bg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-dark-text-secondary mt-6">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-primary hover:text-primary-light font-medium transition-colors">
                            Create account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
