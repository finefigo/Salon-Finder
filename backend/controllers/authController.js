const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { randomUUID: uuidv4 } = require('crypto');
const db = require('../config/db');

// Validation rules
exports.registerValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    body('role')
        .optional()
        .isIn(['customer', 'salonOwner'])
        .withMessage('Role must be customer or salonOwner')
];

exports.loginValidation = [
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password').notEmpty().withMessage('Password is required')
];

// Helper to sign JWT
const signToken = (id, role) => {
    return jwt.sign(
        { id, role },
        process.env.JWT_SECRET || 'salon_secret_key_change_in_production_12345',
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
    try {
        const { name, email, password, role = 'customer', phone } = req.body;

        // Check if user exists
        const existing = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        const id = uuidv4();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await db.query(`
            INSERT INTO users (id, name, email, password, role, phone)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id, name, email, hashedPassword, role, phone || null]);

        const token = signToken(id, role);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id,
                    _id: id,
                    name,
                    email,
                    role
                },
                token
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const users = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = users[0];

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated. Please contact support.'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const token = signToken(user.id, user.role);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    _id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                token
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res, next) => {
    try {
        const users = await db.query(
            'SELECT id, name, email, phone, role, avatar, latitude, longitude, address, isActive, createdAt FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = users[0];
        res.status(200).json({
            success: true,
            data: {
                ...user,
                _id: user.id
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
exports.updateProfile = async (req, res, next) => {
    try {
        const { name, phone } = req.body;
        await db.query('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?', [
            name || null,
            phone || null,
            req.user.id
        ]);

        const [user] = await db.query('SELECT id, name, email, phone, role FROM users WHERE id = ?', [req.user.id]);
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: { ...user, _id: user.id }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update user location
 * @route   PUT /api/auth/location
 * @access  Private
 */
exports.updateLocation = async (req, res, next) => {
    try {
        const { latitude, longitude, address } = req.body;
        await db.query(`
            UPDATE users
            SET latitude = ?, longitude = ?, address = ?
            WHERE id = ?
        `, [latitude, longitude, address || null, req.user.id]);

        res.status(200).json({
            success: true,
            message: 'Location updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/password
 * @access  Private
 */
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const [user] = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        const isMatch = await bcrypt.compare(currentPassword, user.password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        next(error);
    }
};
