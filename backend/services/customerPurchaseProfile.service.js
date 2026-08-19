/**
 * Customer Purchase Profile Service
 * 
 * Calculates purchase history analytics for a specific customer:
 * - Products previously purchased
 * - Purchase frequency
 * - Last purchase date
 * - Typical quantity
 * - Last purchase price
 * - Total quantity purchased
 * - Frequently purchased categories
 */

const { getSupabase } = require('../config/db');

/**
 * Get the full purchase profile for a customer.
 * @param {string} customerId - UUID of the customer
 * @returns {Object} Profile with frequent products, categories, and statistics
 */
const getCustomerPurchaseProfile = async (customerId) => {
    const supabase = getSupabase();

    // Get all order items for this customer, joined with order dates and product details
    const { data: orderData, error } = await supabase
        .from('order_items')
        .select(`
      id,
      quantity,
      unit_price,
      order_id,
      product_id,
      orders!inner(customer_id, order_date, order_number),
      products!inner(sku, name, category, material, size, unit, base_price)
    `)
        .eq('orders.customer_id', customerId);

    if (error) {
        console.error('[CUSTOMER_PROFILE] Error fetching purchase data:', error.message);
        return {
            customerId,
            frequentProducts: [],
            frequentCategories: [],
            totalOrders: 0,
            totalItems: 0,
        };
    }

    if (!orderData || orderData.length === 0) {
        return {
            customerId,
            frequentProducts: [],
            frequentCategories: [],
            totalOrders: 0,
            totalItems: 0,
        };
    }

    // Aggregate by product
    const productStats = {};
    const orderIds = new Set();

    for (const item of orderData) {
        const prod = item.products;
        const order = item.orders;
        const sku = prod.sku;

        orderIds.add(item.order_id);

        if (!productStats[sku]) {
            productStats[sku] = {
                productId: item.product_id,
                sku,
                name: prod.name,
                category: prod.category,
                material: prod.material,
                size: prod.size,
                unit: prod.unit,
                currentBasePrice: prod.base_price,
                purchaseCount: 0,
                totalQuantity: 0,
                quantities: [],
                prices: [],
                lastPurchased: null,
                lastPrice: 0,
            };
        }

        const stat = productStats[sku];
        stat.purchaseCount += 1;
        stat.totalQuantity += item.quantity;
        stat.quantities.push(item.quantity);
        stat.prices.push(item.unit_price);

        const orderDate = new Date(order.order_date);
        if (!stat.lastPurchased || orderDate > new Date(stat.lastPurchased)) {
            stat.lastPurchased = order.order_date;
            stat.lastPrice = item.unit_price;
        }
    }

    // Calculate aggregates and sort by purchase count
    const frequentProducts = Object.values(productStats)
        .map(stat => ({
            productId: stat.productId,
            sku: stat.sku,
            name: stat.name,
            category: stat.category,
            material: stat.material,
            size: stat.size,
            unit: stat.unit,
            currentBasePrice: stat.currentBasePrice,
            purchaseCount: stat.purchaseCount,
            totalQuantity: stat.totalQuantity,
            typicalQuantity: Math.round(stat.quantities.reduce((a, b) => a + b, 0) / stat.quantities.length),
            lastPurchased: stat.lastPurchased,
            lastPrice: stat.lastPrice,
            averagePrice: Math.round(stat.prices.reduce((a, b) => a + b, 0) / stat.prices.length * 100) / 100,
        }))
        .sort((a, b) => b.purchaseCount - a.purchaseCount);

    // Category stats
    const categoryMap = {};
    for (const product of frequentProducts) {
        if (!categoryMap[product.category]) {
            categoryMap[product.category] = { category: product.category, count: 0, totalSpent: 0 };
        }
        categoryMap[product.category].count += product.purchaseCount;
        categoryMap[product.category].totalSpent += product.totalQuantity * product.averagePrice;
    }

    const frequentCategories = Object.values(categoryMap)
        .map(c => ({ ...c, totalSpent: Math.round(c.totalSpent * 100) / 100 }))
        .sort((a, b) => b.count - a.count);

    return {
        customerId,
        frequentProducts,
        frequentCategories,
        totalOrders: orderIds.size,
        totalItems: orderData.length,
    };
};

/**
 * Get previously purchased products for a customer, optionally filtered.
 * Useful for the product matching engine.
 * 
 * @param {string} customerId
 * @param {Object} filters - optional { category, material, size }
 * @returns {Array} Array of product objects with purchase stats
 */
const getCustomerPurchasedProducts = async (customerId, filters = {}) => {
    const profile = await getCustomerPurchaseProfile(customerId);

    let products = profile.frequentProducts;

    // Apply optional filters
    if (filters.category) {
        products = products.filter(p => p.category.toLowerCase().includes(filters.category.toLowerCase()));
    }
    if (filters.material) {
        products = products.filter(p => p.material.toLowerCase().includes(filters.material.toLowerCase()));
    }
    if (filters.size) {
        products = products.filter(p => p.size.toLowerCase().includes(filters.size.toLowerCase()));
    }

    return products;
};

/**
 * Look up a customer by email address.
 * Returns the customer record or null.
 */
/**
 * Look up a customer by email address.
 * Returns the customer record or null.
 */
const findCustomerByEmail = async (email, createIfMissing = false, fromName = null, aiDetails = {}) => {
    if (!email) return null;

    const supabase = getSupabase();
    const normalizedEmail = email.toLowerCase().trim();

    const { data: existing, error } = await supabase
        .from('customers')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

    if (error) {
        console.error('[CUSTOMER] Lookup error:', error.message);
        return null;
    }

    const resolvedCompany = (aiDetails.company && aiDetails.company !== 'Not specified')
        ? aiDetails.company
        : (fromName || normalizedEmail.split('@')[0]);

    const resolvedName = (aiDetails.customerName && aiDetails.customerName !== 'Not specified')
        ? aiDetails.customerName
        : fromName;

    const resolvedPhone = (aiDetails.contactNumber && aiDetails.contactNumber !== 'Not specified')
        ? aiDetails.contactNumber
        : '';

    if (existing) {
        // Option to update existing customer if they previously lacked these details:
        let updates = {};
        if (!existing.company_name && resolvedCompany) updates.company_name = resolvedCompany;
        if (!existing.contact_name && resolvedName) updates.contact_name = resolvedName;
        if (!existing.phone && resolvedPhone) updates.phone = resolvedPhone;

        if (Object.keys(updates).length > 0) {
            await supabase.from('customers').update(updates).eq('id', existing.id);
            return { ...existing, ...updates };
        }

        return existing;
    }

    if (!existing && createIfMissing) {
        console.log(`[CUSTOMER] Auto-creating new customer for ${normalizedEmail}...`);

        const { data: newCustomer, error: insertErr } = await supabase
            .from('customers')
            .insert({
                email: normalizedEmail,
                company_name: resolvedCompany,
                contact_name: resolvedName || '',
                phone: resolvedPhone || ''
            })
            .select('*')
            .single();

        if (!insertErr && newCustomer) {
            return newCustomer;
        }
    }

    return null;
};

module.exports = {
    getCustomerPurchaseProfile,
    getCustomerPurchasedProducts,
    findCustomerByEmail,
};
