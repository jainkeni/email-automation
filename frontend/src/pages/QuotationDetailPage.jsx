import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { quotationsAPI, productsAPI } from '../services/api';

const QuotationDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quotation, setQuotation] = useState(null);
    const [items, setItems] = useState([]);
    const [email, setEmail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState(null);
    const [productSearch, setProductSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data } = await quotationsAPI.getById(id);
            setQuotation(data.quotation);
            setItems(data.items);
            setEmail(data.email);
        } catch (error) {
            toast.error('Failed to load quotation details');
            navigate('/quotations');
        } finally {
            setLoading(false);
        }
    };

    const handleSearchProduct = async (query) => {
        setProductSearch(query);
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }
        try {
            const { data } = await productsAPI.getAll({ search: query, limit: 10 });
            setSearchResults(data.products);
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateItem = async (itemId, type, value) => {
        try {
            const item = items.find(i => i.id === itemId);
            const payload = {
                quantity: type === 'quantity' ? value : item.quantity,
                unit_price: type === 'price' ? value : item.unit_price,
            };
            await quotationsAPI.updateItem(id, itemId, payload);
            toast.success('Item updated');
            fetchData();
        } catch (error) {
            toast.error('Failed to update item');
        }
    };

    const handleReplaceProduct = async (itemId, newProductId) => {
        try {
            await quotationsAPI.updateItem(id, itemId, { product_id: newProductId, status: 'APPROVED' });
            toast.success('Product updated');
            setEditingItem(null);
            setProductSearch('');
            fetchData();
        } catch (error) {
            toast.error('Failed to replace product');
        }
    };

    const handleApprove = async () => {
        try {
            await quotationsAPI.approve(id);
            toast.success('Quotation Approved');
            fetchData();
        } catch (error) {
            toast.error('Failed to approve quotation');
        }
    };

    const handleSend = async () => {
        try {
            setSending(true);
            await quotationsAPI.send(id);
            toast.success('Quotation sent to customer');
            fetchData();
        } catch (error) {
            toast.error('Failed to send quotation');
        } finally {
            setSending(false);
        }
    };

    if (loading) return <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>Loading...</div>;
    if (!quotation) return <div className="page-container">Quotation not found</div>;

    const isEditable = quotation.status === 'DRAFT' || quotation.status === 'NEEDS_REVIEW';
    const validItems = items.filter(i => i.product_id != null && i.status !== 'UNAVAILABLE');
    const unavailableItems = items.filter(i => i.product_id == null || i.status === 'UNAVAILABLE');

    return (
        <div className="fade-in" style={{ paddingBottom: '100px' }}>
            <button className="detail-back" onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '24px', fontSize: '14px', fontWeight: '500' }}>
                &larr; Back to Quotations
            </button>
            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">Quotation {quotation.quotation_number}</h1>
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', marginTop: 'var(--spacing-sm)' }}>
                        <span className={`badge ${quotation.status === 'APPROVED' || quotation.status === 'SENT' ? 'badge-success' : quotation.status === 'NEEDS_REVIEW' ? 'badge-warning' : 'badge-info'}`}>
                            {quotation.status.replace('_', ' ')}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                            Created: {new Date(quotation.created_at).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    {isEditable && (
                        <button className="btn btn-success" onClick={handleApprove}>Confirm & Approve</button>
                    )}
                    {quotation.status === 'APPROVED' && (
                        <button className="btn btn-primary" onClick={handleSend} disabled={sending}>
                            {sending ? 'Sending...' : 'Send to Customer'}
                        </button>
                    )}
                    {quotation.status === 'SENT' && (
                        <button className="btn btn-primary" style={{ opacity: 0.7, pointerEvents: 'none' }}>✓ Sent to Customer</button>
                    )}
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 'var(--spacing-lg)' }}>
                {/* Main Content -> Line Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                    <div className="glass-card card-body">
                        <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Line Items ({validItems.length})</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', overflowX: 'auto' }}>
                            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '12px' }}>Requested</th>
                                        <th style={{ textAlign: 'left', padding: '12px' }}>Matched Product</th>
                                        <th style={{ width: '100px', textAlign: 'center', padding: '12px' }}>Quantity</th>
                                        <th style={{ width: '120px', textAlign: 'right', padding: '12px' }}>Unit Price (₹)</th>
                                        <th style={{ width: '120px', textAlign: 'right', padding: '12px' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {validItems.map((item) => (
                                        <React.Fragment key={item.id}>
                                            <tr style={{ background: item.status === 'NEEDS_REVIEW' ? 'rgba(245, 158, 11, 0.05)' : 'transparent', borderBottom: '1px solid var(--border-primary)' }}>
                                                <td style={{ padding: '16px 12px' }}>
                                                    <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{item.requested_description}"</div>
                                                    {item.status === 'NEEDS_REVIEW' && <div className="badge badge-warning" style={{ marginTop: '8px' }}>Needs Verification</div>}
                                                    {item.status === 'AI_MATCHED' && <div className="badge badge-success" style={{ marginTop: '8px' }}>AI Matched ({(item.confidence * 100).toFixed(0)}%)</div>}
                                                </td>
                                                <td style={{ padding: '16px 12px' }}>
                                                    {item.products ? (
                                                        <div>
                                                            <div style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{item.products.sku}</div>
                                                            <div>{item.products.name}</div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ color: 'var(--danger)', fontWeight: 600 }}>No product matched!</div>
                                                    )}
                                                    {isEditable && (
                                                        <button onClick={() => setEditingItem(item.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', padding: 0, marginTop: '8px', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}>
                                                            Change Product
                                                        </button>
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                                                    {isEditable ? (
                                                        <input
                                                            type="number"
                                                            className="form-input"
                                                            value={item.quantity || ''}
                                                            onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value))}
                                                            style={{ width: '80px', padding: '6px', textAlign: 'center' }}
                                                        />
                                                    ) : (
                                                        <div style={{ fontWeight: 600 }}>{item.quantity || 0}</div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                                                    {isEditable ? (
                                                        <input
                                                            type="number"
                                                            className="form-input"
                                                            value={item.unit_price || ''}
                                                            onChange={(e) => handleUpdateItem(item.id, 'price', parseFloat(e.target.value))}
                                                            style={{ width: '100px', padding: '6px', textAlign: 'right' }}
                                                        />
                                                    ) : (
                                                        <div>₹{formatNum(item.unit_price)}</div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 600, fontSize: '15px' }}>
                                                    ₹{formatNum(item.line_total)}
                                                </td>
                                            </tr>
                                            {editingItem === item.id && (
                                                <tr>
                                                    <td colSpan="5" style={{ padding: '16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
                                                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                                                            <div style={{ flex: 1 }}>
                                                                <input
                                                                    type="text"
                                                                    className="form-input"
                                                                    placeholder="Search SKU or name to replace..."
                                                                    value={productSearch}
                                                                    onChange={(e) => handleSearchProduct(e.target.value)}
                                                                />
                                                                <div style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '8px', background: 'var(--bg-glass)', borderRadius: '4px' }}>
                                                                    {searchResults.map(p => (
                                                                        <div
                                                                            key={p.id}
                                                                            onClick={() => handleReplaceProduct(item.id, p.id)}
                                                                            style={{ padding: '12px', borderBottom: '1px solid var(--border-primary)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                                            onMouseOver={e => e.currentTarget.style.background = 'var(--bg-glass-hover)'}
                                                                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                                                        >
                                                                            <div><span style={{ fontWeight: 600 }}>{p.sku}</span> - {p.name}</div>
                                                                            <div style={{ fontWeight: 600 }}>₹{p.base_price}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <button className="btn btn-ghost" onClick={() => { setEditingItem(null); setProductSearch(''); }}>Cancel</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {unavailableItems.length > 0 && (
                        <div className="glass-card card-body" style={{ borderColor: 'rgba(225, 29, 72, 0.3)', background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.05), transparent)' }}>
                            <h3 style={{ color: 'var(--danger)', marginBottom: 'var(--spacing-sm)' }}>Unavailable / Unmatched Items ({unavailableItems.length})</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: 'var(--spacing-md)' }}>
                                The following requested items were unable to be matched to a product, or do not currently exist in your catalogue. These will be explicitly marked as unserviceable in the generated email & PDF quotation.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {unavailableItems.map(item => (
                                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-primary)' }}>
                                        <div style={{ fontStyle: 'italic' }}>"{item.requested_description}"</div>
                                        {isEditable && (
                                            <button onClick={() => setEditingItem(item.id)} className="btn btn-ghost" style={{ padding: '0 8px', color: 'var(--primary)' }}>
                                                Link manually
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar -> Summary & Original Email */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>

                    {/* Financial Summary */}
                    <div className="glass-card card-body">
                        <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Summary</h3>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                            <span>Subtotal</span>
                            <span>₹{formatNum(quotation.subtotal)}</span>
                        </div>
                        {parseFloat(quotation.discount) > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--success)' }}>
                                <span>Discount</span>
                                <span>-₹{formatNum(quotation.discount)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                            <span>GST (18%)</span>
                            <span>₹{formatNum(quotation.tax)}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border-primary)', fontWeight: 700, fontSize: '20px', color: 'var(--text-primary)' }}>
                            <span>Grand Total</span>
                            <span>₹{formatNum(quotation.grand_total)}</span>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="glass-card card-body">
                        <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Customer</h3>
                        {quotation.customers ? (
                            <>
                                <div style={{ fontWeight: 600 }}>{quotation.customers.company_name}</div>
                                <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{quotation.customers.email}</div>
                                {quotation.customers.phone && <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{quotation.customers.phone}</div>}
                            </>
                        ) : (
                            <div style={{ color: 'var(--danger)' }}>Unknown Customer</div>
                        )}
                    </div>

                    {/* Original Email */}
                    {email && (
                        <div className="glass-card card-body">
                            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Original Context</h3>
                            <div style={{ fontSize: '13px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', padding: 'var(--spacing-md)', borderRadius: '8px' }}>
                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Subject: {email.subject}</div>
                                <div style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                                    {email.body.substring(0, 300)}...
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const formatNum = (num) => parseFloat(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default QuotationDetailPage;
