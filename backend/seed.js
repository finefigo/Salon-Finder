/**
 * Seed Script - Connects to TiDB Cloud and seeds initial data
 * Run with: node seed.js
 */

require('dotenv').config();
const { connectDB } = require('./config/db');

console.log('🌱 Starting TiDB Cloud Database Seeding...');
connectDB().then(() => {
    setTimeout(() => {
        console.log('🎉 Seeding completed successfully!');
        process.exit(0);
    }, 3000);
}).catch(err => {
    console.error('❌ Seeding error:', err.message);
    process.exit(1);
});
