const express = require('express');
const { getSupabase } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

// GET /api/products — list with search/filter/pagination
router.get('/', async (req, res) => {
    try {
        const { search, category, material, size, active, page = 1, limit = 50 } = req.query;
        const supabase = getSupabase();
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = supabase
            .from('products')
            .select('id, sku, name, description, category, material, size, specifications, unit, base_price, active, created_at, updated_at', { count: 'exact' });

        if (active !== undefined) {
            query = query.eq('active', active === 'true');
        } else {
            query = query.eq('active', true);
        }
        if (category) query = query.eq('category', category);
        if (material) query = query.eq('material', material);
        if (size) query = query.eq('size', size);
        if (search) {
            query = query.or(
                `sku.ilike.%${search}%,name.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%,material.ilike.%${search}%`
            );
        }

        query = query.order('sku', { ascending: true }).range(offset, offset + parseInt(limit) - 1);

        const { data, error, count } = await query;
        if (error) {
            console.error('Error fetching products:', error);
            return res.status(500).json({ message: 'Failed to fetch products.' });
        }

        res.json({
            products: data || [],
            pagination: {
                total: count || 0,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil((count || 0) / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Failed to fetch products.' });
    }
});

// GET /api/products/categories — distinct categories, materials, sizes for filters
router.get('/filters', async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data: products, error } = await supabase
            .from('products')
            .select('category, material, size');

        if (error) {
            return res.status(500).json({ message: 'Failed to fetch filters.' });
        }

        const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
        const materials = [...new Set(products.map(p => p.material).filter(Boolean))].sort();
        const sizes = [...new Set(products.map(p => p.size).filter(Boolean))].sort((a, b) => {
            const an = parseFloat(a) || 0;
            const bn = parseFloat(b) || 0;
            return an - bn;
        });

        res.json({ categories, materials, sizes });
    } catch (error) {
        console.error('Error fetching filters:', error);
        res.status(500).json({ message: 'Failed to fetch filters.' });
    }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error || !data) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        res.json(data);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ message: 'Failed to fetch product.' });
    }
});

// POST /api/products/bulk — create multiple products
router.post('/bulk', async (req, res) => {
    try {
        const { products } = req.body;
        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: 'A list of products is required.' });
        }

        const supabase = getSupabase();

        const inserts = products.map(p => ({
            ...p,
            search_text: `${p.sku || ''} ${p.name || ''} ${p.description || ''} ${p.category || ''} ${p.material || ''} ${p.size || ''}`.toLowerCase(),
        }));

        const { data, error } = await supabase
            .from('products')
            .insert(inserts)
            .select();

        if (error) {
            console.error('Error creating products in bulk:', error);
            return res.status(500).json({ message: 'Failed to upload products in bulk. Ensure no duplicate SKUs.' });
        }

        res.status(201).json({ message: `${data?.length || 0} products uploaded successfully.` });
    } catch (error) {
        console.error('Error in bulk upload:', error);
        res.status(500).json({ message: 'Failed to upload products.' });
    }
});

// POST /api/products — create product
router.post('/', async (req, res) => {
    try {
        const { sku, name, description, category, material, size, specifications, unit, base_price, active } = req.body;

        if (!sku || !name || !category) {
            return res.status(400).json({ message: 'SKU, name, and category are required.' });
        }

        const supabase = getSupabase();
        const searchText = `${sku} ${name} ${description || ''} ${category} ${material || ''} ${size || ''}`.toLowerCase();

        const { data, error } = await supabase
            .from('products')
            .insert({
                sku, name, description: description || '', category,
                material: material || '', size: size || '',
                specifications: specifications || {},
                unit: unit || 'PCS',
                base_price: base_price || 0,
                active: active !== false,
                search_text: searchText,
            })
            .select('*')
            .single();

        if (error) {
            if (error.message.includes('duplicate')) {
                return res.status(409).json({ message: 'A product with this SKU already exists.' });
            }
            console.error('Error creating product:', error);
            return res.status(500).json({ message: 'Failed to create product.' });
        }

        res.status(201).json({ message: 'Product created.', product: data });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ message: 'Failed to create product.' });
    }
});

// PUT /api/products/:id — update product
router.put('/:id', async (req, res) => {
    try {
        const { sku, name, description, category, material, size, specifications, unit, base_price, active } = req.body;
        const supabase = getSupabase();

        const updateData = {};
        if (sku !== undefined) updateData.sku = sku;
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (category !== undefined) updateData.category = category;
        if (material !== undefined) updateData.material = material;
        if (size !== undefined) updateData.size = size;
        if (specifications !== undefined) updateData.specifications = specifications;
        if (unit !== undefined) updateData.unit = unit;
        if (base_price !== undefined) updateData.base_price = base_price;
        if (active !== undefined) updateData.active = active;

        // Rebuild search_text
        if (sku || name || description || category || material || size) {
            const { data: existing } = await supabase.from('products').select('sku, name, description, category, material, size').eq('id', req.params.id).single();
            if (existing) {
                const merged = { ...existing, ...updateData };
                updateData.search_text = `${merged.sku} ${merged.name} ${merged.description} ${merged.category} ${merged.material} ${merged.size}`.toLowerCase();
            }
        }

        const { data, error } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', req.params.id)
            .select('*')
            .single();

        if (error) {
            console.error('Error updating product:', error);
            return res.status(500).json({ message: 'Failed to update product.' });
        }

        if (!data) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        res.json({ message: 'Product updated.', product: data });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Failed to update product.' });
    }
});

// DELETE /api/products/:id — soft delete (deactivate)
router.delete('/:id', async (req, res) => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('products')
            .update({ active: false })
            .eq('id', req.params.id)
            .select('id, sku, name')
            .single();

        if (error || !data) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        res.json({ message: 'Product deactivated.', product: data });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Failed to delete product.' });
    }
});

module.exports = router;
