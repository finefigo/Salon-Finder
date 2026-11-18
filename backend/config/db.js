const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 * Uses MONGODB_URI or MONGO_URI from environment variables.
 * Gracefully retries on failure to keep the HTTP server alive on Render.
 */
let isConnecting = false;

const connectDB = async () => {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!uri) {
        console.error('❌ MongoDB Configuration Error: Neither MONGO_URI nor MONGODB_URI is defined.');
        console.error('👉 Please configure MONGO_URI in your Render environment variables dashboard.');
        return;
    }

    if (uri.includes('cluster.mongodb.net') && uri.includes('username:password')) {
        console.error('❌ MongoDB Connection Error: MONGO_URI is using the example placeholder string:');
        console.error(`   ${uri}`);
        console.error('👉 Please replace it with your real MongoDB Atlas connection string in Render Environment Variables:');
        console.error('   Render Dashboard → Your Service → Environment → Edit MONGO_URI');
        return;
    }

    if (isConnecting) return;
    isConnecting = true;

    try {
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);
        isConnecting = false;
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        if (error.message.includes('ENOTFOUND') || error.message.includes('querySrv')) {
            console.error('💡 Tip: Verify your MongoDB Atlas cluster hostname and ensure Network Access (0.0.0.0/0) is enabled in Atlas.');
        }
        isConnecting = false;

        // Auto-retry connection every 8 seconds without crashing the web process
        console.log('🔄 Will retry connecting to MongoDB in 8 seconds...');
        setTimeout(() => {
            connectDB();
        }, 8000);
    }
};

module.exports = connectDB;
