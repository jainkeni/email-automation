const http = require('http');
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

const { initSupabase } = require('./config/db');
const { initializeAI } = require('./services/aiService');
const { initializeTransporter } = require('./services/emailSender');
const { fetchNewEmails } = require('./services/emailFetcher');


const authRoutes = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const productRoutes = require('./routes/productRoutes');
const customerRoutes = require('./routes/customerRoutes');
const quotationRoutes = require('./routes/quotationRoutes');

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
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/quotations', quotationRoutes);

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

        // Schedule email fetching every 3 seconds
        let isFetching = false;
        cron.schedule('*/3 * * * * *', async () => {
            if (isFetching) return; // Prevent overlapping if one fetch takes longer than 3 seconds
            isFetching = true;
            try {
                await fetchNewEmails();
            } finally {
                isFetching = false;
            }
        });
        console.log('📅 Email fetch cron job scheduled (every 3 seconds)');

        // Create HTTP server
        const httpServer = http.createServer(app);

        // Start server
        httpServer.listen(PORT, () => {
            console.log(`\n🚀 Server running on http://localhost:${PORT}`);
            console.log(`📬 Email polling active (every 3 seconds)`);
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
