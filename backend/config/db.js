const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { randomUUID: uuidv4 } = require('crypto');

let pool = null;

/**
 * Parse database connection configuration
 */
const getDbConfig = () => {
    const rawUri = process.env.DATABASE_URL || process.env.MYSQL_URI || process.env.TIDB_URL ||
        'mysql://4XnCs9eMy8vVCEx.root:NhX3pWI4iIceyGOv@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/salonfinder';

    try {
        const parsed = new URL(rawUri);
        return {
            host: parsed.hostname,
            port: parsed.port ? parseInt(parsed.port) : 4000,
            user: decodeURIComponent(parsed.username),
            password: decodeURIComponent(parsed.password),
            database: parsed.pathname.replace(/^\//, '') || 'salonfinder',
            ssl: {
                rejectUnauthorized: true
            },
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        };
    } catch (e) {
        return {
            host: process.env.DB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
            port: parseInt(process.env.DB_PORT || '4000'),
            user: process.env.DB_USER || '4XnCs9eMy8vVCEx.root',
            password: process.env.DB_PASSWORD || 'NhX3pWI4iIceyGOv',
            database: process.env.DB_NAME || 'salonfinder',
            ssl: {
                rejectUnauthorized: true
            },
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        };
    }
};

/**
 * Connect to TiDB and ensure tables & seed data are initialized
 */
const connectDB = async () => {
    try {
        const config = getDbConfig();
        console.log(`Connecting to TiDB Cloud (${config.host}:${config.port})...`);

        // First connect without database to ensure DB exists
        const rootConn = await mysql.createConnection({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            ssl: config.ssl
        });

        await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\`;`);
        await rootConn.end();

        // Create connection pool connected to our database
        pool = mysql.createPool(config);

        // Test pool
        const [rows] = await pool.query('SELECT 1 + 1 AS result');
        console.log(`✅ TiDB Cloud MySQL Connected Successfully!`);

        // Initialize schema tables
        await initializeSchema();

        // Seed default accounts if needed
        await seedDefaultData();

    } catch (error) {
        console.error(`❌ TiDB Connection Error: ${error.message}`);
        console.log('🔄 Will retry connecting to TiDB in 8 seconds...');
        setTimeout(() => {
            connectDB();
        }, 8000);
    }
};

/**
 * Initialize all database tables
 */
const initializeSchema = async () => {
    console.log('📦 Verifying TiDB database schema tables...');

    // Users table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(150) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            phone VARCHAR(25) DEFAULT NULL,
            role ENUM('customer', 'salonOwner', 'admin') DEFAULT 'customer',
            avatar VARCHAR(255) DEFAULT 'default-avatar.png',
            latitude DOUBLE DEFAULT NULL,
            longitude DOUBLE DEFAULT NULL,
            address TEXT DEFAULT NULL,
            isActive BOOLEAN DEFAULT TRUE,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Salons table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS salons (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            description TEXT,
            ownerId VARCHAR(36) NOT NULL,
            email VARCHAR(150),
            phone VARCHAR(25) NOT NULL,
            latitude DOUBLE NOT NULL,
            longitude DOUBLE NOT NULL,
            formattedAddress TEXT,
            street VARCHAR(150),
            city VARCHAR(100),
            state VARCHAR(100),
            zipcode VARCHAR(25),
            country VARCHAR(100) DEFAULT 'India',
            workingHours JSON,
            slotDuration INT DEFAULT 30,
            images JSON,
            coverImage VARCHAR(500) DEFAULT 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80',
            amenities JSON,
            averageRating DOUBLE DEFAULT 4.8,
            totalReviews INT DEFAULT 0,
            isVerified BOOLEAN DEFAULT FALSE,
            isActive BOOLEAN DEFAULT TRUE,
            verifiedAt DATETIME DEFAULT NULL,
            verifiedBy VARCHAR(36) DEFAULT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_salon_owner (ownerId),
            INDEX idx_salon_city (city),
            INDEX idx_salon_lat_lng (latitude, longitude)
        );
    `);

    // Services table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS services (
            id VARCHAR(36) PRIMARY KEY,
            salonId VARCHAR(36) NOT NULL,
            name VARCHAR(150) NOT NULL,
            description TEXT,
            category VARCHAR(50) DEFAULT 'haircut',
            price DOUBLE NOT NULL,
            duration INT DEFAULT 30,
            gender VARCHAR(20) DEFAULT 'unisex',
            isActive BOOLEAN DEFAULT TRUE,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_services_salon (salonId)
        );
    `);

    // Slots table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS slots (
            id VARCHAR(36) PRIMARY KEY,
            salonId VARCHAR(36) NOT NULL,
            date DATE NOT NULL,
            startTime VARCHAR(10) NOT NULL,
            endTime VARCHAR(10) NOT NULL,
            isAvailable BOOLEAN DEFAULT TRUE,
            isEnabled BOOLEAN DEFAULT TRUE,
            bookedById VARCHAR(36) DEFAULT NULL,
            bookingId VARCHAR(36) DEFAULT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_slots_salon_date (salonId, date),
            UNIQUE KEY uq_salon_date_start (salonId, date, startTime)
        );
    `);

    // Bookings table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS bookings (
            id VARCHAR(36) PRIMARY KEY,
            customerId VARCHAR(36) NOT NULL,
            salonId VARCHAR(36) NOT NULL,
            slotId VARCHAR(36) NOT NULL,
            services JSON NOT NULL,
            bookingDate DATE NOT NULL,
            bookingTime VARCHAR(10) NOT NULL,
            totalAmount DOUBLE NOT NULL,
            customerNotes TEXT,
            salonNotes TEXT,
            status ENUM('pending', 'confirmed', 'completed', 'cancelled', 'no-show') DEFAULT 'confirmed',
            cancelledBy VARCHAR(25) DEFAULT NULL,
            cancellationReason TEXT,
            cancelledAt DATETIME DEFAULT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_bookings_customer (customerId),
            INDEX idx_bookings_salon (salonId),
            INDEX idx_bookings_date (bookingDate)
        );
    `);

    // Reviews table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS reviews (
            id VARCHAR(36) PRIMARY KEY,
            customerId VARCHAR(36) NOT NULL,
            salonId VARCHAR(36) NOT NULL,
            bookingId VARCHAR(36) DEFAULT NULL,
            rating INT NOT NULL,
            comment TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_reviews_salon (salonId)
        );
    `);

    console.log('✅ Schema tables verified.');
};

/**
 * Seed default Admin, Salon Owner, and Studio if empty
 */
const seedDefaultData = async () => {
    try {
        // Admin
        const [adminRows] = await pool.query('SELECT id FROM users WHERE email = ?', ['admin@salonfinder.com']);
        let adminId;
        if (adminRows.length === 0) {
            adminId = uuidv4();
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash('admin123', salt);
            await pool.query(`
                INSERT INTO users (id, name, email, password, phone, role)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [adminId, 'Admin User', 'admin@salonfinder.com', hashed, '+91 9999999999', 'admin']);
            console.log('✅ Default Admin seeded: admin@salonfinder.com / admin123');
        } else {
            adminId = adminRows[0].id;
        }

        // Salon Owner
        const [ownerRows] = await pool.query('SELECT id FROM users WHERE email = ?', ['owner@salon.com']);
        let ownerId;
        if (ownerRows.length === 0) {
            ownerId = uuidv4();
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash('owner123', salt);
            await pool.query(`
                INSERT INTO users (id, name, email, password, phone, role)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [ownerId, 'Demo Salon Owner', 'owner@salon.com', hashed, '+91 8888888888', 'salonOwner']);
            console.log('✅ Default Salon Owner seeded: owner@salon.com / owner123');
        } else {
            ownerId = ownerRows[0].id;
        }

        // Sample Salon
        const [salonRows] = await pool.query('SELECT id FROM salons WHERE ownerId = ?', [ownerId]);
        let salonId;
        if (salonRows.length === 0) {
            salonId = uuidv4();
            const workingHours = JSON.stringify({
                monday: { open: '09:00', close: '21:00', isClosed: false },
                tuesday: { open: '09:00', close: '21:00', isClosed: false },
                wednesday: { open: '09:00', close: '21:00', isClosed: false },
                thursday: { open: '09:00', close: '21:00', isClosed: false },
                friday: { open: '09:00', close: '21:00', isClosed: false },
                saturday: { open: '09:00', close: '21:00', isClosed: false },
                sunday: { open: '10:00', close: '18:00', isClosed: false }
            });
            const amenities = JSON.stringify(['wifi', 'ac', 'card-payment', 'parking']);
            const images = JSON.stringify([
                'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80',
                'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=600&q=80'
            ]);

            await pool.query(`
                INSERT INTO salons (
                    id, name, description, ownerId, email, phone,
                    latitude, longitude, formattedAddress, street, city, state, country,
                    workingHours, slotDuration, images, coverImage, amenities,
                    averageRating, totalReviews, isVerified, isActive
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                salonId,
                'Premium Style Studio',
                'A premium salon offering world-class grooming services with certified stylists and relaxed atmosphere.',
                ownerId,
                'owner@salon.com',
                '+91 8888888888',
                28.6139,
                77.2090,
                '123 Main Street, Connaught Place, New Delhi',
                'Connaught Place',
                'Delhi',
                'Delhi',
                'India',
                workingHours,
                30,
                images,
                'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80',
                amenities,
                4.9,
                24,
                true,
                true
            ]);
            console.log('✅ Default Salon seeded: Premium Style Studio (Connaught Place, Delhi)');

            // Seed Sample Services for this salon
            const sampleServices = [
                { name: 'Executive Haircut & Styling', category: 'haircut', price: 450, duration: 30 },
                { name: 'Beard Trim & Hot Towel Shave', category: 'beard', price: 300, duration: 25 },
                { name: 'Organic Charcoal Facial', category: 'facial', price: 850, duration: 45 },
                { name: 'Head & Shoulder De-stress Massage', category: 'spa', price: 600, duration: 30 }
            ];

            for (const s of sampleServices) {
                await pool.query(`
                    INSERT INTO services (id, salonId, name, category, price, duration, gender)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [uuidv4(), salonId, s.name, s.category, s.price, s.duration, 'unisex']);
            }
            console.log('✅ Sample Services seeded.');
        }

    } catch (e) {
        console.warn('Seed notice:', e.message);
    }
};

/**
 * Execute query helper
 */
const query = async (sql, params = []) => {
    if (!pool) {
        throw new Error('Database connection pool is not ready yet');
    }
    const [results] = await pool.query(sql, params);
    return results;
};

module.exports = {
    connectDB,
    query,
    getPool: () => pool
};
