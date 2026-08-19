import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { quotationsAPI } from '../services/api';

const QuotationsPage = () => {
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0 });
    const navigate = useNavigate();

    useEffect(() => {
        fetchQuotations();
    }, [pagination.page, statusFilter, searchTerm]);

    const fetchQuotations = async () => {
        try {
            setLoading(true);
            const { data } = await quotationsAPI.getAll({
                page: pagination.page,
                search: searchTerm,
                status: statusFilter
            });
            setQuotations(data.quotations);
            setPagination(data.pagination);
        } catch (error) {
            toast.error('Failed to fetch quotations');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setPagination({ ...pagination, page: 1 });
    };

    const getStatusTheme = (status) => {
        const themes = {
            DRAFT: 'badge-info',
            NEEDS_REVIEW: 'badge-warning',
            APPROVED: 'badge-success',
            SENT: 'badge-success',
            REJECTED: 'badge-error',
        };
        return themes[status] || 'badge-secondary';
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Quotations Dashboard</h1>
                    <p className="page-subtitle">Review, edit, and send AI-generated quotations</p>
                </div>
            </header>

            <div className="card card-body" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                    <input
                        type="text"
                        placeholder="Search by Quotation No..."
                        className="form-input"
                        value={searchTerm}
                        onChange={handleSearch}
                        style={{ flex: 1, maxWidth: '400px' }}
                    />
                    <select
                        className="form-input"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPagination({ ...pagination, page: 1 }); }}
                        style={{ width: '200px' }}
                    >
                        <option value="all">All Statuses</option>
                        <option value="DRAFT">Draft</option>
                        <option value="NEEDS_REVIEW">Needs Review</option>
                        <option value="APPROVED">Approved</option>
                        <option value="SENT">Sent</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </div>
            </div>

            <div className="card">
                {loading ? (
                    <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading quotations...</div>
                ) : (
                    <>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Quotation No</th>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Total Value</th>
                                    <th>Status</th>
                                    <th>Flags</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quotations.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                                            No quotations found.
                                        </td>
                                    </tr>
                                ) : (
                                    quotations.map(q => (
                                        <tr
                                            key={q.id}
                                            onClick={() => navigate(`/quotations/${q.id}`)}
                                            style={{ cursor: 'pointer' }}
                                            className="table-row-hover"
                                        >
                                            <td style={{ fontWeight: '600', color: 'var(--primary-color)' }}>{q.quotation_number}</td>
                                            <td>{new Date(q.created_at).toLocaleDateString()}</td>
                                            <td>
                                                <div style={{ fontWeight: 500 }}>{q.customers?.company_name || 'Unknown User'}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{q.customers?.email || q.quotation_requests?.email_id}</div>
                                            </td>
                                            <td style={{ fontWeight: '600' }}>₹{parseFloat(q.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            <td>
                                                <span className={`badge ${getStatusTheme(q.status)}`}>
                                                    {q.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td>
                                                {q.flaggedLines > 0 && (
                                                    <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        ⚠️ {q.flaggedLines} Item{q.flaggedLines > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--spacing-lg)' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                Showing {quotations.length} of {pagination.total} quotations
                            </span>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                <button className="pagination-btn" disabled={pagination.page === 1} onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}>
                                    Previous
                                </button>
                                <button className="pagination-btn" disabled={pagination.page === pagination.pages} onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}>
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
            <style>{`
                .table-row-hover:hover {
                    background-color: var(--background-hover);
                }
            `}</style>
        </div>
    );
};

export default QuotationsPage;
