const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// Robust CORS configuration for Production & Development
const configuredOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map(url => url.trim().replace(/\/$/, ''))
    .filter(Boolean);

const defaultDevOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173',
    'http://127.0.0.1:5173'
];

const allowedOrigins = Array.from(new Set([...configuredOrigins, ...defaultDevOrigins]));

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);

        // Allow configured origins
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            return callback(null, true);
        }

        // Allow Vercel preview or production deployments
        if (origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }

        return callback(null, true); // fallback allow for seamless client access
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Mount routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/salons', require('./routes/salons'));
app.use('/api/slots', require('./routes/slots'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));

// Root & Health check endpoints
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Salon Finder API is operational',
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/api/health', (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    res.status(isDbConnected ? 200 : 503).json({
        success: isDbConnected,
        message: isDbConnected ? 'API and Database healthy' : 'Database connection pending',
        database: isDbConnected ? 'connected' : 'disconnected',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

// Error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, () => {
    console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections without crashing the server
process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection: ${err.message || err}`);
});
