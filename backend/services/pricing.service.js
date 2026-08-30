/**
 * Pricing Service
 * 
 * Determines the correct price for a product for a specific customer.
 * Uses customer_product_prices table first, falls back to product base_price.
 * Prices NEVER come from AI — only from the database.
 */

const { getSupabase } = require('../config/db');

/**
 * Get the price for a specific product for a specific customer.
 * Priority: customer-specific price (valid date range) > product base_price
 * 
 * @param {string} customerId - UUID
 * @param {string} productId - UUID
 * @returns {Object} { productId, customerId, unitPrice, currency, source }
 */
const getCustomerPrice = async (customerId, productId) => {
    const supabase = getSupabase();
    const now = new Date().toISOString();

    // 1. Try customer-specific pricing
    if (customerId) {
        const { data: customerPrice, error: cpErr } = await supabase
            .from('customer_product_prices')
            .select('unit_price')
            .eq('customer_id', customerId)
            .eq('product_id', productId)
            .lte('valid_from', now)
            .or(`valid_until.is.null,valid_until.gte.${now}`)
            .order('valid_from', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!cpErr && customerPrice) {
            console.log(`[PRICING] Customer-specific price found for product ${productId}`);
            return {
                productId,
                customerId,
                unitPrice: parseFloat(customerPrice.unit_price),
                currency: 'USD',
                source: 'CUSTOMER_SPECIFIC',
            };
        }
    }

    // 2. Fall back to product base price
    const { data: product, error: prodErr } = await supabase
        .from('products')
        .select('base_price')
        .eq('id', productId)
        .single();

    if (prodErr || !product) {
        console.error(`[PRICING] Product ${productId} not found`);
        return {
            productId,
            customerId,
            unitPrice: 0,
            currency: 'USD',
            source: 'NOT_FOUND',
        };
    }

    return {
        productId,
        customerId,
        unitPrice: parseFloat(product.base_price),
        currency: 'USD',
        source: 'BASE_PRICE',
    };
};

/**
 * Get prices for multiple products at once.
 * @param {string} customerId
 * @param {Array<string>} productIds
 * @returns {Object} Map of productId -> pricing info
 */
const getBulkCustomerPrices = async (customerId, productIds) => {
    const prices = {};
    for (const productId of productIds) {
        prices[productId] = await getCustomerPrice(customerId, productId);
    }
    return prices;
};

module.exports = {
    getCustomerPrice,
    getBulkCustomerPrices,
};
