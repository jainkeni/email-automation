const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getSupabase } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });
        }

        const supabase = getSupabase();

        // Check if admin already exists
        const { data: existing } = await supabase
            .from('admins')
            .select('id')
            .eq('email', email.toLowerCase())
            .maybeSingle();

        if (existing) {
            return res.status(400).json({ message: 'Email already registered.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create admin
        const { data: admin, error } = await supabase
            .from('admins')
            .insert({ name, email: email.toLowerCase(), password: hashedPassword })
            .select('id, name, email')
            .single();

        if (error) {
            console.error('Registration error:', error);
            return res.status(500).json({ message: 'Failed to register.' });
        }

        const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET, {
            expiresIn: '7d',
        });

        res.status(201).json({
            message: 'Admin registered successfully.',
            token,
            admin: { id: admin.id, name: admin.name, email: admin.email },
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const supabase = getSupabase();

        const { data: admin, error } = await supabase
            .from('admins')
            .select('*')
            .eq('email', email.toLowerCase())
            .maybeSingle();

        if (error || !admin) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET, {
            expiresIn: '7d',
        });

        res.json({
            message: 'Login successful.',
            token,
            admin: { id: admin.id, name: admin.name, email: admin.email },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
    res.json({ admin: req.admin });
});

module.exports = router;
