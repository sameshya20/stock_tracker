import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 15000,
});

// Request interceptor to add auth token
API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const currentPath = window.location.pathname;
            // Only redirect if not already on public pages
            if (currentPath !== '/login' && currentPath !== '/register') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                // Dispatch a custom event so React can handle navigation cleanly
                window.dispatchEvent(new Event('auth:logout'));
            }
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: (data) => API.post('/auth/register', data),
    login: (data) => API.post('/auth/login', data),
    getMe: () => API.get('/auth/me'),
    updateProfile: (data) => API.put('/auth/profile', data),
    changePassword: (data) => API.put('/auth/password', data),
    updateSettings: (data) => API.put('/auth/settings', data),
};

// Stock API
export const stockAPI = {
    getQuote: (symbol) => API.get(`/stocks/quote/${symbol}`),
    getMultipleQuotes: (symbols) => API.post('/stocks/quotes', { symbols }),
    getHistoricalData: (symbol, range, interval) =>
        API.get(`/stocks/history/${symbol}?range=${range}&interval=${interval}`),
    searchStocks: (query) => API.get(`/stocks/search?q=${query}`),
    getTrending: () => API.get('/stocks/trending'),
    getMovers: () => API.get('/stocks/movers'),
    getIndices: () => API.get('/stocks/indices'),
};

// Portfolio API
export const portfolioAPI = {
    getPortfolio: () => API.get('/portfolio'),
    addStock: (data) => API.post('/portfolio/add', data),
    updateStock: (stockId, data) => API.put(`/portfolio/${stockId}`, data),
    removeStock: (stockId) => API.delete(`/portfolio/${stockId}`),
    getAnalytics: () => API.get('/portfolio/analytics'),
};

// Watchlist API
export const watchlistAPI = {
    getWatchlist: () => API.get('/watchlist'),
    addStock: (data) => API.post('/watchlist/add', data),
    removeStock: (stockId) => API.delete(`/watchlist/${stockId}`),
};

// Alerts API
export const alertAPI = {
    getAlerts: () => API.get('/alerts'),
    createAlert: (data) => API.post('/alerts', data),
    updateAlert: (alertId, data) => API.put(`/alerts/${alertId}`, data),
    deleteAlert: (alertId) => API.delete(`/alerts/${alertId}`)
};

// Chat API
export const chatAPI = {
    sendMessage: (data) => API.post('/chat/message', data),
    getChatHistory: () => API.get('/chat/history'),
    getChat: (chatId) => API.get(`/chat/${chatId}`),
    deleteChat: (chatId) => API.delete(`/chat/${chatId}`),
};

export default API;
