/**
 * Quotation Service
 * 
 * Orchestrates the full quotation workflow:
 * 1. Extract structured requirements from email (AI)
 * 2. Identify customer
 * 3. Match products
 * 4. Get pricing
 * 5. Generate draft quotation
 * 6. Calculate totals
 * 
 * All financial calculations happen here, NEVER in AI.
 */

const { getSupabase } = require('../config/db');
const { findCustomerByEmail } = require('./customerPurchaseProfile.service');
const { matchProduct } = require('./productMatching.service');
const { getCustomerPrice } = require('./pricing.service');

// Tax rate (can be made configurable via company settings)
const TAX_RATE = 0.18; // 18% GST

/**
 * Extract structured quotation requirements from an email using AI.
 */
const extractQuotationRequirements = async (subject, body) => {
    try {
        const Groq = require('groq-sdk');
        if (!process.env.GROQ_API_KEY) {
            return getDefaultExtraction(body);
        }

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

        const prompt = `You are a B2B quotation request parser. Analyze this customer email and extract a structured quotation request.

Subject: ${subject || '(no subject)'}
Body: ${body}

Extract each distinct product/item the customer is requesting. For each item:
- requestedDescription: What the customer described (keep their wording)
- quantity: Number if stated, null if not
- unit: PCS, MTR, SET, KG, etc. — if stated, otherwise null
- specifications: { size, material, pressure_rating, etc } — only what's explicitly mentioned
- ambiguity: true if the request is vague/unclear/missing critical info

Also determine:
- requestType: QUOTATION, INQUIRY, REORDER, or GENERAL
- deliveryDate: if mentioned, otherwise null
- customerNotes: any other special instructions

Return ONLY valid JSON (no markdown):
{
  "requestType": "QUOTATION",
  "items": [
    {
      "requestedDescription": "...",
      "quantity": null or number,
      "unit": null or "PCS",
      "specifications": {},
      "ambiguity": true/false
    }
  ],
  "deliveryDate": null,
  "customerNotes": null
}`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: modelName,
            temperature: 0.2,
            max_tokens: 1024,
        });

        let raw = chatCompletion.choices[0]?.message?.content?.trim() || '';
        if (raw.startsWith('```')) {
            raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        const result = JSON.parse(raw);

        // Validate structure
        if (!result.items || !Array.isArray(result.items)) {
            console.warn('[EXTRACTION] Malformed AI response — no items array');
            return getDefaultExtraction(body);
        }

        // Validate each item
        result.items = result.items.map(item => ({
            requestedDescription: item.requestedDescription || 'Unknown request',
            quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : null,
            unit: item.unit || null,
            specifications: item.specifications || {},
            ambiguity: item.ambiguity !== false || !item.requestedDescription,
        }));

        console.log(`[EXTRACTION] Extracted ${result.items.length} quotation items`);
        return result;
    } catch (error) {
        console.error('[EXTRACTION] AI extraction failed:', error.message);
        return getDefaultExtraction(body);
    }
};

function getDefaultExtraction(body) {
    return {
        requestType: 'QUOTATION',
        items: [{
            requestedDescription: body ? body.substring(0, 200) : 'Unable to parse request',
            quantity: null,
            unit: null,
            specifications: {},
            ambiguity: true,
        }],
        deliveryDate: null,
        customerNotes: null,
    };
}

/**
 * Generate a quotation number.
 */
const generateQuotationNumber = async () => {
    const supabase = getSupabase();
    const { count, error } = await supabase
        .from('quotations')
        .select('*', { count: 'exact', head: true });

    const nextNum = (count || 0) + 1;
    return `QT-${String(nextNum).padStart(4, '0')}`;
};

/**
 * Process an email inquiry and generate a draft quotation.
 * 
 * @param {string} emailId - UUID of the email_request
 * @returns {Object} The generated quotation with items
 */
const processQuotationInquiry = async (emailId) => {
    const supabase = getSupabase();

    // 1. Get the email
    console.log(`[EMAIL] Processing email ${emailId}`);
    const { data: email, error: emailErr } = await supabase
        .from('email_requests')
        .select('*')
        .eq('id', emailId)
        .single();

    if (emailErr || !email) {
        throw new Error('Email not found');
    }

    // 2. Check for duplicate quotation request
    const { data: existingQR } = await supabase
        .from('quotation_requests')
        .select('id')
        .eq('email_id', emailId)
        .maybeSingle();

    if (existingQR) {
        throw new Error('A quotation request already exists for this email');
    }

    // 3. Identify or create customer 
    // We CREATE the customer immediately rather than dropping them on the floor as UNKNOWN
    console.log(`[CUSTOMER] Identifying/Creating customer: ${email.from_email}`);
    const customer = await findCustomerByEmail(email.from_email, true, email.from_name);
    const customerId = customer?.id || null;
    const customerStatus = customer ? 'IDENTIFIED' : 'UNKNOWN_CUSTOMER';

    if (customer) {
        console.log(`[CUSTOMER] Customer processed: ${customer.company_name}`);
    } else {
        console.log(`[CUSTOMER] Unknown customer: ${email.from_email}`);
    }

    // 4. Extract requirements
    console.log(`[EXTRACTION] Extracting quotation requirements...`);
    const requirements = await extractQuotationRequirements(email.subject, email.body);
    console.log(`[EXTRACTION] ${requirements.items.length} item(s) extracted`);

    // 5. Create quotation request
    const { data: qr, error: qrErr } = await supabase
        .from('quotation_requests')
        .insert({
            email_id: emailId,
            customer_id: customerId,
            status: 'PROCESSING',
            ai_analysis: requirements,
        })
        .select('*')
        .single();

    if (qrErr) {
        throw new Error(`Failed to create quotation request: ${qrErr.message}`);
    }

    // 6. Match products and generate quotation items
    const quotationNumber = await generateQuotationNumber();
    let hasNeedsReview = false;
    const quotationItems = [];

    for (const item of requirements.items) {
        console.log(`[MATCH] Processing: "${item.requestedDescription}"`);

        const matchResult = await matchProduct(item, customerId);

        let unitPrice = 0;
        let productId = null;

        if (matchResult.selectedProduct) {
            productId = matchResult.selectedProduct.productId;

            // Get pricing from database
            console.log(`[PRICING] Retrieving price for product ${matchResult.selectedProduct.sku}`);
            const pricing = await getCustomerPrice(customerId, productId);
            unitPrice = pricing.unitPrice;
            console.log(`[PRICING] Price: $${unitPrice} (source: ${pricing.source})`);
        }

        const quantity = item.quantity;
        const lineTotal = quantity ? Math.round(quantity * unitPrice * 100) / 100 : 0;

        // Determine item status
        let itemStatus = matchResult.status || 'AI_MATCHED';
        if (!quantity) itemStatus = 'NEEDS_REVIEW';
        if (item.ambiguity) itemStatus = 'NEEDS_REVIEW';
        if (productId && matchResult.confidence < 0.70) itemStatus = 'NEEDS_REVIEW';
        if (!customer) itemStatus = 'NEEDS_REVIEW';

        // If product was completely unmatched, we must use a valid DB status.
        // We use NEEDS_REVIEW. The frontend logic treats product_id == null as "Unavailable" automatically.
        if (!productId) itemStatus = 'NEEDS_REVIEW';

        if (itemStatus === 'NEEDS_REVIEW') hasNeedsReview = true;

        const confidence = matchResult.confidence || 0;
        console.log(`[CONFIDENCE] Score: ${(confidence * 100).toFixed(0)}% → ${itemStatus}`);

        quotationItems.push({
            product_id: productId,
            requested_description: item.requestedDescription,
            quantity: quantity,
            unit_price: unitPrice,
            line_total: lineTotal,
            confidence: confidence,
            ai_reason: matchResult.reason || '',
            status: itemStatus,
            alternatives: matchResult.alternatives || [],
        });
    }

    // 7. Calculate totals
    const subtotal = quotationItems.reduce((sum, item) => sum + (item.line_total || 0), 0);
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const grandTotal = Math.round((subtotal + tax) * 100) / 100;

    // 8. Create quotation
    const quotationStatus = hasNeedsReview ? 'NEEDS_REVIEW' : 'DRAFT';

    const { data: quotation, error: quotErr } = await supabase
        .from('quotations')
        .insert({
            quotation_number: quotationNumber,
            quotation_request_id: qr.id,
            customer_id: customerId,
            status: quotationStatus,
            subtotal,
            discount: 0,
            tax,
            grand_total: grandTotal,
            notes: requirements.customerNotes || '',
        })
        .select('*')
        .single();

    if (quotErr) {
        throw new Error(`Failed to create quotation: ${quotErr.message}`);
    }

    // 9. Insert quotation items
    const itemInserts = quotationItems.map(item => ({
        ...item,
        quotation_id: quotation.id,
    }));

    const { error: itemErr } = await supabase
        .from('quotation_items')
        .insert(itemInserts);

    if (itemErr) {
        throw new Error(`Failed to create quotation items: ${itemErr.message}`);
    }

    // 10. Update quotation request status
    await supabase
        .from('quotation_requests')
        .update({ status: quotationStatus })
        .eq('id', qr.id);

    // 11. Create audit log
    await supabase
        .from('quotation_audit_logs')
        .insert({
            quotation_id: quotation.id,
            action: 'AI_CREATED',
            new_value: {
                quotation_number: quotationNumber,
                items_count: quotationItems.length,
                needs_review: hasNeedsReview,
                customer: customer?.company_name || 'UNKNOWN',
            },
        });

    console.log(`[QUOTATION] Draft quotation ${quotationNumber} created — ${quotationStatus}`);

    return {
        quotation,
        items: quotationItems,
        customer,
        requirements,
        quotationRequest: qr,
    };
};

/**
 * Recalculate quotation totals from its items.
 */
const recalculateQuotationTotals = async (quotationId) => {
    const supabase = getSupabase();

    const { data: items, error } = await supabase
        .from('quotation_items')
        .select('quantity, unit_price, line_total')
        .eq('quotation_id', quotationId);

    if (error || !items) return;

    const subtotal = items.reduce((sum, item) => sum + (item.line_total || 0), 0);

    // Get current discount
    const { data: quotation } = await supabase
        .from('quotations')
        .select('discount')
        .eq('id', quotationId)
        .single();

    const discount = quotation?.discount || 0;
    const tax = Math.round((subtotal - discount) * TAX_RATE * 100) / 100;
    const grandTotal = Math.round((subtotal - discount + tax) * 100) / 100;

    await supabase
        .from('quotations')
        .update({ subtotal, tax, grand_total: grandTotal })
        .eq('id', quotationId);

    return { subtotal, discount, tax, grandTotal };
};

module.exports = {
    extractQuotationRequirements,
    processQuotationInquiry,
    recalculateQuotationTotals,
    generateQuotationNumber,
    TAX_RATE,
};
