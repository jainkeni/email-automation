/**
 * seedQuotationData.js
 * 
 * Seeds the Supabase database with realistic B2B industrial product data:
 * - 100+ products across multiple categories
 * - 10 customers
 * - 100+ orders
 * - 300+ order items
 * - Customer-specific prices
 * 
 * Usage: node scripts/seedQuotationData.js
 */

require('dotenv').config();
const { initSupabase, getSupabase } = require('../config/db');

// ─── Product Definitions ───────────────────────────────────────────────
const CATEGORIES = {
    'Ball Valve': { prefix: 'VAL-BV', unit: 'PCS' },
    'Gate Valve': { prefix: 'VAL-GV', unit: 'PCS' },
    'Globe Valve': { prefix: 'VAL-GL', unit: 'PCS' },
    'Check Valve': { prefix: 'VAL-CK', unit: 'PCS' },
    'Butterfly Valve': { prefix: 'VAL-BF', unit: 'PCS' },
    'Elbow Fitting': { prefix: 'FIT-EL', unit: 'PCS' },
    'Tee Fitting': { prefix: 'FIT-TE', unit: 'PCS' },
    'Reducer Fitting': { prefix: 'FIT-RD', unit: 'PCS' },
    'Coupling': { prefix: 'FIT-CP', unit: 'PCS' },
    'Flange': { prefix: 'FLG', unit: 'PCS' },
    'Industrial Pipe': { prefix: 'PIP', unit: 'MTR' },
    'Gasket': { prefix: 'GSK', unit: 'PCS' },
    'Fastener': { prefix: 'FST', unit: 'SET' },
    'Pressure Gauge': { prefix: 'INS-PG', unit: 'PCS' },
    'Strainer': { prefix: 'STR', unit: 'PCS' },
};

const MATERIALS = ['SS304', 'SS316', 'SS316L', 'CS (Carbon Steel)', 'CI (Cast Iron)', 'Brass', 'Bronze'];
const SIZES = ['0.5 inch', '1 inch', '1.5 inch', '2 inch', '3 inch', '4 inch', '6 inch', '8 inch'];
const PRESSURE_RATINGS = ['150#', '300#', '600#', '150 PSI', '300 PSI'];
const END_CONNECTIONS = ['Threaded', 'Flanged', 'Butt Weld', 'Socket Weld'];

function generateProducts() {
    const products = [];
    let counter = 1;

    for (const [category, meta] of Object.entries(CATEGORIES)) {
        // Each category gets varied sizes and materials
        const materialSubset = MATERIALS.slice(0, category.includes('Valve') ? 5 : 4);
        const sizeSubset = SIZES.slice(0, category.includes('Pipe') ? 8 : 6);

        for (const material of materialSubset) {
            for (const size of sizeSubset) {
                // Not every combo — limit to ~7-8 per category for realistic variety
                if (Math.random() < 0.55) continue;

                const sku = `${meta.prefix}-${String(counter).padStart(3, '0')}`;
                const pressureRating = PRESSURE_RATINGS[Math.floor(Math.random() * PRESSURE_RATINGS.length)];
                const endConnection = END_CONNECTIONS[Math.floor(Math.random() * END_CONNECTIONS.length)];
                const basePrice = generatePrice(category, size, material);

                const name = `${category} ${size} ${material}`;
                const description = `Industrial ${category.toLowerCase()}, ${size} size, ${material} material, ${pressureRating} pressure rating, ${endConnection} end connection. Suitable for high-pressure industrial applications.`;

                const searchText = `${sku} ${name} ${description} ${category} ${material} ${size} ${pressureRating} ${endConnection}`.toLowerCase();

                products.push({
                    sku,
                    name,
                    description,
                    category,
                    material,
                    size,
                    specifications: {
                        pressure_rating: pressureRating,
                        end_connection: endConnection,
                        standard: material.includes('SS') ? 'ASTM A351' : 'ASTM A216',
                        temperature_range: material.includes('SS') ? '-29°C to 425°C' : '-29°C to 350°C',
                    },
                    unit: meta.unit,
                    base_price: basePrice,
                    active: true,
                    search_text: searchText,
                });

                counter++;
            }
        }
    }

    // Ensure minimum 100 products — fill in required test products first
    return products;
}

function generatePrice(category, size, material) {
    // Base prices vary by category
    const categoryBase = {
        'Ball Valve': 2500, 'Gate Valve': 3200, 'Globe Valve': 3800,
        'Check Valve': 2800, 'Butterfly Valve': 4500, 'Elbow Fitting': 450,
        'Tee Fitting': 650, 'Reducer Fitting': 550, 'Coupling': 380,
        'Flange': 1200, 'Industrial Pipe': 850, 'Gasket': 180,
        'Fastener': 320, 'Pressure Gauge': 1800, 'Strainer': 3500,
    };

    let price = categoryBase[category] || 1000;

    // Size multiplier
    const sizeNum = parseFloat(size) || 1;
    price *= (1 + (sizeNum - 1) * 0.35);

    // Material multiplier
    if (material.includes('SS316L')) price *= 1.45;
    else if (material.includes('SS316')) price *= 1.3;
    else if (material.includes('SS304')) price *= 1.15;
    else if (material.includes('Bronze')) price *= 1.2;
    else if (material.includes('Brass')) price *= 1.1;

    // Small random variance ±5%
    price *= (0.95 + Math.random() * 0.1);

    return Math.round(price * 100) / 100;
}

// Hard-coded critical test products that MUST exist to match user testing scenarios
function getRequiredProducts() {
    return [
        { sku: 'VAL-BF-004', name: 'Butterfly Valve 4-inch', category: 'Butterfly Valve', material: 'Cast Iron / SS316 Disc', size: '4 inch', base_price: 115.00, unit: 'PCS', description: 'Industrial butterfly valve, 4-inch, wafer type, resilient seated.', specifications: { pressure_rating: '150 PSI', end_connection: 'Wafer', standard: 'API 609' } },
        { sku: 'VAL-BF-006', name: 'Butterfly Valve 6-inch', category: 'Butterfly Valve', material: 'Cast Iron / SS316 Disc', size: '6 inch', base_price: 145.00, unit: 'PCS', description: 'Industrial butterfly valve, 6-inch, wafer type, resilient seated.', specifications: { pressure_rating: '150 PSI', end_connection: 'Wafer', standard: 'API 609' } },
        { sku: 'VAL-BV-002', name: 'Ball Valve 2-inch', category: 'Ball Valve', material: 'SS316', size: '2 inch', base_price: 75.00, unit: 'PCS', description: 'Industrial ball valve, 2-inch, SS316 stainless steel, threaded.', specifications: { pressure_rating: '1000 WOG', end_connection: 'Threaded', standard: 'ASTM A351' } },
        { sku: 'GSK-SW-002', name: 'Spiral Wound Gasket 2-inch SS-316', category: 'Gasket', material: 'SS316', size: '2 inch', base_price: 1.80, unit: 'PCS', description: 'Spiral wound gasket, 2-inch, SS-316 inner and outer ring with graphite filler.', specifications: { type: 'Spiral Wound', filler: 'Graphite', pressure_rating: '150#' } },
        { sku: 'FIT-TC-002', name: 'Threaded Coupling 2-inch SS-316', category: 'Coupling', material: 'SS316', size: '2 inch', base_price: 4.50, unit: 'PCS', description: 'Threaded coupling, full type, 2-inch, SS-316, 3000# rating.', specifications: { type: 'Full Coupling', end_connection: 'NPT Threaded', pressure_rating: '3000#' } },
    ];
}

// ─── Customer Definitions ──────────────────────────────────────────────
function getCustomers() {
    return [
        { company_name: 'XYZ Engineering Pvt Ltd', contact_name: 'Rahul Sharma', email: 'rahul@xyz-engineering.com', phone: '+91-9876543210', crm_customer_id: 'CRM-001', status: 'active' },
        { company_name: 'ABC Industries', contact_name: 'Priya Patel', email: 'priya@abcindustries.com', phone: '+91-9876543211', crm_customer_id: 'CRM-002', status: 'active' },
        { company_name: 'Sunrise Manufacturing', contact_name: 'Amit Kumar', email: 'amit@sunrisemfg.com', phone: '+91-9876543212', crm_customer_id: 'CRM-003', status: 'active' },
        { company_name: 'Delta Petrochemicals', contact_name: 'Suresh Reddy', email: 'suresh@deltapetro.com', phone: '+91-9876543213', crm_customer_id: 'CRM-004', status: 'active' },
        { company_name: 'Omega Power Systems', contact_name: 'Neha Gupta', email: 'neha@omegapower.com', phone: '+91-9876543214', crm_customer_id: 'CRM-005', status: 'active' },
        { company_name: 'Star Fabricators', contact_name: 'Rajesh Nair', email: 'rajesh@starfab.com', phone: '+91-9876543215', crm_customer_id: 'CRM-006', status: 'active' },
        { company_name: 'Bharat Heavy Works', contact_name: 'Anand Mishra', email: 'anand@bharatheavy.com', phone: '+91-9876543216', crm_customer_id: 'CRM-007', status: 'active' },
        { company_name: 'Metro Piping Solutions', contact_name: 'Deepak Joshi', email: 'deepak@metropiping.com', phone: '+91-9876543217', crm_customer_id: 'CRM-008', status: 'active' },
        { company_name: 'Coastal Marine Engineering', contact_name: 'Vikram Singh', email: 'vikram@coastalmarine.com', phone: '+91-9876543218', crm_customer_id: 'CRM-009', status: 'active' },
        { company_name: 'Pinnacle Chemical Works', contact_name: 'Kavita Shah', email: 'kavita@pinnaclechem.com', phone: '+91-9876543219', crm_customer_id: 'CRM-010', status: 'active' },
    ];
}

// ─── Generate Orders with Repeating Patterns ────────────────────────────
function generateOrders(customers, products) {
    const orders = [];
    const orderItems = [];
    let orderCounter = 1;

    // Product SKU lookup map
    const skuMap = {};
    products.forEach(p => { skuMap[p.sku] = p; });

    // Define purchasing patterns — key customers buy certain products repeatedly
    const purchasePatterns = {
        0: ['VAL-BF-004', 'FIT-TC-002', 'GSK-SW-002'], // XYZ Engineering
        1: ['VAL-BV-002', 'VAL-BF-006'],             // ABC Industries
        2: ['VAL-BF-006', 'FIT-TC-002'],             // Sunrise Manufacturing
        3: ['VAL-BF-004', 'GSK-SW-002'],             // Delta Petrochemicals
        4: ['VAL-BV-002', 'FIT-TC-002'],             // Omega Power Systems
        5: ['VAL-BF-004', 'VAL-BV-002'],             // Star Fabricators
        6: ['VAL-BF-006', 'FIT-TC-002'], // Bharat Heavy Works
        7: ['FIT-TC-002', 'GSK-SW-002'], // Metro Piping Solutions
        8: ['VAL-BF-004', 'VAL-BF-006', 'GSK-SW-002'],             // Coastal Marine Engineering
        9: ['VAL-BV-002', 'FIT-TC-002', 'GSK-SW-002'], // Pinnacle Chemical Works
    };

    // Generate 10-15 orders per customer, spread over the last 2 years
    for (let ci = 0; ci < customers.length; ci++) {
        const customer = customers[ci];
        const patternSkus = purchasePatterns[ci] || ['VAL-BF-004', 'FIT-TC-002'];
        const numOrders = 10 + Math.floor(Math.random() * 6); // 10-15

        for (let oi = 0; oi < numOrders; oi++) {
            const daysAgo = Math.floor(Math.random() * 700) + 1;
            const orderDate = new Date();
            orderDate.setDate(orderDate.getDate() - daysAgo);

            const orderNumber = `ORD-${String(orderCounter).padStart(4, '0')}`;
            const order = {
                customer_id: null, // will be set after insert
                customer_index: ci,
                order_date: orderDate.toISOString(),
                order_number: orderNumber,
                total_amount: 0,
            };

            // Each order has 2-5 items
            const numItems = 2 + Math.floor(Math.random() * 4);
            const items = [];
            const usedSkus = new Set();

            for (let ii = 0; ii < numItems; ii++) {
                // 70% chance to pick from pattern, 30% random from required products
                let sku;
                if (Math.random() < 0.7 && patternSkus.length > 0) {
                    sku = patternSkus[Math.floor(Math.random() * patternSkus.length)];
                } else {
                    const requiredSkus = getRequiredProducts().map(p => p.sku);
                    sku = requiredSkus[Math.floor(Math.random() * requiredSkus.length)];
                }

                if (usedSkus.has(sku)) continue;
                usedSkus.add(sku);

                const product = skuMap[sku];
                if (!product) continue;

                const quantity = [5, 10, 15, 20, 25, 30, 40, 50][Math.floor(Math.random() * 8)];
                const unitPrice = product.base_price * (0.9 + Math.random() * 0.15); // small discount variance
                const lineTotal = Math.round(quantity * unitPrice * 100) / 100;

                items.push({
                    product_sku: sku,
                    quantity,
                    unit_price: Math.round(unitPrice * 100) / 100,
                });

                order.total_amount += lineTotal;
            }

            order.total_amount = Math.round(order.total_amount * 100) / 100;
            order._items = items;
            orders.push(order);
            orderCounter++;
        }
    }

    return orders;
}

// ─── Generate Customer-Specific Prices ──────────────────────────────────
function generateCustomerPrices(customers, products) {
    const prices = [];
    const skuMap = {};
    products.forEach(p => { skuMap[p.sku] = p; });

    // Top customers get 5-10% off on their frequent products
    const discountPatterns = {
        0: { skus: ['VAL-BF-004', 'FIT-TC-002'], discount: 0.08 },
        1: { skus: ['VAL-BV-002'], discount: 0.07 },
        2: { skus: ['VAL-BF-006'], discount: 0.10 },
        3: { skus: ['VAL-BF-004', 'GSK-SW-002'], discount: 0.06 },
        4: { skus: ['VAL-BV-002', 'FIT-TC-002'], discount: 0.09 },
        8: { skus: ['VAL-BF-004', 'GSK-SW-002'], discount: 0.05 },
    };

    for (const [ci, pattern] of Object.entries(discountPatterns)) {
        for (const sku of pattern.skus) {
            const product = skuMap[sku];
            if (!product) continue;

            prices.push({
                customer_index: parseInt(ci),
                product_sku: sku,
                unit_price: Math.round(product.base_price * (1 - pattern.discount) * 100) / 100,
                valid_from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
                valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            });
        }
    }

    return prices;
}

// ─── Main Seed Function ────────────────────────────────────────────────
async function seed() {
    console.log('🌱 Starting seed...\n');
    initSupabase();
    const supabase = getSupabase();

    console.log('🏢 Updating company settings...');
    await supabase.from('company_settings').update({
        company_name: 'Levia',
        industry: 'Industrial Valves & Fittings',
        contact_email: 'mohan.mehta@apeprocess.com', // As seen in emails
        products_and_services: ['Butterfly Valves', 'Ball Valves', 'Gaskets', 'Couplings'],
        pricing_info: 'We offer bulk discounts for loyal customers.',
    }).neq('id', '00000000-0000-0000-0000-000000000000');


    // 1. Clear existing quotation data (reverse dependency order)
    console.log('🗑️  Clearing existing quotation-related data...');
    for (const table of [
        'product_matching_corrections', 'quotation_audit_logs', 'quotation_items',
        'quotations', 'quotation_requests', 'customer_product_prices',
        'order_items', 'orders', 'customers', 'products',
    ]) {
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error && !error.message.includes('does not exist')) {
            console.warn(`  ⚠️  Could not clear ${table}: ${error.message}`);
        }
    }

    // 2. Insert products
    const requiredProducts = getRequiredProducts().map(p => ({
        ...p,
        active: true,
        search_text: `${p.sku} ${p.name} ${p.description} ${p.category} ${p.material} ${p.size}`.toLowerCase(),
        specifications: p.specifications || {},
    }));

    const generatedProducts = generateProducts();
    // Merge — skip generated ones whose SKU clashes with required
    const requiredSkus = new Set(requiredProducts.map(p => p.sku));
    const allProducts = [
        ...requiredProducts,
        ...generatedProducts.filter(p => !requiredSkus.has(p.sku)),
    ];

    console.log(`📦 Inserting ${allProducts.length} products...`);
    const { data: insertedProducts, error: prodError } = await supabase
        .from('products')
        .insert(allProducts)
        .select('id, sku');

    if (prodError) {
        console.error('❌ Failed to insert products:', prodError.message);
        process.exit(1);
    }
    console.log(`  ✅ ${insertedProducts.length} products inserted`);

    // Build lookup
    const productIdMap = {};
    insertedProducts.forEach(p => { productIdMap[p.sku] = p.id; });

    // 3. Insert customers
    const customers = getCustomers();
    console.log(`👤 Inserting ${customers.length} customers...`);
    const { data: insertedCustomers, error: custError } = await supabase
        .from('customers')
        .insert(customers)
        .select('id, email');

    if (custError) {
        console.error('❌ Failed to insert customers:', custError.message);
        process.exit(1);
    }
    console.log(`  ✅ ${insertedCustomers.length} customers inserted`);

    const customerIds = insertedCustomers.map(c => c.id);

    // 4. Insert orders and order items
    const ordersData = generateOrders(customers, allProducts);
    console.log(`📋 Inserting ${ordersData.length} orders...`);

    let totalItems = 0;
    for (const order of ordersData) {
        const { data: insertedOrder, error: orderError } = await supabase
            .from('orders')
            .insert({
                customer_id: customerIds[order.customer_index],
                order_date: order.order_date,
                order_number: order.order_number,
                total_amount: order.total_amount,
            })
            .select('id')
            .single();

        if (orderError) {
            console.warn(`  ⚠️  Skipping order ${order.order_number}: ${orderError.message}`);
            continue;
        }

        // Insert items
        const items = order._items
            .filter(item => productIdMap[item.product_sku])
            .map(item => ({
                order_id: insertedOrder.id,
                product_id: productIdMap[item.product_sku],
                quantity: item.quantity,
                unit_price: item.unit_price,
            }));

        if (items.length > 0) {
            const { error: itemError } = await supabase.from('order_items').insert(items);
            if (itemError) {
                console.warn(`  ⚠️  Item insert error for ${order.order_number}: ${itemError.message}`);
            } else {
                totalItems += items.length;
            }
        }
    }
    console.log(`  ✅ ${ordersData.length} orders, ${totalItems} order items inserted`);

    // 5. Insert customer-specific prices
    const pricesData = generateCustomerPrices(customers, allProducts);
    console.log(`💰 Inserting ${pricesData.length} customer-specific prices...`);

    const priceInserts = pricesData
        .filter(p => productIdMap[p.product_sku] && customerIds[p.customer_index])
        .map(p => ({
            customer_id: customerIds[p.customer_index],
            product_id: productIdMap[p.product_sku],
            unit_price: p.unit_price,
            valid_from: p.valid_from,
            valid_until: p.valid_until,
        }));

    if (priceInserts.length > 0) {
        const { error: priceError } = await supabase.from('customer_product_prices').insert(priceInserts);
        if (priceError) {
            console.warn(`  ⚠️  Price insert error: ${priceError.message}`);
        } else {
            console.log(`  ✅ ${priceInserts.length} customer prices inserted`);
        }
    }

    console.log('\n🎉 Seed complete!\n');
    console.log('Summary:');
    console.log(`  Products:        ${insertedProducts.length}`);
    console.log(`  Customers:       ${insertedCustomers.length}`);
    console.log(`  Orders:          ${ordersData.length}`);
    console.log(`  Order Items:     ${totalItems}`);
    console.log(`  Customer Prices: ${priceInserts.length}`);
    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
