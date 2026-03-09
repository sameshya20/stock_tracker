const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { Portfolio } = require('../models/Portfolio');
const { Watchlist } = require('../models/Watchlist');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};

// @desc    Register user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Create user
        const user = await User.create({ name, email, password });

        // Create empty portfolio and watchlist
        await Portfolio.create({ userId: user.id });
        await Watchlist.create({ userId: user.id });

        const token = generateToken(user.id);

        res.status(201).json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                theme: user.theme,
                notifications: user.notifications
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = generateToken(user.id);

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                theme: user.theme,
                notifications: user.notifications
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            phone: user.phone,
            bio: user.bio,
            theme: user.theme,
            notifications: user.notifications,
            currency: user.currency,
            createdAt: user.createdAt
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
    try {
        const { name, email, phone, bio, avatar } = req.body;

        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (name) user.name = name;
        if (email) user.email = email;
        if (phone !== undefined) user.phone = phone;
        if (bio !== undefined) user.bio = bio;
        if (avatar !== undefined) user.avatar = avatar;

        await user.save();

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            bio: user.bio,
            avatar: user.avatar
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error updating profile' });
    }
};

// @desc    Change password
// @route   PUT /api/auth/password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findByPk(req.user.id);

        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error changing password' });
    }
};

// @desc    Update settings
// @route   PUT /api/auth/settings
exports.updateSettings = async (req, res) => {
    try {
        const { theme, notifications, currency } = req.body;

        const user = await User.findByPk(req.user.id);

        if (theme) user.theme = theme;
        if (notifications) user.notifications = { ...user.notifications, ...notifications };
        if (currency) user.currency = currency;

        await user.save();

        res.json({
            theme: user.theme,
            notifications: user.notifications,
            currency: user.currency
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error updating settings' });
    }
};
