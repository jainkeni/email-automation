const express = require('express');
const { getSupabase } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { sendReply } = require('../services/emailSender');
const { analyzeEmail, generateDraftReply } = require('../services/aiService');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/requests - List all requests with filters
router.get('/', async (req, res) => {
    try {
        const {
            status,
            category,
            urgency,
            search,
            page = 1,
            limit = 20,
        } = req.query;

        const supabase = getSupabase();
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build query — select only list-level fields (exclude large text)
        let query = supabase
            .from('email_requests')
            .select('id, from_email, from_name, subject, message_id, received_at, ai_analysis, status, created_at', { count: 'exact' });

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }
        if (category) {
            query = query.eq('ai_analysis->>category', category);
        }
        if (urgency) {
            query = query.eq('ai_analysis->>urgency', urgency);
        }
        if (search) {
            query = query.or(
                `from_email.ilike.%${search}%,from_name.ilike.%${search}%,subject.ilike.%${search}%`
            );
        }

        query = query
            .order('received_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        const { data: requests, error, count } = await query;

        if (error) {
            console.error('Error fetching requests:', error);
            return res.status(500).json({ message: 'Failed to fetch requests.' });
        }

        // Map DB columns to frontend-expected format
        const mapped = (requests || []).map(mapRequestToFrontend);

        res.json({
            requests: mapped,
            pagination: {
                total: count || 0,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil((count || 0) / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ message: 'Failed to fetch requests.' });
    }
});

// GET /api/requests/stats - Dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const supabase = getSupabase();

        // Get all requests (just the fields we need for aggregation)
        const { data: allRequests, error } = await supabase
            .from('email_requests')
            .select('status, ai_analysis, from_email, from_name, subject, created_at');

        if (error) {
            console.error('Error fetching stats:', error);
            return res.status(500).json({ message: 'Failed to fetch stats.' });
        }

        const total = allRequests.length;
        const pending = allRequests.filter(r => r.status === 'pending').length;
        const approved = allRequests.filter(r => r.status === 'approved').length;
        const rejected = allRequests.filter(r => r.status === 'rejected').length;

        // Category stats
        const categoryStats = {};
        allRequests.forEach(r => {
            const cat = r.ai_analysis?.category || 'Uncategorized';
            categoryStats[cat] = (categoryStats[cat] || 0) + 1;
        });

        // Urgency stats
        const urgencyStats = {};
        allRequests.forEach(r => {
            const urg = r.ai_analysis?.urgency || 'medium';
            urgencyStats[urg] = (urgencyStats[urg] || 0) + 1;
        });

        // Recent activity (last 5)
        const recentActivity = allRequests
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5)
            .map(r => ({
                from: r.from_email,
                fromName: r.from_name,
                subject: r.subject,
                aiAnalysis: r.ai_analysis,
                status: r.status,
                createdAt: r.created_at,
            }));

        res.json({
            total,
            pending,
            approved,
            rejected,
            categoryStats,
            urgencyStats,
            recentActivity,
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Failed to fetch stats.' });
    }
});

// GET /api/requests/:id - Get single request detail
router.get('/:id', async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data: request, error } = await supabase
            .from('email_requests')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error || !request) {
            return res.status(404).json({ message: 'Request not found.' });
        }

        res.json(mapRequestToFrontend(request));
    } catch (error) {
        console.error('Error fetching request:', error);
        res.status(500).json({ message: 'Failed to fetch request.' });
    }
});

// PUT /api/requests/:id/approve - Approve and send reply
router.put('/:id/approve', async (req, res) => {
    try {
        const { replyText } = req.body;

        if (!replyText || !replyText.trim()) {
            return res.status(400).json({ message: 'Reply text is required.' });
        }

        const supabase = getSupabase();

        // Get the request
        const { data: request, error: fetchError } = await supabase
            .from('email_requests')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (fetchError || !request) {
            return res.status(404).json({ message: 'Request not found.' });
        }

        if (request.status === 'approved') {
            return res.status(400).json({ message: 'Request already approved.' });
        }

        // Send the email reply
        await sendReply(request.from_email, request.subject, replyText);

        // Update the request
        const { data: updated, error: updateError } = await supabase
            .from('email_requests')
            .update({
                status: 'approved',
                admin_reply: replyText,
                replied_at: new Date().toISOString(),
                approved_by: req.admin.id,
            })
            .eq('id', req.params.id)
            .select('*')
            .single();

        if (updateError) {
            console.error('Error updating request:', updateError);
            return res.status(500).json({ message: 'Reply sent but failed to update record.' });
        }

        console.log(`✅ Request ${req.params.id} approved by ${req.admin.email}`);

        res.json({
            message: 'Request approved and reply sent successfully.',
            request: mapRequestToFrontend(updated),
        });
    } catch (error) {
        console.error('Error approving request:', error);
        res.status(500).json({ message: 'Failed to approve request and send reply.' });
    }
});

// PUT /api/requests/:id/reject - Reject a request
router.put('/:id/reject', async (req, res) => {
    try {
        const { reason } = req.body;

        const supabase = getSupabase();

        const { data: request, error: fetchError } = await supabase
            .from('email_requests')
            .select('status')
            .eq('id', req.params.id)
            .single();

        if (fetchError || !request) {
            return res.status(404).json({ message: 'Request not found.' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending requests can be rejected.' });
        }

        const { data: updated, error: updateError } = await supabase
            .from('email_requests')
            .update({
                status: 'rejected',
                rejection_reason: reason || '',
                rejected_at: new Date().toISOString(),
            })
            .eq('id', req.params.id)
            .select('*')
            .single();

        if (updateError) {
            return res.status(500).json({ message: 'Failed to reject request.' });
        }

        console.log(`❌ Request ${req.params.id} rejected by ${req.admin.email}`);

        res.json({
            message: 'Request rejected.',
            request: mapRequestToFrontend(updated),
        });
    } catch (error) {
        console.error('Error rejecting request:', error);
        res.status(500).json({ message: 'Failed to reject request.' });
    }
});

// POST /api/requests/:id/regenerate - Regenerate AI draft reply
router.post('/:id/regenerate', async (req, res) => {
    try {
        const supabase = getSupabase();

        const { data: request, error: fetchError } = await supabase
            .from('email_requests')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (fetchError || !request) {
            return res.status(404).json({ message: 'Request not found.' });
        }

        console.log('🔄 Regenerating AI analysis and draft...');
        const newAnalysis = await analyzeEmail(request.subject, request.body);
        const newDraft = await generateDraftReply(newAnalysis);

        const { data: updated, error: updateError } = await supabase
            .from('email_requests')
            .update({
                ai_analysis: newAnalysis,
                ai_draft_reply: newDraft,
            })
            .eq('id', req.params.id)
            .select('*')
            .single();

        if (updateError) {
            return res.status(500).json({ message: 'Failed to save regenerated draft.' });
        }

        res.json({
            message: 'AI draft regenerated successfully.',
            request: mapRequestToFrontend(updated),
        });
    } catch (error) {
        console.error('Error regenerating draft:', error);
        res.status(500).json({ message: 'Failed to regenerate AI draft.' });
    }
});

/**
 * Map Supabase row (snake_case) to frontend-expected format (camelCase)
 */
function mapRequestToFrontend(row) {
    return {
        _id: row.id,
        from: row.from_email,
        fromName: row.from_name,
        subject: row.subject,
        body: row.body,
        messageId: row.message_id,
        receivedAt: row.received_at,
        aiAnalysis: row.ai_analysis,
        aiDraftReply: row.ai_draft_reply,
        status: row.status,
        adminReply: row.admin_reply,
        rejectionReason: row.rejection_reason,
        repliedAt: row.replied_at,
        rejectedAt: row.rejected_at,
        approvedBy: row.approved_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

module.exports = router;
