const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB, getPool } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load env vars
dotenv.config();

// Connect to TiDB Cloud Database
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
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            return callback(null, true);
        }
        if (origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Mount routes (supporting both /api prefix and root aliases)
app.use('/api/auth', require('./routes/auth'));
app.use('/auth', require('./routes/auth'));

app.use('/api/salons', require('./routes/salons'));
app.use('/salons', require('./routes/salons'));

app.use('/api/slots', require('./routes/slots'));
app.use('/slots', require('./routes/slots'));

app.use('/api/bookings', require('./routes/bookings'));
app.use('/bookings', require('./routes/bookings'));

app.use('/api/admin', require('./routes/admin'));
app.use('/admin', require('./routes/admin'));

// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Salon Finder API is operational with TiDB Cloud Serverless',
        databaseEngine: 'MySQL / TiDB Serverless',
        environment: process.env.NODE_ENV || 'production'
    });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    let isDbConnected = false;
    try {
        const pool = getPool();
        if (pool) {
            await pool.query('SELECT 1');
            isDbConnected = true;
        }
    } catch (e) {
        isDbConnected = false;
    }

    res.status(isDbConnected ? 200 : 503).json({
        success: isDbConnected,
        message: isDbConnected ? 'API and TiDB Cloud Database healthy' : 'Database connection pending',
        database: isDbConnected ? 'connected' : 'disconnected',
        dbType: 'TiDB Cloud Serverless (MySQL)',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

// Error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'production';

const server = app.listen(PORT, () => {
    console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections without crashing the server
process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection: ${err.message || err}`);
});
