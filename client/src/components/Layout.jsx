import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
    return (
        <div className="flex min-h-screen bg-dark-bg">
            <Sidebar />
            <main className="ml-[72px] flex-1 p-6 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
