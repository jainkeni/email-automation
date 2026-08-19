const express = require('express');
const { getSupabase } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { processQuotationInquiry, recalculateQuotationTotals } = require('../services/quotation.service');
const { generateQuotationEmail } = require('../services/quotationPdf.service');
const { generateQuotationPDF } = require('../services/pdfGenerator');
const { sendReply } = require('../services/emailSender');

const router = express.Router();
router.use(authMiddleware);

// POST /api/quotation/analyze/:inquiryId — analyze email & generate quotation
router.post('/analyze/:inquiryId', async (req, res) => {
    try {
        console.log(`📋 Analyzing inquiry: ${req.params.inquiryId}`);
        const result = await processQuotationInquiry(req.params.inquiryId);

        res.json({
            message: 'Quotation generated successfully.',
            quotation: result.quotation,
            items: result.items,
            customer: result.customer,
            requirements: result.requirements,
        });
    } catch (error) {
        console.error('Error analyzing inquiry:', error.message);
        res.status(error.message.includes('already exists') ? 409 : 500).json({
            message: error.message || 'Failed to analyze inquiry.',
        });
    }
});

// GET /api/quotations — list quotations with filters
router.get('/', async (req, res) => {
    try {
        const { status, customer_id, search, page = 1, limit = 20 } = req.query;
        const supabase = getSupabase();
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = supabase
            .from('quotations')
            .select(`
        id, quotation_number, status, subtotal, discount, tax, grand_total, notes,
        created_at, updated_at, customer_id,
        customers(company_name, contact_name, email),
        quotation_requests(email_id, ai_analysis)
      `, { count: 'exact' });

        if (status && status !== 'all') query = query.eq('status', status);
        if (customer_id) query = query.eq('customer_id', customer_id);
        if (search) {
            query = query.or(`quotation_number.ilike.%${search}%`);
        }

        query = query.order('created_at', { ascending: false }).range(offset, offset + parseInt(limit) - 1);

        const { data, error, count } = await query;
        if (error) {
            console.error('Error fetching quotations:', error);
            return res.status(500).json({ message: 'Failed to fetch quotations.' });
        }

        // Get flagged item counts
        const quotationIds = (data || []).map(q => q.id);
        let flaggedCounts = {};
        if (quotationIds.length > 0) {
            const { data: flagged } = await supabase
                .from('quotation_items')
                .select('quotation_id')
                .in('quotation_id', quotationIds)
                .eq('status', 'NEEDS_REVIEW');

            if (flagged) {
                for (const f of flagged) {
                    flaggedCounts[f.quotation_id] = (flaggedCounts[f.quotation_id] || 0) + 1;
                }
            }
        }

        const quotations = (data || []).map(q => ({
            ...q,
            flaggedLines: flaggedCounts[q.id] || 0,
        }));

        res.json({
            quotations,
            pagination: {
                total: count || 0,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil((count || 0) / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Error fetching quotations:', error);
        res.status(500).json({ message: 'Failed to fetch quotations.' });
    }
});

// GET /api/quotations/:id — single quotation detail
router.get('/:id', async (req, res) => {
    try {
        const supabase = getSupabase();

        const { data: quotation, error } = await supabase
            .from('quotations')
            .select(`
        *,
        customers(id, company_name, contact_name, email, phone),
        quotation_requests(id, email_id, ai_analysis, status)
      `)
            .eq('id', req.params.id)
            .single();

        if (error || !quotation) {
            return res.status(404).json({ message: 'Quotation not found.' });
        }

        // Get items with product info
        const { data: items } = await supabase
            .from('quotation_items')
            .select('*, products(id, sku, name, category, material, size, unit, base_price)')
            .eq('quotation_id', req.params.id)
            .order('created_at', { ascending: true });

        // Get the original email
        let email = null;
        if (quotation.quotation_requests?.email_id) {
            const { data: emailData } = await supabase
                .from('email_requests')
                .select('id, from_email, from_name, subject, body, received_at, message_id')
                .eq('id', quotation.quotation_requests.email_id)
                .single();
            email = emailData;
        }

        res.json({
            quotation,
            items: items || [],
            email,
        });
    } catch (error) {
        console.error('Error fetching quotation:', error);
        res.status(500).json({ message: 'Failed to fetch quotation.' });
    }
});

// PUT /api/quotations/:id — update quotation (notes, discount)
router.put('/:id', async (req, res) => {
    try {
        const supabase = getSupabase();
        const { notes, discount } = req.body;

        const updateData = {};
        if (notes !== undefined) updateData.notes = notes;
        if (discount !== undefined) {
            updateData.discount = discount;
        }

        const { data, error } = await supabase
            .from('quotations')
            .update(updateData)
            .eq('id', req.params.id)
            .select('*')
            .single();

        if (error || !data) {
            return res.status(error ? 500 : 404).json({ message: 'Failed to update quotation.' });
        }

        // Recalculate totals if discount changed
        if (discount !== undefined) {
            await recalculateQuotationTotals(req.params.id);
        }

        // Audit log
        await supabase.from('quotation_audit_logs').insert({
            quotation_id: req.params.id,
            user_id: req.admin.id,
            action: 'DRAFT_SAVED',
            new_value: updateData,
        });

        res.json({ message: 'Quotation updated.', quotation: data });
    } catch (error) {
        console.error('Error updating quotation:', error);
        res.status(500).json({ message: 'Failed to update quotation.' });
    }
});

// PUT /api/quotations/:id/items/:itemId — update a quotation item
router.put('/:id/items/:itemId', async (req, res) => {
    try {
        const supabase = getSupabase();
        const { product_id, quantity, unit_price, status: newStatus } = req.body;

        // Get old item for audit
        const { data: oldItem } = await supabase
            .from('quotation_items')
            .select('*, products(sku, name)')
            .eq('id', req.params.itemId)
            .eq('quotation_id', req.params.id)
            .single();

        if (!oldItem) {
            return res.status(404).json({ message: 'Quotation item not found.' });
        }

        const updateData = {};
        const auditActions = [];

        // Product change
        if (product_id && product_id !== oldItem.product_id) {
            // Validate product exists
            const { data: newProduct, error: prodErr } = await supabase
                .from('products')
                .select('id, sku, name, base_price')
                .eq('id', product_id)
                .single();

            if (prodErr || !newProduct) {
                return res.status(400).json({ message: 'Invalid product. Product must exist in the catalogue.' });
            }

            updateData.product_id = product_id;

            // If no explicit price, use new product's price
            if (!unit_price) {
                // Get customer-specific price
                const { data: q } = await supabase.from('quotations').select('customer_id').eq('id', req.params.id).single();
                const { getCustomerPrice } = require('../services/pricing.service');
                const pricing = await getCustomerPrice(q?.customer_id, product_id);
                updateData.unit_price = pricing.unitPrice;
            }

            // Log correction for learning
            await supabase.from('product_matching_corrections').insert({
                quotation_item_id: req.params.itemId,
                customer_id: (await supabase.from('quotations').select('customer_id').eq('id', req.params.id).single()).data?.customer_id,
                original_text: oldItem.requested_description,
                ai_product_id: oldItem.product_id,
                human_product_id: product_id,
            });

            auditActions.push({
                action: 'PRODUCT_CHANGED',
                old_value: { sku: oldItem.products?.sku, name: oldItem.products?.name },
                new_value: { sku: newProduct.sku, name: newProduct.name },
            });
        }

        // Quantity change
        if (quantity !== undefined && quantity !== oldItem.quantity) {
            updateData.quantity = quantity;
            auditActions.push({
                action: 'QUANTITY_CHANGED',
                old_value: { quantity: oldItem.quantity },
                new_value: { quantity },
            });
        }

        // Price change
        if (unit_price !== undefined && unit_price !== oldItem.unit_price) {
            updateData.unit_price = unit_price;
            auditActions.push({
                action: 'PRICE_CHANGED',
                old_value: { unit_price: oldItem.unit_price },
                new_value: { unit_price },
            });
        }

        // Status change
        if (newStatus) {
            updateData.status = newStatus;
        }

        // Recalculate line_total
        const finalQty = updateData.quantity || oldItem.quantity;
        const finalPrice = updateData.unit_price || oldItem.unit_price;
        if (finalQty && finalPrice) {
            updateData.line_total = Math.round(finalQty * finalPrice * 100) / 100;
        }

        const { data: updated, error } = await supabase
            .from('quotation_items')
            .update(updateData)
            .eq('id', req.params.itemId)
            .select('*, products(id, sku, name, category, material, size, unit, base_price)')
            .single();

        if (error) {
            return res.status(500).json({ message: 'Failed to update item.' });
        }

        // Recalculate quotation totals
        await recalculateQuotationTotals(req.params.id);

        // Audit logs
        for (const audit of auditActions) {
            await supabase.from('quotation_audit_logs').insert({
                quotation_id: req.params.id,
                user_id: req.admin.id,
                ...audit,
            });
        }

        res.json({ message: 'Item updated.', item: updated });
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ message: 'Failed to update quotation item.' });
    }
});

// DELETE /api/quotations/:id/items/:itemId — delete a quotation item
router.delete('/:id/items/:itemId', async (req, res) => {
    try {
        const supabase = getSupabase();

        const { data: deleted, error } = await supabase
            .from('quotation_items')
            .delete()
            .eq('id', req.params.itemId)
            .eq('quotation_id', req.params.id)
            .select('id, requested_description')
            .single();

        if (error || !deleted) {
            return res.status(404).json({ message: 'Item not found.' });
        }

        await recalculateQuotationTotals(req.params.id);

        await supabase.from('quotation_audit_logs').insert({
            quotation_id: req.params.id,
            user_id: req.admin.id,
            action: 'ITEM_DELETED',
            old_value: { item: deleted.requested_description },
        });

        res.json({ message: 'Item deleted.' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ message: 'Failed to delete item.' });
    }
});

// POST /api/quotations/:id/approve
router.post('/:id/approve', async (req, res) => {
    try {
        const supabase = getSupabase();

        const { data: quotation, error: fetchErr } = await supabase
            .from('quotations')
            .select('status')
            .eq('id', req.params.id)
            .single();

        if (fetchErr || !quotation) {
            return res.status(404).json({ message: 'Quotation not found.' });
        }

        if (quotation.status === 'SENT') {
            return res.status(400).json({ message: 'Quotation already sent.' });
        }

        const { data, error } = await supabase
            .from('quotations')
            .update({ status: 'APPROVED' })
            .eq('id', req.params.id)
            .select('*')
            .single();

        if (error) {
            return res.status(500).json({ message: 'Failed to approve quotation.' });
        }

        await supabase.from('quotation_audit_logs').insert({
            quotation_id: req.params.id,
            user_id: req.admin.id,
            action: 'APPROVED',
        });

        console.log(`✅ Quotation ${req.params.id} approved by ${req.admin.email}`);
        res.json({ message: 'Quotation approved.', quotation: data });
    } catch (error) {
        console.error('Error approving quotation:', error);
        res.status(500).json({ message: 'Failed to approve quotation.' });
    }
});

// POST /api/quotations/:id/reject
router.post('/:id/reject', async (req, res) => {
    try {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('quotations')
            .update({ status: 'REJECTED' })
            .eq('id', req.params.id)
            .select('*')
            .single();

        if (error || !data) {
            return res.status(error ? 500 : 404).json({ message: 'Failed to reject quotation.' });
        }

        await supabase.from('quotation_audit_logs').insert({
            quotation_id: req.params.id,
            user_id: req.admin.id,
            action: 'REJECTED',
            new_value: { reason: req.body.reason || '' },
        });

        res.json({ message: 'Quotation rejected.', quotation: data });
    } catch (error) {
        console.error('Error rejecting quotation:', error);
        res.status(500).json({ message: 'Failed to reject quotation.' });
    }
});

// POST /api/quotations/:id/send — send quotation email
router.post('/:id/send', async (req, res) => {
    try {
        const supabase = getSupabase();

        // Check quotation is approved
        const { data: quotation, error: fetchErr } = await supabase
            .from('quotations')
            .select('status, quotation_requests(email_id)')
            .eq('id', req.params.id)
            .single();

        if (fetchErr || !quotation) {
            return res.status(404).json({ message: 'Quotation not found.' });
        }

        if (quotation.status !== 'APPROVED') {
            return res.status(400).json({ message: 'Quotation must be approved before sending.' });
        }

        // Generate email content
        const emailContent = await generateQuotationEmail(req.params.id);

        // Get original email for reply threading
        let originalSubject = 'Quotation';
        let recipientEmail = emailContent.customer?.email;

        if (quotation.quotation_requests?.email_id) {
            const { data: origEmail } = await supabase
                .from('email_requests')
                .select('from_email, subject')
                .eq('id', quotation.quotation_requests.email_id)
                .single();

            if (origEmail) {
                originalSubject = origEmail.subject;
                recipientEmail = recipientEmail || origEmail.from_email;
            }
        }

        if (!recipientEmail) {
            return res.status(400).json({ message: 'No recipient email found.' });
        }

        // Generate PDF
        const pdfBuffer = await generateQuotationPDF(
            emailContent.quotation,
            emailContent.items,
            emailContent.customer,
            process.env.COMPANY_NAME || 'Your Company'
        );

        // Send via existing Nodemailer with attachment
        const subject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;
        const attachments = [
            {
                filename: `Quotation_${emailContent.quotation.quotation_number}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }
        ];

        await sendReply(recipientEmail, subject, emailContent.text, attachments);

        // Update quotation status
        await supabase
            .from('quotations')
            .update({ status: 'SENT' })
            .eq('id', req.params.id);

        // Audit log
        await supabase.from('quotation_audit_logs').insert({
            quotation_id: req.params.id,
            user_id: req.admin.id,
            action: 'SENT',
            new_value: { recipient: recipientEmail, subject },
        });

        console.log(`📧 Quotation sent to ${recipientEmail}`);
        res.json({ message: 'Quotation sent successfully.', recipient: recipientEmail });
    } catch (error) {
        console.error('Error sending quotation:', error);
        res.status(500).json({ message: 'Failed to send quotation.' });
    }
});

// GET /api/quotations/:id/audit — audit trail
router.get('/:id/audit', async (req, res) => {
    try {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('quotation_audit_logs')
            .select('*, admins(name, email)')
            .eq('quotation_id', req.params.id)
            .order('created_at', { ascending: true });

        if (error) {
            return res.status(500).json({ message: 'Failed to fetch audit trail.' });
        }

        res.json({ auditLog: data || [] });
    } catch (error) {
        console.error('Error fetching audit:', error);
        res.status(500).json({ message: 'Failed to fetch audit trail.' });
    }
});

// GET /api/dashboard/quotation-metrics
router.get('/metrics/dashboard', async (req, res) => {
    try {
        const supabase = getSupabase();

        const { data: quotations, error } = await supabase
            .from('quotations')
            .select('id, status, grand_total, created_at');

        if (error) {
            return res.status(500).json({ message: 'Failed to fetch metrics.' });
        }

        const all = quotations || [];
        const total = all.length;
        const draft = all.filter(q => q.status === 'DRAFT').length;
        const needsReview = all.filter(q => q.status === 'NEEDS_REVIEW').length;
        const approved = all.filter(q => q.status === 'APPROVED').length;
        const sent = all.filter(q => q.status === 'SENT').length;
        const rejected = all.filter(q => q.status === 'REJECTED').length;

        // AI match accuracy
        const { data: items } = await supabase
            .from('quotation_items')
            .select('status');

        const totalItems = (items || []).length;
        const aiMatched = (items || []).filter(i => i.status === 'AI_MATCHED' || i.status === 'APPROVED').length;
        const corrections = await supabase.from('product_matching_corrections').select('id', { count: 'exact', head: true });
        const correctionCount = corrections.count || 0;

        const aiMatchRate = totalItems > 0 ? Math.round((aiMatched / totalItems) * 100) : 0;
        const correctionRate = totalItems > 0 ? Math.round((correctionCount / totalItems) * 100) : 0;

        // Total value (Only sum quotations that have been SENT to the customer)
        const sentQuotations = all.filter(q => q.status === 'SENT');
        const totalValue = sentQuotations.reduce((sum, q) => sum + parseFloat(q.grand_total || 0), 0);

        res.json({
            total,
            draft,
            needsReview,
            approved,
            sent,
            rejected,
            aiMatchRate,
            correctionRate,
            totalValue: Math.round(totalValue * 100) / 100,
        });
    } catch (error) {
        console.error('Error fetching metrics:', error);
        res.status(500).json({ message: 'Failed to fetch metrics.' });
    }
});

module.exports = router;
