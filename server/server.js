require('dotenv').config();
const dns = require('dns');
// Prefer IPv4 globally to fix Supabase/Render DNS issues
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { connectDB } = require('./config/db');
const path = require('path');
const StockService = require('./services/stockService');
const { sendAlertEmail } = require('./services/emailService');
const Alert = require('./models/Alert');
const User = require('./models/User');

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/stocks', require('./routes/stockRoutes'));
app.use('/api/portfolio', require('./routes/portfolioRoutes'));
app.use('/api/watchlist', require('./routes/watchlistRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));

    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.resolve(__dirname, '../client', 'dist', 'index.html'));
    });
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// WebSocket connection handling
const activeSubscriptions = new Map();

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('subscribe', (symbols) => {
        if (Array.isArray(symbols)) {
            activeSubscriptions.set(socket.id, symbols);
            console.log(`${socket.id} subscribed to: ${symbols.join(', ')}`);
        }
    });

    socket.on('unsubscribe', () => {
        activeSubscriptions.delete(socket.id);
    });

    socket.on('disconnect', () => {
        activeSubscriptions.delete(socket.id);
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// Push stock updates every 5 seconds
setInterval(async () => {
    for (const [socketId, symbols] of activeSubscriptions) {
        try {
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
                const quotes = await Promise.all(
                    symbols.map(s => StockService.getQuote(s))
                );
                socket.emit('stockUpdate', quotes);
            } else {
                activeSubscriptions.delete(socketId);
            }
        } catch (error) {
            console.error('WebSocket update error:', error.message);
        }
    }
}, 5000);

// Check price alerts every 60 seconds
setInterval(async () => {
    try {
        const activeAlerts = await Alert.findAll({
            where: { isActive: true },
            include: [{ model: User, as: 'user', attributes: ['email'] }]
        });

        if (!activeAlerts || activeAlerts.length === 0) return;

        const symbols = [...new Set(activeAlerts.map(a => a.symbol))];
        const quotes = await Promise.all(symbols.map(s => StockService.getQuote(s)));
        const quoteMap = {};
        symbols.forEach((s, idx) => {
            if (quotes[idx] && quotes[idx].price) {
                quoteMap[s] = quotes[idx].price;
            }
        });

        for (const alert of activeAlerts) {
            const currentPrice = quoteMap[alert.symbol];
            if (!currentPrice || !alert.user || !alert.user.email) continue;

            let triggered = false;
            if (alert.condition === 'below' && currentPrice <= alert.targetPrice) {
                triggered = true;
            } else if (alert.condition === 'above' && currentPrice >= alert.targetPrice) {
                triggered = true;
            }

            if (triggered) {
                await sendAlertEmail(alert.user.email, alert.symbol, alert.condition, alert.targetPrice, currentPrice);
                alert.isActive = false;
                alert.lastTriggeredAt = new Date();
                await alert.save();
                console.log(`Alert triggered for ${alert.user.email}: ${alert.symbol} went ${alert.condition} ${alert.targetPrice}`);
            }
        }
    } catch (err) {
        console.error('Error running alerts check:', err.message);
    }
}, 60000);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════╗
  ║   AI Stock Tracker Server Running    ║
  ║   Port: ${PORT}                         ║
  ║   Mode: ${process.env.NODE_ENV || 'development'}                  ║
  ╚══════════════════════════════════════╝
    `);
});