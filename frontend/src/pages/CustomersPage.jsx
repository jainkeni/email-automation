import { useState, useEffect } from 'react';
import { customersAPI } from '../services/api';

const CustomersPage = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});

    useEffect(() => {
        fetchCustomers();
    }, [search, page]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 20 };
            if (search) params.search = search;
            const res = await customersAPI.getAll(params);
            setCustomers(res.data.customers || res.data);
            setPagination(res.data.pagination || {});
        } catch (error) {
            console.error('Failed to fetch customers:', error);
        } finally {
            setLoading(false);
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

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1 className="page-title">Customers</h1>
                <p className="page-subtitle">Customer directory auto-populated from email requests</p>
            </div>

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
                        placeholder="Search by name, email, or company..."
                        onChange={handleSearchChange}
                    />
                </div>
            </div>

            <div className="glass-card">
                {loading ? (
                    <div className="loading-spinner">
                        <div className="spinner" />
                        <span className="loading-text">Loading customers...</span>
                    </div>
                ) : customers.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <div className="empty-state-text">No customers found</div>
                        <div className="empty-state-sub">Customers are added automatically from incoming emails</div>
                    </div>
                ) : (
                    <>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Customer</th>
                                        <th>Company</th>
                                        <th>Phone</th>
                                        <th>Inquiries</th>
                                        <th>Last Contact</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customers.map((c, index) => (
                                        <tr key={c._id || c.id || index} style={{ animationDelay: `${index * 0.04}s`, cursor: 'default' }}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div className="sidebar-avatar" style={{ width: '34px', height: '34px', fontSize: '11px', borderRadius: 'var(--radius-sm)' }}>
                                                        {getInitials(c.contact_name || c.company_name)}
                                                    </div>
                                                    <div className="request-sender">
                                                        <span className="request-sender-name">{c.contact_name || c.company_name || 'Unknown'}</span>
                                                        <span className="request-sender-email">{c.email || ''}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ fontWeight: 500 }}>
                                                {c.company_name || '—'}
                                            </td>
                                            <td>
                                                {c.phone ? (
                                                    <span style={{ fontSize: '13px' }}>{c.phone}</span>
                                                ) : '—'}
                                            </td>
                                            <td style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                                                {c.request_count || c.total_requests || 0}
                                            </td>
                                            <td>
                                                <span className="time-ago">
                                                    {c.last_contact_at || c.updated_at ? new Date(c.last_contact_at || c.updated_at).toLocaleDateString('en-US', {
                                                        year: 'numeric', month: 'short', day: 'numeric'
                                                    }) : '—'}
                                                </span>
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

export default CustomersPage;
