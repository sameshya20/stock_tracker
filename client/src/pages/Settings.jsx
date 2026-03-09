import { useState } from 'react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { HiOutlineUser, HiOutlineLockClosed, HiOutlineBell, HiOutlineGlobeAlt, HiOutlineCheckCircle } from 'react-icons/hi2';
import toast from 'react-hot-toast';

const Settings = () => {
    const { user, updateUser } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);

    // Form States
    const [profileForm, setProfileForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        bio: user?.bio || '',
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [prefForm, setPrefForm] = useState({
        currency: user?.currency || 'USD',
        notifications: user?.notifications || {
            priceAlerts: true,
            portfolioUpdates: true,
            marketNews: false,
            emailNotifications: false,
        },
    });

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await authAPI.updateProfile(profileForm);
            updateUser({ ...user, ...data });
            toast.success('Profile updated successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            return toast.error('Passwords do not match');
        }
        setLoading(true);
        try {
            await authAPI.changePassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            });
            toast.success('Password changed successfully');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const handleSettingsUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await authAPI.updateSettings(prefForm);
            updateUser({ ...user, ...data });
            toast.success('Preferences updated');
        } catch (error) {
            toast.error('Failed to update settings');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: HiOutlineUser },
        { id: 'security', label: 'Security', icon: HiOutlineLockClosed },
        { id: 'preferences', label: 'Preferences', icon: HiOutlineGlobeAlt },
    ];

    return (
        <div className="animate-fade-in space-y-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-dark-text">Settings</h1>
                <p className="text-dark-text-secondary text-sm mt-1">Manage your account and preferences</p>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Tabs Sidebar */}
                <div className="w-full md:w-64 space-y-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === tab.id
                                    ? 'bg-primary/15 text-primary'
                                    : 'text-dark-text-secondary hover:bg-dark-card-hover'
                                }`}
                        >
                            <tab.icon className="text-lg" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    <div className="glass-card p-6 md:p-8">
                        {activeTab === 'profile' && (
                            <form onSubmit={handleProfileUpdate} className="space-y-6">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-white">
                                        {user?.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-dark-text">Personal Information</h3>
                                        <p className="text-sm text-dark-text-secondary">Update your public profile data</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-dark-text-secondary">Full Name</label>
                                        <input
                                            type="text"
                                            value={profileForm.name}
                                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-dark-text focus:border-primary focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-dark-text-secondary">Email Address</label>
                                        <input
                                            type="email"
                                            value={profileForm.email}
                                            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-dark-text focus:border-primary focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-dark-text-secondary">Phone Number</label>
                                        <input
                                            type="text"
                                            value={profileForm.phone}
                                            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                            placeholder="+1 (555) 000-0000"
                                            className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-dark-text focus:border-primary focus:outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-medium text-dark-text-secondary">Bio</label>
                                        <textarea
                                            value={profileForm.bio}
                                            onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                                            rows="4"
                                            className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-dark-text focus:border-primary focus:outline-none transition-all resize-none"
                                        ></textarea>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2.5 gradient-bg text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </form>
                        )}

                        {activeTab === 'security' && (
                            <form onSubmit={handlePasswordChange} className="space-y-6">
                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold text-dark-text">Password & Security</h3>
                                    <p className="text-sm text-dark-text-secondary">Update your password to keep your account secure</p>
                                </div>

                                <div className="space-y-4 max-w-md">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-dark-text-secondary">Current Password</label>
                                        <input
                                            type="password"
                                            value={passwordForm.currentPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-dark-text focus:border-primary focus:outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-dark-text-secondary">New Password</label>
                                        <input
                                            type="password"
                                            value={passwordForm.newPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-dark-text focus:border-primary focus:outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-dark-text-secondary">Confirm New Password</label>
                                        <input
                                            type="password"
                                            value={passwordForm.confirmPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-dark-text focus:border-primary focus:outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2.5 gradient-bg text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Updating...' : 'Update Password'}
                                </button>
                            </form>
                        )}

                        {activeTab === 'preferences' && (
                            <form onSubmit={handleSettingsUpdate} className="space-y-8">
                                <div>
                                    <h3 className="text-lg font-semibold text-dark-text mb-6">Application Preferences</h3>

                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-4 bg-dark-bg/50 rounded-2xl">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                    <HiOutlineBell className="text-xl text-primary" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-dark-text">Price Alerts</p>
                                                    <p className="text-xs text-dark-text-secondary">Get notified when stocks hit your targets</p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={prefForm.notifications.priceAlerts}
                                                    onChange={(e) => setPrefForm({
                                                        ...prefForm,
                                                        notifications: { ...prefForm.notifications, priceAlerts: e.target.checked }
                                                    })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-dark-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-dark-bg/50 rounded-2xl">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                                                    <HiOutlineCheckCircle className="text-xl text-accent" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-dark-text">Email Notifications</p>
                                                    <p className="text-xs text-dark-text-secondary">Weekly performance reports via email</p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={prefForm.notifications.emailNotifications}
                                                    onChange={(e) => setPrefForm({
                                                        ...prefForm,
                                                        notifications: { ...prefForm.notifications, emailNotifications: e.target.checked }
                                                    })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-dark-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-dark-text-secondary">Currency Display</label>
                                            <select
                                                value={prefForm.currency}
                                                onChange={(e) => setPrefForm({ ...prefForm, currency: e.target.value })}
                                                className="w-full max-w-xs px-4 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-dark-text focus:border-primary focus:outline-none transition-all"
                                            >
                                                <option value="USD">USD ($)</option>
                                                <option value="EUR">EUR (€)</option>
                                                <option value="GBP">GBP (£)</option>
                                                <option value="INR">INR (₹)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2.5 gradient-bg text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save Preferences'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
