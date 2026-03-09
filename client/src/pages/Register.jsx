import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineChartPie, HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2';
import toast from 'react-hot-toast';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await register(name, email, password);
            toast.success('Account created successfully!');
            navigate('/');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-bg flex">
            {/* Left Panel */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-dark-bg to-primary/20" />
                <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle at 75% 25%, rgba(6, 182, 212, 0.12) 0%, transparent 50%), radial-gradient(circle at 25% 75%, rgba(99, 102, 241, 0.12) 0%, transparent 50%)'
                }} />
                <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center mb-8 animate-pulse-glow">
                        <HiOutlineChartPie className="text-white text-4xl" />
                    </div>
                    <h1 className="text-5xl font-bold gradient-text mb-4">Get Started</h1>
                    <p className="text-dark-text-secondary text-lg text-center max-w-md">
                        Join thousands of investors using AI-powered insights to make smarter decisions
                    </p>

                    <div className="mt-12 space-y-4 max-w-sm w-full">
                        {[
                            { icon: '📊', text: 'Track real-time stock prices' },
                            { icon: '🤖', text: 'AI-powered market analysis' },
                            { icon: '📈', text: 'Portfolio performance analytics' },
                            { icon: '🔔', text: 'Personalized price alerts' },
                        ].map((item, i) => (
                            <div key={i} className="glass-card p-4 flex items-center gap-4 animate-slide-in" style={{ animationDelay: `${i * 0.1}s` }}>
                                <span className="text-2xl">{item.icon}</span>
                                <p className="text-sm text-dark-text">{item.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel - Register Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md animate-fade-in">
                    <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
                        <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                            <HiOutlineChartPie className="text-white text-2xl" />
                        </div>
                        <h1 className="text-2xl font-bold gradient-text">AI Stock Tracker</h1>
                    </div>

                    <h2 className="text-3xl font-bold text-dark-text mb-2">Create Account</h2>
                    <p className="text-dark-text-secondary mb-8">Start tracking your investments today</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-dark-text-secondary mb-2">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-xl text-dark-text placeholder-dark-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                                placeholder="Enter your full name"
                                required
                            />
                        </div>

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
                                    placeholder="Create a password"
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

                        <div>
                            <label className="block text-sm font-medium text-dark-text-secondary mb-2">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-dark-card border border-dark-border rounded-xl text-dark-text placeholder-dark-text-secondary/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                                placeholder="Confirm your password"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-xl font-semibold text-white gradient-bg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-dark-text-secondary mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary hover:text-primary-light font-medium transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
