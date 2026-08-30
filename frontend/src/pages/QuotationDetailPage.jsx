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

    if (loading) {
        return (
            <div className="loading-spinner">
                <div className="spinner" />
                <span className="loading-text">Loading quotation details...</span>
            </div>
        );
    }
    if (!quotation) return <div className="empty-state"><div className="empty-state-text">Quotation not found</div></div>;

    const isEditable = quotation.status === 'DRAFT' || quotation.status === 'NEEDS_REVIEW';
    const validItems = items.filter(i => i.product_id != null && i.status !== 'UNAVAILABLE');
    const unavailableItems = items.filter(i => i.product_id == null || i.status === 'UNAVAILABLE');

    return (
        <div className="fade-in" style={{ paddingBottom: '100px' }}>
            <button className="detail-back" onClick={() => navigate(-1)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                </svg>
                Back to Quotations
            </button>

            <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 className="page-title">Quotation {quotation.quotation_number}</h1>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
                        <span className={`badge ${quotation.status === 'APPROVED' || quotation.status === 'SENT' ? 'badge-success' : quotation.status === 'NEEDS_REVIEW' ? 'badge-warning' : 'badge-info'}`}>
                            {quotation.status.replace('_', ' ')}
                        </span>
                        <span className="time-ago">
                            Created: {new Date(quotation.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {isEditable && (
                        <button className="btn btn-success" onClick={handleApprove}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Confirm & Approve
                        </button>
                    )}
                    {quotation.status === 'APPROVED' && (
                        <button className="btn btn-primary" onClick={handleSend} disabled={sending}>
                            {sending ? (
                                <>
                                    <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                                    </svg>
                                    Send to Customer
                                </>
                            )}
                        </button>
                    )}
                    {quotation.status === 'SENT' && (
                        <button className="btn btn-success" style={{ opacity: 0.7, pointerEvents: 'none' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Sent to Customer
                        </button>
                    )}
                </div>
            </header>

            <div className="quotation-grid">
                {/* Main Content -> Line Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="glass-card">
                        <div className="card-header">
                            <span className="card-header-title">
                                <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                                Line Items ({validItems.length})
                            </span>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Requested</th>
                                        <th>Matched Product</th>
                                        <th style={{ width: '100px', textAlign: 'center' }}>Quantity</th>
                                        <th style={{ width: '120px', textAlign: 'right' }}>Unit Price ($)</th>
                                        <th style={{ width: '120px', textAlign: 'right' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {validItems.map((item) => (
                                        <React.Fragment key={item.id}>
                                            <tr style={{ background: item.status === 'NEEDS_REVIEW' ? 'rgba(245, 158, 11, 0.05)' : 'transparent' }}>
                                                <td style={{ padding: '16px' }}>
                                                    <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '13px' }}>"{item.requested_description}"</div>
                                                    {item.status === 'NEEDS_REVIEW' && <div className="badge badge-warning" style={{ marginTop: '8px' }}>Needs Verification</div>}
                                                    {item.status === 'AI_MATCHED' && <div className="badge badge-success" style={{ marginTop: '8px' }}>AI Matched ({(item.confidence * 100).toFixed(0)}%)</div>}
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    {item.products ? (
                                                        <div>
                                                            <div style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: '12px', fontFamily: 'monospace' }}>{item.products.sku}</div>
                                                            <div style={{ fontSize: '13px' }}>{item.products.name}</div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '13px' }}>No product matched!</div>
                                                    )}
                                                    {isEditable && (
                                                        <button onClick={() => setEditingItem(item.id)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', padding: 0, marginTop: '8px', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline', fontFamily: 'inherit' }}>
                                                            Change Product
                                                        </button>
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'center' }}>
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
                                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                                    {isEditable ? (
                                                        <input
                                                            type="number"
                                                            className="form-input"
                                                            value={item.unit_price || ''}
                                                            onChange={(e) => handleUpdateItem(item.id, 'price', parseFloat(e.target.value))}
                                                            style={{ width: '100px', padding: '6px', textAlign: 'right' }}
                                                        />
                                                    ) : (
                                                        <div>${formatNum(item.unit_price)}</div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, fontFamily: 'Inter, sans-serif', fontSize: '15px' }}>
                                                    ${formatNum(item.line_total)}
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
                                                                <div style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '8px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                                                                    {searchResults.map(p => (
                                                                        <div
                                                                            key={p.id}
                                                                            onClick={() => handleReplaceProduct(item.id, p.id)}
                                                                            style={{ padding: '12px', borderBottom: '1px solid var(--border-primary)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.15s' }}
                                                                            onMouseOver={e => e.currentTarget.style.background = 'var(--bg-glass-hover)'}
                                                                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                                                        >
                                                                            <div><span style={{ fontWeight: 600 }}>{p.sku}</span> - {p.name}</div>
                                                                            <div style={{ fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>${p.base_price}</div>
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
                        <div className="glass-card" style={{ borderColor: 'rgba(225, 29, 72, 0.2)', background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.04), transparent)' }}>
                            <div className="card-header" style={{ borderBottomColor: 'rgba(225, 29, 72, 0.15)' }}>
                                <span className="card-header-title" style={{ color: 'var(--danger)' }}>
                                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                    Unavailable / Unmatched Items ({unavailableItems.length})
                                </span>
                            </div>
                            <div className="card-body">
                                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
                                    The following requested items were unable to be matched to a product, or do not currently exist in your catalogue. These will be explicitly marked as unserviceable in the generated email & PDF quotation.
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {unavailableItems.map(item => (
                                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', alignItems: 'center' }}>
                                            <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '13px' }}>"{item.requested_description}"</div>
                                            {isEditable && (
                                                <button onClick={() => setEditingItem(item.id)} className="btn btn-ghost btn-sm">
                                                    Link manually
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar -> Summary & Original Email */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Financial Summary */}
                    <div className="glass-card">
                        <div className="card-header">
                            <span className="card-header-title">
                                <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                                Summary
                            </span>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                <span>Subtotal</span>
                                <span>${formatNum(quotation.subtotal)}</span>
                            </div>
                            {parseFloat(quotation.discount) > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: 'var(--success)' }}>
                                    <span>Discount</span>
                                    <span>-${formatNum(quotation.discount)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                <span>Tax (18%)</span>
                                <span>${formatNum(quotation.tax)}</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border-primary)', fontWeight: 700, fontSize: '22px', fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)' }}>
                                <span>Grand Total</span>
                                <span style={{ color: 'var(--accent-primary)' }}>${formatNum(quotation.grand_total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="glass-card">
                        <div className="card-header">
                            <span className="card-header-title">
                                <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                Customer
                            </span>
                        </div>
                        <div className="card-body">
                            {quotation.customers ? (
                                <>
                                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{quotation.customers.company_name}</div>
                                    <div style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: '13px' }}>{quotation.customers.email}</div>
                                    {quotation.customers.phone && <div style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '13px' }}>{quotation.customers.phone}</div>}
                                </>
                            ) : (
                                <div style={{ color: 'var(--danger)', fontWeight: 500 }}>Unknown Customer</div>
                            )}
                        </div>
                    </div>

                    {/* Original Email */}
                    {email && (
                        <div className="glass-card">
                            <div className="card-header">
                                <span className="card-header-title">
                                    <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="22,6 12,13 2,6" /></svg>
                                    Original Context
                                </span>
                            </div>
                            <div className="card-body">
                                <div style={{ fontSize: '13px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                                    <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}>Subject: {email.subject}</div>
                                    <div style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '12px', lineHeight: '1.6' }}>
                                        {email.body.substring(0, 300)}...
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const formatNum = (num) => parseFloat(num || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default QuotationDetailPage;
