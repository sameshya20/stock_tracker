import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    HiOutlineHome, HiOutlineChartPie, HiOutlineChartBar,
    HiOutlineUser, HiOutlineCog6Tooth, HiOutlineChatBubbleLeftRight,
    HiOutlineArrowRightOnRectangle, HiOutlineBriefcase
} from 'react-icons/hi2';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const links = [
        { to: '/', icon: HiOutlineHome, label: 'Dashboard' },
        { to: '/portfolio', icon: HiOutlineBriefcase, label: 'Portfolio' },
        { to: '/stats', icon: HiOutlineChartBar, label: 'Analytics' },
        { to: '/chat', icon: HiOutlineChatBubbleLeftRight, label: 'AI Chat' },
        { to: '/profile', icon: HiOutlineUser, label: 'Profile' },
        { to: '/settings', icon: HiOutlineCog6Tooth, label: 'Settings' },
    ];

    return (
        <aside className="fixed left-0 top-0 h-screen w-[72px] hover:w-[240px] bg-dark-sidebar border-r border-dark-border flex flex-col transition-all duration-300 z-50 group overflow-hidden">
            {/* Logo */}
            <div className="h-16 flex items-center px-4 border-b border-dark-border gap-3">
                <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0">
                    <HiOutlineChartPie className="text-white text-xl" />
                </div>
                <span className="text-lg font-bold gradient-text whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    StockTracker
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1">
                {links.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group/link ${isActive
                                ? 'bg-primary/15 text-primary'
                                : 'text-dark-text-secondary hover:bg-dark-card-hover hover:text-dark-text'
                            }`
                        }
                    >
                        <Icon className="text-xl flex-shrink-0" />
                        <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm font-medium">
                            {label}
                        </span>
                    </NavLink>
                ))}
            </nav>

            {/* User */}
            <div className="p-3 border-t border-dark-border">
                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 text-sm font-bold text-white">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden">
                        <p className="text-sm font-medium text-dark-text truncate">{user?.name}</p>
                        <p className="text-xs text-dark-text-secondary truncate">{user?.email}</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-dark-text-secondary hover:text-danger hover:bg-danger/10 transition-all duration-200 w-full"
                >
                    <HiOutlineArrowRightOnRectangle className="text-xl flex-shrink-0" />
                    <span className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm font-medium">
                        Logout
                    </span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
