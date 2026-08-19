import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { productsAPI } from '../services/api';

const ProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ category: '', material: '', size: '' });
    const [availableFilters, setAvailableFilters] = useState({ categories: [], materials: [], sizes: [] });
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({ sku: '', name: '', description: '', category: '', material: '', size: '', base_price: 0, unit: 'PCS' });
    const [bulkText, setBulkText] = useState('');

    useEffect(() => {
        fetchFilters();
        fetchProducts();
    }, [pagination.page, filters, searchTerm]);

    const fetchFilters = async () => {
        try {
            const { data } = await productsAPI.getFilters();
            setAvailableFilters(data);
        } catch (error) {
            console.error('Failed to load filters', error);
        }
    };

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const { data } = await productsAPI.getAll({
                page: pagination.page,
                search: searchTerm,
                ...filters
            });
            setProducts(data.products);
            setPagination(data.pagination);
        } catch (error) {
            toast.error('Failed to fetch products');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setPagination({ ...pagination, page: 1 });
    };

    const handleFilterChange = (key, value) => {
        setFilters({ ...filters, [key]: value });
        setPagination({ ...pagination, page: 1 });
    };

    const openAddModal = () => {
        setEditingProduct(null);
        setFormData({ sku: '', name: '', description: '', category: '', material: '', size: '', base_price: 0, unit: 'PCS' });
        setIsEditModalOpen(true);
    };

    const openEditModal = (product) => {
        setEditingProduct(product.id);
        setFormData({
            sku: product.sku || '',
            name: product.name || '',
            description: product.description || '',
            category: product.category || '',
            material: product.material || '',
            size: product.size || '',
            base_price: product.base_price || 0,
            unit: product.unit || 'PCS'
        });
        setIsEditModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate/delete this product?')) return;
        try {
            await productsAPI.delete(id);
            toast.success('Product deleted');
            fetchProducts();
        } catch (error) {
            toast.error('Failed to delete product');
        }
    };

    const handleSaveProduct = async () => {
        try {
            if (editingProduct) {
                await productsAPI.update(editingProduct, formData);
                toast.success('Product updated');
            } else {
                await productsAPI.create(formData);
                toast.success('Product added');
            }
            setIsEditModalOpen(false);
            fetchProducts();
            fetchFilters();
        } catch (error) {
            toast.error('Failed to save product. Ensure SKU is unique.');
        }
    };

    const handleBulkUpload = async () => {
        try {
            const data = JSON.parse(bulkText);
            if (!Array.isArray(data)) throw new Error('Root must be an array');
            await productsAPI.uploadBulk(data);
            toast.success('Bulk upload successful');
            setIsBulkModalOpen(false);
            setBulkText('');
            fetchProducts();
            fetchFilters();
        } catch (error) {
            toast.error('Invalid JSON format or upload error: ' + error.message);
        }
    };

    return (
        <div className="page-container">
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">Product Catalogue</h1>
                    <p className="page-subtitle">Manage products and pricing</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary" onClick={() => setIsBulkModalOpen(true)}>Bulk Upload JSON</button>
                    <button className="btn btn-primary" onClick={openAddModal}>+ Add Product</button>
                </div>
            </header>

            <div className="card card-body" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 300px' }}>
                        <input type="text" placeholder="Search by SKU, name, or description..." className="form-input" value={searchTerm} onChange={handleSearch} />
                    </div>
                    <div>
                        <select className="form-input" value={filters.category} onChange={(e) => handleFilterChange('category', e.target.value)}>
                            <option value="">All Categories</option>
                            {availableFilters.categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <select className="form-input" value={filters.material} onChange={(e) => handleFilterChange('material', e.target.value)}>
                            <option value="">All Materials</option>
                            {availableFilters.materials.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <select className="form-input" value={filters.size} onChange={(e) => handleFilterChange('size', e.target.value)}>
                            <option value="">All Sizes</option>
                            {availableFilters.sizes.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    {(searchTerm || filters.category || filters.material || filters.size) && (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <button
                                className="btn btn-ghost"
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilters({ category: '', material: '', size: '' });
                                    setPagination({ ...pagination, page: 1 });
                                }}
                                style={{ padding: '8px', color: 'var(--text-secondary)' }}
                            >
                                ✕ Clear
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="card">
                {loading ? (
                    <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading products...</div>
                ) : (
                    <>
                        <table className="table" style={{ fontSize: '13px' }}>
                            <thead>
                                <tr>
                                    <th>SKU</th>
                                    <th>Name & Description</th>
                                    <th>Category & Specs</th>
                                    <th>Base Price</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.length === 0 ? (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>No products found matching criteria.</td></tr>
                                ) : (
                                    products.map(product => (
                                        <tr key={product.id}>
                                            <td style={{ fontWeight: '500', fontFamily: 'monospace' }}>{product.sku}</td>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{product.name}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{product.description?.substring(0, 50)}...</div>
                                            </td>
                                            <td>
                                                <div style={{ marginBottom: '4px' }}>{product.category}</div>
                                                {product.size && <span className="badge badge-info">{product.size}</span>}
                                                {product.material && <span className="badge badge-warning" style={{ marginLeft: '4px' }}>{product.material}</span>}
                                            </td>
                                            <td style={{ fontWeight: '600' }}>₹{product.base_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            <td>
                                                <span className={`badge ${product.active ? 'badge-success' : 'badge-error'}`}>
                                                    {product.active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={() => openEditModal(product)} style={{ background: 'none', border: 'none', color: 'var(--info)', cursor: 'pointer', fontSize: '16px' }}>✎</button>
                                                    <button onClick={() => handleDelete(product.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '16px' }}>🗑</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--spacing-lg)' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Showing {products.length} of {pagination.total} products</span>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                <button className="pagination-btn" disabled={pagination.page === 1} onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}>Prev</button>
                                <button className="pagination-btn" disabled={pagination.page === pagination.pages} onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}>Next</button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Modals */}
            {isEditModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-card card-body" style={{ width: '500px', maxWidth: '90%' }}>
                        <h2 style={{ marginBottom: '16px' }}>{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <input className="form-input" placeholder="SKU" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} />
                            <input className="form-input" placeholder="Product Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                            <input className="form-input" placeholder="Category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <input className="form-input" placeholder="Material (optional)" value={formData.material} onChange={(e) => setFormData({ ...formData, material: e.target.value })} />
                                <input className="form-input" placeholder="Size (optional)" value={formData.size} onChange={(e) => setFormData({ ...formData, size: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <input type="number" className="form-input" placeholder="Base Price" value={formData.base_price} onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })} />
                                <input className="form-input" placeholder="Unit (e.g. PCS)" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />
                            </div>
                            <textarea className="form-textarea" placeholder="Description" rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                                <button className="btn btn-ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleSaveProduct}>Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isBulkModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-card card-body" style={{ width: '600px', maxWidth: '90%' }}>
                        <h2 style={{ marginBottom: '16px' }}>Bulk Upload Products</h2>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Paste a JSON array of products. Required fields per product: sku, name, category, base_price.</p>
                        <textarea className="form-textarea" rows={10} value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder='[ { "sku": "ABC-123", "name": "Tool", "category": "Tools", "base_price": 50 } ]' />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                            <button className="btn btn-ghost" onClick={() => setIsBulkModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleBulkUpload}>Upload</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductsPage;
