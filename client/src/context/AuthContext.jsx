import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    }, []);

    useEffect(() => {
        // Listen for auth:logout event dispatched by api.js when 401 is received
        const handleForceLogout = () => {
            setToken(null);
            setUser(null);
        };
        window.addEventListener('auth:logout', handleForceLogout);
        return () => window.removeEventListener('auth:logout', handleForceLogout);
    }, []);

    useEffect(() => {
        if (token) {
            loadUser();
        } else {
            setLoading(false);
        }
    }, []);

    const loadUser = async () => {
        try {
            const { data } = await authAPI.getMe();
            setUser(data);
        } catch (error) {
            console.error('Load user error:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const { data } = await authAPI.login({ email, password });
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        return data;
    };

    const register = async (name, email, password) => {
        const { data } = await authAPI.register({ name, email, password });
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        return data;
    };



    const updateUser = (updatedData) => {
        setUser(prev => ({ ...prev, ...updatedData }));
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, loadUser }}>
            {children}
        </AuthContext.Provider>
    );
};
