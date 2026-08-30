import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { quotationsAPI } from '../services/api';

const QuotationsPage = () => {
    const navigate = useNavigate();
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({});
    const [filters, setFilters] = useState({
        status: 'all',
        search: '',
        page: 1,
    });

    const fetchQuotations = useCallback(async (isPolling = false) => {
        if (!isPolling) setLoading(true);
        try {
            const params = { page: filters.page, limit: 20, sort: '-createdAt' };
            if (filters.status !== 'all') params.status = filters.status;
            if (filters.search) params.search = filters.search;
            const res = await quotationsAPI.getAll(params);
            setQuotations(res.data.quotations);
            setPagination(res.data.pagination);
        } catch (error) {
            console.error('Failed to fetch quotations:', error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchQuotations(false);
        const interval = setInterval(() => fetchQuotations(true), 5000);
        return () => clearInterval(interval);
    }, [fetchQuotations]);

    const statusTabs = [
        { key: 'all', label: 'All' },
        { key: 'draft', label: 'Draft' },
        { key: 'needs_review', label: 'Needs Review' },
        { key: 'approved', label: 'Approved' },
        { key: 'sent', label: 'Sent' },
    ];

    const getStatusBadge = (status) => {
        const map = {
            draft: { cls: 'badge-secondary', label: 'Draft' },
            needs_review: { cls: 'badge-warning', label: 'Needs Review' },
            approved: { cls: 'badge-success', label: 'Approved' },
            sent: { cls: 'badge-info', label: 'Sent' },
            rejected: { cls: 'badge-error', label: 'Rejected' },
        };
        const key = status ? status.toLowerCase() : '';
        const badge = map[key] || { cls: 'badge-secondary', label: status };
        return <span className={`badge ${badge.cls}`}>{badge.label}</span>;
    };

    let searchTimeout;
    const handleSearchChange = (e) => {
        clearTimeout(searchTimeout);
        const value = e.target.value;
        searchTimeout = setTimeout(() => {
            setFilters((prev) => ({ ...prev, search: value, page: 1 }));
        }, 400);
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1 className="page-title">Quotations</h1>
                <p className="page-subtitle">Track and manage AI-generated quotations</p>
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
                        placeholder="Search quotations by customer or reference..."
                        onChange={handleSearchChange}
                    />
                </div>
                <div className="filter-tabs">
                    {statusTabs.map((tab) => (
                        <button
                            key={tab.key}
                            className={`filter-tab ${filters.status === tab.key ? 'active' : ''}`}
                            onClick={() => setFilters((prev) => ({ ...prev, status: tab.key, page: 1 }))}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="glass-card">
                {loading ? (
                    <div className="loading-spinner">
                        <div className="spinner" />
                        <span className="loading-text">Loading quotations...</span>
                    </div>
                ) : quotations.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                            </svg>
                        </div>
                        <div className="empty-state-text">No quotations found</div>
                        <div className="empty-state-sub">
                            Quotations are generated from email requests
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Reference</th>
                                        <th>Customer</th>
                                        <th>Items</th>
                                        <th>Total</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quotations.map((q, index) => (
                                        <tr
                                            key={q._id || q.id || index}
                                            onClick={() => navigate(`/quotations/${q._id || q.id}`)}
                                            style={{ animationDelay: `${index * 0.05}s` }}
                                        >
                                            <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                                                {q.quotationNumber || (q._id || q.id || String(index)).slice(-6).toUpperCase()}
                                            </td>
                                            <td>
                                                <div className="request-sender">
                                                    <span className="request-sender-name">{q.customers?.company_name || q.customers?.contact_name || q.customers?.email || 'Unknown'}</span>
                                                    <span className="request-sender-email">{q.customers?.email || ''}</span>
                                                </div>
                                            </td>
                                            <td>{q.flaggedLines ? `${q.flaggedLines} flagged` : '—'}</td>
                                            <td style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
                                                ${parseFloat(q.grand_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td>{getStatusBadge(q.status)}</td>
                                            <td>
                                                <span className="time-ago">
                                                    {q.created_at || q.createdAt ? new Date(q.created_at || q.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'Invalid Date'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {pagination.pages > 1 && (
                            <div className="pagination">
                                <button
                                    className="pagination-btn"
                                    disabled={pagination.page <= 1}
                                    onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                                >
                                    ← Previous
                                </button>
                                <span className="pagination-info">
                                    Page {pagination.page} of {pagination.pages}
                                </span>
                                <button
                                    className="pagination-btn"
                                    disabled={pagination.page >= pagination.pages}
                                    onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default QuotationsPage;
