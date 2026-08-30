import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { productsAPI } from '../services/api';

const ProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        productName: '',
        sku: '',
        category: '',
        subCategory: '',
        description: '',
        unitPrice: '',
        unitOfMeasure: '',
        currency: 'USD',
        minOrderQuantity: '',
        specifications: '',
        availability: 'in_stock',
    });
    const [jsonText, setJsonText] = useState('');
    const [showJsonUpload, setShowJsonUpload] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, [search, page]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 20 };
            if (search) params.search = search;
            const res = await productsAPI.getAll(params);
            setProducts(res.data.products || res.data);
            setPagination(res.data.pagination || {});
        } catch (error) {
            console.error('Failed to fetch products:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.productName,
                sku: formData.sku,
                category: formData.category,
                description: formData.description,
                unit: formData.unitOfMeasure,
                base_price: parseFloat(formData.unitPrice) || 0,
                active: formData.availability !== 'discontinued',
                material: formData.subCategory, // Mapping subCategory to material if applicable, or drop
            };
            if (editingProduct) {
                await productsAPI.update(editingProduct._id || editingProduct.id, payload);
                toast.success('Product updated!');
            } else {
                await productsAPI.create(payload);
                toast.success('Product created!');
            }
            setShowForm(false);
            setEditingProduct(null);
            resetForm();
            fetchProducts();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save product');
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            productName: product.name || product.productName || '',
            sku: product.sku || '',
            category: product.category || '',
            subCategory: product.subCategory || '',
            description: product.description || '',
            unitPrice: product.base_price || product.unitPrice || '',
            unitOfMeasure: product.unit || product.unitOfMeasure || '',
            currency: product.currency || 'USD',
            minOrderQuantity: product.minOrderQuantity || '',
            specifications: typeof product.specifications === 'object'
                ? JSON.stringify(product.specifications, null, 2)
                : product.specifications || '',
            availability: product.availability || 'in_stock',
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        try {
            await productsAPI.delete(id);
            toast.success('Product deleted');
            fetchProducts();
        } catch (error) {
            toast.error('Failed to delete product');
        }
    };

    const resetForm = () => {
        setFormData({
            productName: '', sku: '', category: '', subCategory: '', description: '',
            unitPrice: '', unitOfMeasure: '', currency: 'USD', minOrderQuantity: '',
            specifications: '', availability: 'in_stock',
        });
    };

    const handleJsonUpload = async () => {
        try {
            const data = JSON.parse(jsonText);
            const items = Array.isArray(data) ? data : [data];
            await productsAPI.bulkCreate(items);
            toast.success(`${items.length} products uploaded!`);
            setJsonText('');
            setShowJsonUpload(false);
            fetchProducts();
        } catch (err) {
            toast.error(err.message?.includes('JSON') ? 'Invalid JSON format' : 'Upload failed');
        }
    };

    let searchTimeout;
    const handleSearchChange = (e) => {
        clearTimeout(searchTimeout);
        const value = e.target.value;
        searchTimeout = setTimeout(() => {
            setSearch(value);
            setPage(1);
        }, 400);
    };

    return (
        <div className="fade-in">
            <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 className="page-title">Products</h1>
                    <p className="page-subtitle">Manage your product catalogue for AI-powered quoting</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-ghost" onClick={() => { setShowJsonUpload(!showJsonUpload); setShowForm(false); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Bulk Upload
                    </button>
                    <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setShowJsonUpload(false); setEditingProduct(null); resetForm(); }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add Product
                    </button>
                </div>
            </div>

            {/* JSON Upload */}
            {showJsonUpload && (
                <div className="glass-card" style={{ marginBottom: '24px' }}>
                    <div className="card-header">
                        <span className="card-header-title">
                            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                            Bulk JSON Upload
                        </span>
                    </div>
                    <div className="card-body">
                        <textarea
                            className="form-textarea"
                            value={jsonText}
                            onChange={(e) => setJsonText(e.target.value)}
                            placeholder={'[\n  {\n    "productName": "Widget A",\n    "sku": "WDG-001",\n    "unitPrice": 49.99,\n    "category": "Widgets"\n  }\n]'}
                            rows={8}
                        />
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                            <button className="btn btn-primary" onClick={handleJsonUpload} disabled={!jsonText.trim()}>
                                Upload Products
                            </button>
                            <button className="btn btn-ghost" onClick={() => setShowJsonUpload(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Product Form */}
            {showForm && (
                <div className="glass-card" style={{ marginBottom: '24px' }}>
                    <div className="card-header">
                        <span className="card-header-title">
                            <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                            {editingProduct ? 'Edit Product' : 'New Product'}
                        </span>
                    </div>
                    <div className="card-body">
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Product Name *</label>
                                    <input className="form-input" value={formData.productName} onChange={(e) => setFormData({ ...formData, productName: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">SKU</label>
                                    <input className="form-input" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <input className="form-input" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Sub-Category</label>
                                    <input className="form-input" value={formData.subCategory} onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Unit Price ($)</label>
                                    <input className="form-input" type="number" step="0.01" value={formData.unitPrice} onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Unit of Measure</label>
                                    <input className="form-input" value={formData.unitOfMeasure} onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })} placeholder="e.g. kg, liter, piece" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Min Order Qty</label>
                                    <input className="form-input" type="number" value={formData.minOrderQuantity} onChange={(e) => setFormData({ ...formData, minOrderQuantity: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Availability</label>
                                    <select className="form-select" value={formData.availability} onChange={(e) => setFormData({ ...formData, availability: e.target.value })}>
                                        <option value="in_stock">In Stock</option>
                                        <option value="low_stock">Low Stock</option>
                                        <option value="out_of_stock">Out of Stock</option>
                                        <option value="discontinued">Discontinued</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group" style={{ marginTop: '16px' }}>
                                <label className="form-label">Description</label>
                                <textarea className="form-textarea" rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                                <button type="submit" className="btn btn-primary">
                                    {editingProduct ? 'Update Product' : 'Create Product'}
                                </button>
                                <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setEditingProduct(null); resetForm(); }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="filter-bar">
                <div className="search-wrapper">
                    <span className="search-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search products by name, SKU, or category..."
                        onChange={handleSearchChange}
                    />
                </div>
            </div>

            {/* Product Table */}
            <div className="glass-card">
                {loading ? (
                    <div className="loading-spinner">
                        <div className="spinner" />
                        <span className="loading-text">Loading products...</span>
                    </div>
                ) : products.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                            </svg>
                        </div>
                        <div className="empty-state-text">No products found</div>
                        <div className="empty-state-sub">Add products to enable AI-powered quotation generation</div>
                    </div>
                ) : (
                    <>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>SKU</th>
                                        <th>Category</th>
                                        <th>Price</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((p, index) => (
                                        <tr key={p._id || p.id || index} style={{ animationDelay: `${index * 0.04}s`, cursor: 'default' }}>
                                            <td>
                                                <div className="request-sender">
                                                    <span className="request-sender-name">{p.name || p.productName}</span>
                                                    <span className="request-sender-email">{p.description?.substring(0, 60) || ''}</span>
                                                </div>
                                            </td>
                                            <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                                {p.sku || '—'}
                                            </td>
                                            <td>
                                                {p.category ? (
                                                    <span className="badge badge-category">{p.category}</span>
                                                ) : '—'}
                                            </td>
                                            <td style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
                                                ${(p.base_price ?? p.unitPrice ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td>
                                                <span className={`badge ${p.availability === 'in_stock' ? 'badge-success' :
                                                    p.availability === 'low_stock' ? 'badge-warning' :
                                                        'badge-error'
                                                    }`}>
                                                    {(p.availability || 'in_stock').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(p)}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                        </svg>
                                                    </button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p._id || p.id)} style={{ color: 'var(--danger)' }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {pagination.pages > 1 && (
                            <div className="pagination">
                                <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
                                <span className="pagination-info">Page {pagination.page} of {pagination.pages}</span>
                                <button className="pagination-btn" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next →</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ProductsPage;
