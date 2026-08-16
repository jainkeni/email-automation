const jwt = require('jsonwebtoken');
const { getSupabase } = require('../config/db');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const supabase = getSupabase();
        const { data: admin, error } = await supabase
            .from('admins')
            .select('id, name, email')
            .eq('id', decoded.id)
            .single();

        if (error || !admin) {
            return res.status(401).json({ message: 'Invalid token. Admin not found.' });
        }

        req.admin = admin;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired. Please login again.' });
        }
        return res.status(401).json({ message: 'Invalid token.' });
    }
};

module.exports = authMiddleware;
