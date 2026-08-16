const http = require('http');
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

const { initSupabase } = require('./config/db');
const { initializeAI } = require('./services/aiService');
const { initializeTransporter } = require('./services/emailSender');
const { fetchNewEmails } = require('./services/emailFetcher');
const { initWebSocket } = require('./services/socketService');

const authRoutes = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5174',
    credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manual email fetch trigger (for testing)
app.post('/api/fetch-emails', async (req, res) => {
    try {
        await fetchNewEmails();
        res.json({ message: 'Email fetch triggered successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch emails.', error: error.message });
    }
});

// Initialize and start
const startServer = async () => {
    try {
        // Initialize Supabase client
        initSupabase();

        // Initialize AI
        initializeAI();

        // Initialize email transporter
        initializeTransporter();

        // Schedule email fetching every 2 minutes
        cron.schedule('*/2 * * * *', async () => {
            console.log('⏰ Cron: Fetching new emails...');
            await fetchNewEmails();
        });

        console.log('📅 Email fetch cron job scheduled (every 2 minutes)');

        // Create HTTP server and attach WebSocket
        const httpServer = http.createServer(app);
        initWebSocket(httpServer);

        // Start server
        httpServer.listen(PORT, () => {
            console.log(`\n🚀 Server running on http://localhost:${PORT}`);
            console.log(`📬 Email polling active (every 2 min)`);
            console.log(`🔌 WebSocket active on ws://localhost:${PORT}/ws`);
            console.log(`🤖 AI Service: ${process.env.GROQ_API_KEY ? 'Enabled (Groq)' : 'Disabled (no API key)'}`);
            console.log(`🗄️  Database: Supabase`);
            console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5174'}\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
