/**
 * Product Matching Engine
 * 
 * The core AI component. Matches customer requirements to real products.
 * 
 * Flow:
 * 1. Customer Purchase History (priority search)
 * 2. Keyword/specification matching
 * 3. Semantic search (pgvector if available, else text similarity)
 * 4. Hybrid scoring
 * 5. Gemini/Groq candidate selection
 * 6. Confidence calculation
 * 7. Validation
 * 
 * CRITICAL RULES:
 * - AI cannot invent product IDs or SKUs
 * - AI can only select from retrieved real candidates
 * - Selected product must be validated against the database
 */

const { getSupabase } = require('../config/db');
const { getCustomerPurchasedProducts } = require('./customerPurchaseProfile.service');

// ─── Configurable Weights ───────────────────────────────────────────
const MATCH_WEIGHTS = {
    specification: 0.40,  // Keyword/spec match
    semantic: 0.30,       // Semantic similarity
    history: 0.20,        // Customer purchase history
    consistency: 0.10,    // Purchase/quantity consistency
};

/**
 * Match a single requested item to real products.
 * 
 * @param {Object} requestedItem - { requestedDescription, quantity, unit, specifications: { size, material } }
 * @param {string|null} customerId - UUID or null for unknown customers
 * @returns {Object} { candidates, selectedProduct, confidence, reason, alternatives }
 */
const matchProduct = async (requestedItem, customerId) => {
    const { requestedDescription, specifications = {} } = requestedItem;

    console.log(`[MATCH] Matching: "${requestedDescription}"`);

    let allCandidates = [];

    // ── Step 1: Customer History Search ────────────────────────────
    if (customerId) {
        console.log(`[SEARCH] Searching customer purchase history...`);
        const historyProducts = await getCustomerPurchasedProducts(customerId, {
            category: extractCategory(requestedDescription),
            material: specifications.material || extractMaterial(requestedDescription),
            size: specifications.size || extractSize(requestedDescription),
        });

        for (const hp of historyProducts) {
            const specScore = calculateSpecificationScore(requestedItem, hp);
            allCandidates.push({
                productId: hp.productId,
                sku: hp.sku,
                name: hp.name,
                category: hp.category,
                material: hp.material,
                size: hp.size,
                unit: hp.unit,
                basePrice: hp.currentBasePrice,
                specificationScore: specScore,
                semanticScore: 0,
                historyScore: calculateHistoryScore(hp),
                consistencyScore: calculateConsistencyScore(hp, requestedItem.quantity),
                source: 'CUSTOMER_HISTORY',
            });
        }

        if (allCandidates.length > 0) {
            console.log(`[SEARCH] Found ${allCandidates.length} candidates from customer history`);
        }
    }

    // ── Step 2: Catalogue Keyword Search ──────────────────────────
    console.log(`[SEARCH] Searching product catalogue...`);
    const catalogueCandidates = await keywordSearch(requestedItem);

    // Add catalogue candidates that aren't already from history
    const existingIds = new Set(allCandidates.map(c => c.productId));
    for (const cc of catalogueCandidates) {
        if (!existingIds.has(cc.productId)) {
            allCandidates.push({
                ...cc,
                historyScore: 0,
                consistencyScore: 0,
                source: 'CATALOGUE',
            });
        }
    }

    // ── Step 3: Semantic Search (text-based fallback) ─────────────
    if (allCandidates.length < 5) {
        const semanticCandidates = await semanticTextSearch(requestedDescription);
        for (const sc of semanticCandidates) {
            if (!existingIds.has(sc.productId)) {
                existingIds.add(sc.productId);
                allCandidates.push({
                    ...sc,
                    historyScore: 0,
                    consistencyScore: 0,
                    source: 'SEMANTIC',
                });
            }
        }
    }

    // ── Step 4: Calculate Hybrid Score ────────────────────────────
    for (const candidate of allCandidates) {
        candidate.hybridScore =
            MATCH_WEIGHTS.specification * candidate.specificationScore +
            MATCH_WEIGHTS.semantic * candidate.semanticScore +
            MATCH_WEIGHTS.history * candidate.historyScore +
            MATCH_WEIGHTS.consistency * candidate.consistencyScore;
    }

    // Sort by hybrid score
    allCandidates.sort((a, b) => b.hybridScore - a.hybridScore);

    // Top 5
    const topCandidates = allCandidates.slice(0, 5);
    console.log(`[MATCH] ${topCandidates.length} candidates ranked`);

    if (topCandidates.length === 0) {
        return {
            candidates: [],
            selectedProduct: null,
            confidence: 0,
            reason: 'No matching products found in the catalogue.',
            alternatives: [],
            status: 'NEEDS_REVIEW',
        };
    }

    // ── Step 5: AI Selection from Candidates ──────────────────────
    const aiSelection = await aiSelectProduct(requestedItem, topCandidates);

    // ── Step 6: Validate AI Selection ─────────────────────────────
    const validSelection = topCandidates.find(c =>
        c.productId === aiSelection.selectedProductId || c.sku === aiSelection.selectedSku
    );

    if (!validSelection) {
        console.warn(`[MATCH] AI selected invalid product — marking NEEDS_REVIEW`);
        // Fall back to top candidate
        const fallback = topCandidates[0];
        return {
            candidates: topCandidates,
            selectedProduct: fallback,
            confidence: fallback.hybridScore * 0.6,
            reason: 'AI selection could not be validated. Top matching product selected as fallback.',
            alternatives: topCandidates.slice(1, 4),
            status: 'NEEDS_REVIEW',
        };
    }

    // ── Step 7: Calculate Final Confidence ────────────────────────
    const confidence = calculateFinalConfidence(validSelection, aiSelection, requestedItem);

    return {
        candidates: topCandidates,
        selectedProduct: validSelection,
        confidence,
        reason: aiSelection.reason || 'Product matched based on specifications.',
        alternatives: topCandidates.filter(c => c.productId !== validSelection.productId).slice(0, 3).map(c => ({
            productId: c.productId,
            sku: c.sku,
            name: c.name,
            reason: `${c.category} ${c.size} ${c.material}`,
        })),
        status: confidence >= 0.70 ? 'AI_MATCHED' : 'NEEDS_REVIEW',
    };
};

// ─── Keyword Search ─────────────────────────────────────────────────
async function keywordSearch(requestedItem) {
    const supabase = getSupabase();
    const { requestedDescription, specifications = {} } = requestedItem;

    // Build filters from extracted specs
    let query = supabase
        .from('products')
        .select('id, sku, name, description, category, material, size, unit, base_price, search_text')
        .eq('active', true);

    // Exact material match if specified
    if (specifications.material) {
        query = query.ilike('material', `%${specifications.material}%`);
    }
    // Exact size match if specified
    if (specifications.size) {
        query = query.ilike('size', `%${specifications.size}%`);
    }
    // Category hint from description
    const categoryHint = extractCategory(requestedDescription);
    if (categoryHint) {
        query = query.ilike('category', `%${categoryHint}%`);
    }

    query = query.limit(20);

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map(p => ({
        productId: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        material: p.material,
        size: p.size,
        unit: p.unit,
        basePrice: p.base_price,
        specificationScore: calculateSpecificationScore(requestedItem, p),
        semanticScore: calculateTextSimilarity(requestedDescription, `${p.name} ${p.description}`),
        source: 'KEYWORD',
    }));
}

// ─── Semantic Text Search (fallback when pgvector embeddings are not available) ─
async function semanticTextSearch(description) {
    const supabase = getSupabase();
    const keywords = description.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    if (keywords.length === 0) return [];

    // Use full-text search on search_text
    const searchTerms = keywords.join(' & ');
    const { data, error } = await supabase
        .from('products')
        .select('id, sku, name, description, category, material, size, unit, base_price')
        .eq('active', true)
        .or(keywords.map(k => `search_text.ilike.%${k}%`).join(','))
        .limit(10);

    if (error || !data) return [];

    return data.map(p => ({
        productId: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        material: p.material,
        size: p.size,
        unit: p.unit,
        basePrice: p.base_price,
        specificationScore: 0.3,
        semanticScore: calculateTextSimilarity(description, `${p.name} ${p.description}`),
        source: 'SEMANTIC',
    }));
}

// ─── Specification Score Calculator ─────────────────────────────────
function calculateSpecificationScore(requested, product) {
    let score = 0;
    let checks = 0;

    const reqSpecs = requested.specifications || {};
    const reqDesc = (requested.requestedDescription || '').toLowerCase();

    // Size match
    if (reqSpecs.size || extractSize(reqDesc)) {
        checks++;
        const reqSize = (reqSpecs.size || extractSize(reqDesc) || '').toLowerCase();
        const prodSize = (product.size || '').toLowerCase();
        if (reqSize && prodSize && prodSize.includes(reqSize.replace(/\s*inch/i, '').trim())) {
            score += 1;
        } else if (reqSize && prodSize && prodSize.includes(reqSize)) {
            score += 1;
        }
    }

    // Material match
    if (reqSpecs.material || extractMaterial(reqDesc)) {
        checks++;
        const reqMat = (reqSpecs.material || extractMaterial(reqDesc) || '').toLowerCase();
        const prodMat = (product.material || '').toLowerCase();
        if (reqMat && prodMat && prodMat.includes(reqMat)) {
            score += 1;
        }
    }

    // Category/type match from description
    const cat = extractCategory(reqDesc);
    if (cat) {
        checks++;
        if ((product.category || '').toLowerCase().includes(cat.toLowerCase())) {
            score += 1;
        }
    }

    return checks > 0 ? score / checks : 0.5;
}

// ─── History Score ──────────────────────────────────────────────────
function calculateHistoryScore(historyProduct) {
    // More purchases = higher score (logarithmic)
    const purchaseScore = Math.min(1, Math.log2(1 + historyProduct.purchaseCount) / 4);

    // Recency bonus
    const daysSincePurchase = historyProduct.lastPurchased
        ? (Date.now() - new Date(historyProduct.lastPurchased).getTime()) / (1000 * 60 * 60 * 24)
        : 365;
    const recencyScore = Math.max(0, 1 - daysSincePurchase / 365);

    return (purchaseScore * 0.7 + recencyScore * 0.3);
}

// ─── Consistency Score ──────────────────────────────────────────────
function calculateConsistencyScore(historyProduct, requestedQuantity) {
    if (!requestedQuantity || !historyProduct.typicalQuantity) return 0.5;

    const ratio = requestedQuantity / historyProduct.typicalQuantity;
    // Score peaks at 1 when requested qty matches typical qty
    return Math.max(0, 1 - Math.abs(1 - ratio) * 0.5);
}

// ─── Text Similarity ────────────────────────────────────────────────
function calculateTextSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));

    if (words1.size === 0 || words2.size === 0) return 0;

    let overlap = 0;
    for (const w of words1) {
        if (words2.has(w)) overlap++;
    }

    return overlap / Math.max(words1.size, words2.size);
}

// ─── AI Product Selection ───────────────────────────────────────────
async function aiSelectProduct(requestedItem, candidates) {
    try {
        const Groq = require('groq-sdk');
        if (!process.env.GROQ_API_KEY) {
            return fallbackSelection(candidates);
        }

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const modelName = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

        const candidateDescriptions = candidates.map((c, i) =>
            `${i + 1}. SKU: ${c.sku} | ${c.name} | Category: ${c.category} | Material: ${c.material} | Size: ${c.size}`
        ).join('\n');

        const prompt = `You are a product matching assistant for a B2B industrial supply company.

Customer requested: "${requestedItem.requestedDescription}"
${requestedItem.specifications?.size ? `Size: ${requestedItem.specifications.size}` : ''}
${requestedItem.specifications?.material ? `Material: ${requestedItem.specifications.material}` : ''}
${requestedItem.quantity ? `Quantity: ${requestedItem.quantity}` : ''}

Available products (ONLY select from these):
${candidateDescriptions}

Select the BEST matching product. You MUST select one from the list above.

Return ONLY valid JSON (no markdown):
{
  "selectedProductId": "<the product's productId from the candidate>",
  "selectedSku": "<the exact SKU from the candidate list>",
  "confidence": <number between 0 and 1>,
  "reason": "<one sentence explaining why this is the best match>"
}`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: modelName,
            temperature: 0.1,
            max_tokens: 256,
        });

        let raw = chatCompletion.choices[0]?.message?.content?.trim() || '';
        if (raw.startsWith('```')) {
            raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        const result = JSON.parse(raw);

        // Map AI's selection back to actual candidate
        const selectedCandidate = candidates.find(c => c.sku === result.selectedSku);

        return {
            selectedProductId: selectedCandidate?.productId || candidates[0].productId,
            selectedSku: result.selectedSku || candidates[0].sku,
            confidence: result.confidence || 0.5,
            reason: result.reason || 'Selected based on specifications.',
        };
    } catch (error) {
        console.error('[MATCH] AI selection failed:', error.message);
        return fallbackSelection(candidates);
    }
}

function fallbackSelection(candidates) {
    const top = candidates[0];
    return {
        selectedProductId: top.productId,
        selectedSku: top.sku,
        confidence: top.hybridScore,
        reason: 'Selected based on specification matching (AI unavailable).',
    };
}

// ─── Final Confidence Calculation ───────────────────────────────────
function calculateFinalConfidence(selectedProduct, aiSelection, requestedItem) {
    // Base: hybrid score (already 0-1)
    let confidence = selectedProduct.hybridScore * 0.4;

    // AI confidence (0-1)
    confidence += (aiSelection.confidence || 0) * 0.3;

    // Spec completeness bonus
    const specs = requestedItem.specifications || {};
    let specCompleteness = 0;
    if (specs.size) specCompleteness += 0.33;
    if (specs.material) specCompleteness += 0.33;
    if (requestedItem.quantity) specCompleteness += 0.34;
    confidence += specCompleteness * 0.2;

    // History bonus
    if (selectedProduct.source === 'CUSTOMER_HISTORY') {
        confidence += 0.1;
    }

    return Math.min(1, Math.round(confidence * 100) / 100);
}

// ─── Extraction Helpers ─────────────────────────────────────────────
function extractSize(text) {
    if (!text) return null;
    const sizeMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:inch|"|in\b|mm)/i);
    if (sizeMatch) return sizeMatch[1] + ' inch';

    // DN sizes
    const dnMatch = text.match(/DN\s*(\d+)/i);
    if (dnMatch) {
        const dnToInch = { '15': '0.5', '25': '1', '40': '1.5', '50': '2', '65': '2.5', '80': '3', '100': '4', '150': '6', '200': '8' };
        return (dnToInch[dnMatch[1]] || dnMatch[1]) + ' inch';
    }
    return null;
}

function extractMaterial(text) {
    if (!text) return null;
    const matPatterns = [
        { pattern: /SS\s*316L/i, value: 'SS316L' },
        { pattern: /SS\s*316/i, value: 'SS316' },
        { pattern: /SS\s*304/i, value: 'SS304' },
        { pattern: /stainless\s*steel\s*316L/i, value: 'SS316L' },
        { pattern: /stainless\s*steel\s*316/i, value: 'SS316' },
        { pattern: /stainless\s*steel\s*304/i, value: 'SS304' },
        { pattern: /stainless\s*steel/i, value: 'SS304' },
        { pattern: /carbon\s*steel/i, value: 'CS (Carbon Steel)' },
        { pattern: /cast\s*iron/i, value: 'CI (Cast Iron)' },
        { pattern: /brass/i, value: 'Brass' },
        { pattern: /bronze/i, value: 'Bronze' },
    ];
    for (const { pattern, value } of matPatterns) {
        if (pattern.test(text)) return value;
    }
    return null;
}

function extractCategory(text) {
    if (!text) return null;
    const categories = [
        { pattern: /ball\s*valve/i, value: 'Ball Valve' },
        { pattern: /gate\s*valve/i, value: 'Gate Valve' },
        { pattern: /globe\s*valve/i, value: 'Globe Valve' },
        { pattern: /check\s*valve/i, value: 'Check Valve' },
        { pattern: /butterfly\s*valve/i, value: 'Butterfly Valve' },
        { pattern: /\bvalve/i, value: 'Valve' },
        { pattern: /elbow\s*fitting/i, value: 'Elbow Fitting' },
        { pattern: /tee\s*fitting/i, value: 'Tee Fitting' },
        { pattern: /reducer/i, value: 'Reducer Fitting' },
        { pattern: /coupling/i, value: 'Coupling' },
        { pattern: /\bfitting/i, value: 'Fitting' },
        { pattern: /flange/i, value: 'Flange' },
        { pattern: /pipe/i, value: 'Industrial Pipe' },
        { pattern: /gasket/i, value: 'Gasket' },
        { pattern: /fastener|bolt|nut/i, value: 'Fastener' },
        { pattern: /pressure\s*gauge/i, value: 'Pressure Gauge' },
        { pattern: /strainer/i, value: 'Strainer' },
    ];
    for (const { pattern, value } of categories) {
        if (pattern.test(text)) return value;
    }
    return null;
}

module.exports = {
    matchProduct,
    MATCH_WEIGHTS,
    extractSize,
    extractMaterial,
    extractCategory,
};
