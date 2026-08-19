const Groq = require('groq-sdk');
const { emailAnalysisPrompt, draftReplyPrompt } = require('../config/promptTemplates');
const { getSupabase } = require('../config/db');
const defaultCompanyContext = require('../config/companyContext');

let groq = null;
let modelName = null;

const initializeAI = () => {
    if (!process.env.GROQ_API_KEY) {
        console.warn('⚠️  GROQ_API_KEY not set. AI features will be disabled.');
        return false;
    }
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    console.log(`✅ Groq AI initialized (model: ${modelName})`);
    return true;
};

/**
 * Analyze an incoming customer email using AI
 */
const analyzeEmail = async (subject, body) => {
    if (!groq) {
        console.warn('⚠️  AI not initialized. Returning default analysis.');
        return getDefaultAnalysis(subject, body);
    }

    try {
        const prompt = emailAnalysisPrompt(subject, body);
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: modelName,
            temperature: 0.3,
            max_tokens: 1024,
        });
        const response = chatCompletion.choices[0]?.message?.content || '';

        // Clean the response - remove markdown code blocks if present
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        const analysis = JSON.parse(cleanResponse);

        // Validate urgency value
        if (!['low', 'medium', 'high'].includes(analysis.urgency)) {
            analysis.urgency = 'medium';
        }

        // Validate category
        const validCategories = [
            'Product Inquiry', 'Pricing Request', 'Custom Order',
            'Support Request', 'Partnership Proposal', 'General Inquiry', 'Complaint',
        ];
        if (!validCategories.includes(analysis.category)) {
            analysis.category = 'General Inquiry';
        }

        console.log(`🤖 AI Analysis complete - Category: ${analysis.category}, Urgency: ${analysis.urgency}`);
        return analysis;
    } catch (error) {
        console.error('❌ AI Analysis failed:', error.message);
        return getDefaultAnalysis(subject, body);
    }
};

/**
 * Generate a draft reply using AI based on the analysis and company context
 */
const generateDraftReply = async (emailAnalysis, originalBody = '', isFollowUp = false) => {
    if (!groq) {
        console.warn('⚠️  AI not initialized. Returning default draft.');
        return getDefaultDraftReply(emailAnalysis);
    }

    try {
        const companyContext = await getCompanyContext();

        const prompt = draftReplyPrompt(emailAnalysis, companyContext, originalBody, isFollowUp);
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: modelName,
            temperature: 0.5,
            max_tokens: 2048,
        });
        const response = chatCompletion.choices[0]?.message?.content || '';

        console.log('🤖 AI Draft reply generated');
        return response.trim();
    } catch (error) {
        console.error('❌ AI Draft generation failed:', error.message);
        return getDefaultDraftReply(emailAnalysis);
    }
};

/**
 * Get company context from Supabase or fallback to defaults
 */
const getCompanyContext = async () => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('company_settings')
            .select('*')
            .limit(1)
            .single();

        if (!error && data) {
            return {
                companyName: data.company_name,
                industry: data.industry,
                productsAndServices: data.products_and_services || [],
                pricingInfo: data.pricing_info,
                businessHours: data.business_hours,
                location: data.location,
                contactEmail: data.contact_email,
                contactPhone: data.contact_phone,
                website: data.website,
                policies: data.policies || {},
                toneOfVoice: data.tone_of_voice,
                additionalNotes: data.additional_notes,
            };
        }
    } catch (error) {
        console.error('⚠️  Could not fetch company settings:', error.message);
    }
    return defaultCompanyContext;
};

/**
 * Fallback analysis when AI is unavailable
 */
const getDefaultAnalysis = (subject, body) => ({
    customerName: 'Not specified',
    company: 'Not specified',
    productOrServiceNeeded: subject || 'Not specified',
    specifications: '',
    quantity: 'Not specified',
    budget: 'Not specified',
    timeline: 'Not specified',
    urgency: 'medium',
    category: 'General Inquiry',
    summary: body ? body.substring(0, 200) + '...' : 'No content available',
    keyPoints: ['Email requires manual review - AI analysis unavailable'],
});

/**
 * Fallback draft reply when AI is unavailable
 */
const getDefaultDraftReply = (analysis) => {
    return `Dear ${analysis.customerName !== 'Not specified' ? analysis.customerName : 'Customer'},

Thank you for reaching out to us regarding your inquiry.

We have received your request and our team is currently reviewing it. We will get back to you with detailed information shortly.

If you have any urgent queries, please don't hesitate to contact us directly.

Best regards,
The Team`;
};

/**
 * AI-powered email triage — decides if an email is a genuine business inquiry.
 * Returns { process: true/false, reason: string }
 */
const shouldProcessEmail = async (fromAddress, subject, bodySnippet) => {
    // Hard block unambiguous system senders before hitting AI
    const lowerFrom = fromAddress.toLowerCase();
    const HARD_BLOCK = [
        /mailer[-_]?daemon/i,
        /postmaster/i,
        /no[-_]?reply@/i,
        /do[-_]?not[-_]?reply@/i,
        /bounce[+-]/i,
        /noreply@/i,
    ];
    for (const pattern of HARD_BLOCK) {
        if (pattern.test(lowerFrom)) {
            return { process: false, reason: `Hard-blocked sender pattern matched: ${fromAddress}` };
        }
    }

    // If AI is unavailable, allow through (better to see too many than zero)
    if (!groq) {
        return { process: true, reason: 'AI unavailable — allowing through by default' };
    }

    try {
        const companyContext = await getCompanyContext();

        const prompt = `You are an email triage assistant for "${companyContext.companyName}" (Industry: ${companyContext.industry}). Your job is to decide whether an incoming email is a GENUINE HUMAN BUSINESS INQUIRY relevant to our company that requires a response from the sales/support team.

Our Products/Services: ${companyContext.productsAndServices.join(', ')}

Email details:
- From: ${fromAddress}
- Subject: ${subject || '(no subject)'}
- Body preview: ${(bodySnippet || '').substring(0, 500)}

PROCESS the email (return true) if it is:
- A real human communicating about our products, services, pricing, partnership, support, or any business matter relevant to our industry.
- A customer complaint, feedback, or follow-up that needs attention.
- Any genuine person-to-person business communication.

DO NOT PROCESS (return false) if it is:
- Unrelated to our business or industry.
- A newsletter, marketing campaign, or promotional email.
- An automated notification (e.g. bill receipt, delivery tracking, 2FA code, system alert).
- A social media notification.
- An OTP / verification code email
- An auto-responder or out-of-office reply
- Spam or phishing
- A receipt, invoice, or transactional notification not requiring a reply

Respond ONLY with a valid JSON object (no markdown):
{"process": true or false, "reason": "one sentence explanation"}`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: modelName,
            temperature: 0.1,
            max_tokens: 100,
        });

        let raw = chatCompletion.choices[0]?.message?.content?.trim() || '';
        if (raw.startsWith('```')) {
            raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        const result = JSON.parse(raw);
        return {
            process: result.process === true,
            reason: result.reason || 'No reason given',
        };
    } catch (err) {
        console.error('❌ AI triage failed:', err.message);
        // On error, allow through so legitimate emails aren't silently lost
        return { process: true, reason: 'AI triage error — allowing through by default' };
    }
};

module.exports = {
    initializeAI,
    analyzeEmail,
    generateDraftReply,
    getCompanyContext,
    shouldProcessEmail,
};
