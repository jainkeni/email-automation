const express = require('express');
const { getSupabase } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

// GET /api/customers — list with search/filter/pagination
router.get('/', async (req, res) => {
    try {
        const { search, status, page = 1, limit = 50 } = req.query;
        const supabase = getSupabase();
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const { data: validQuotes } = await supabase.from('quotations').select('customer_id').in('status', ['APPROVED', 'SENT']);
        const validCustomerIds = validQuotes ? [...new Set(validQuotes.map(q => q.customer_id).filter(id => id != null))] : [];

        if (validCustomerIds.length === 0) {
            return res.json({ customers: [], pagination: { total: 0, page: parseInt(page), limit: parseInt(limit), pages: 0 } });
        }

        let query = supabase
            .from('customers')
            .select('*', { count: 'exact' })
            .in('id', validCustomerIds);

        if (status) query = query.eq('status', status);
        if (search) {
            query = query.or(
                `company_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`
            );
        }

        query = query.order('company_name', { ascending: true }).range(offset, offset + parseInt(limit) - 1);

        const { data, error, count } = await query;
        if (error) {
            console.error('Error fetching customers:', error);
            return res.status(500).json({ message: 'Failed to fetch customers.' });
        }

        res.json({
            customers: data || [],
            pagination: {
                total: count || 0,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil((count || 0) / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ message: 'Failed to fetch customers.' });
    }
});

// GET /api/customers/:id
router.get('/:id', async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error || !data) {
            return res.status(404).json({ message: 'Customer not found.' });
        }

        res.json(data);
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ message: 'Failed to fetch customer.' });
    }
});

// GET /api/customers/:id/purchase-history
router.get('/:id/purchase-history', async (req, res) => {
    try {
        const { getCustomerPurchaseProfile } = require('../services/customerPurchaseProfile.service');
        const profile = await getCustomerPurchaseProfile(req.params.id);
        res.json(profile);
    } catch (error) {
        console.error('Error fetching purchase history:', error);
        res.status(500).json({ message: 'Failed to fetch purchase history.' });
    }
});

// POST /api/customers — create
router.post('/', async (req, res) => {
    try {
        const { company_name, contact_name, email, phone, crm_customer_id, status } = req.body;
        if (!company_name || !email) {
            return res.status(400).json({ message: 'Company name and email are required.' });
        }

        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('customers')
            .insert({
                company_name, contact_name: contact_name || '', email,
                phone: phone || '', crm_customer_id: crm_customer_id || '',
                status: status || 'active',
            })
            .select('*')
            .single();

        if (error) {
            if (error.message.includes('duplicate')) {
                return res.status(409).json({ message: 'A customer with this email already exists.' });
            }
            console.error('Error creating customer:', error);
            return res.status(500).json({ message: 'Failed to create customer.' });
        }

        res.status(201).json({ message: 'Customer created.', customer: data });
    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({ message: 'Failed to create customer.' });
    }
});

// PUT /api/customers/:id
router.put('/:id', async (req, res) => {
    try {
        const supabase = getSupabase();
        const updateData = {};
        const fields = ['company_name', 'contact_name', 'email', 'phone', 'crm_customer_id', 'status'];
        fields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });

        const { data, error } = await supabase
            .from('customers')
            .update(updateData)
            .eq('id', req.params.id)
            .select('*')
            .single();

        if (error || !data) {
            return res.status(error ? 500 : 404).json({ message: error ? 'Failed to update customer.' : 'Customer not found.' });
        }

        res.json({ message: 'Customer updated.', customer: data });
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ message: 'Failed to update customer.' });
    }
});

module.exports = router;
