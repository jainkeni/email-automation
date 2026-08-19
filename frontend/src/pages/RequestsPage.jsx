import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import RequestTable from '../components/RequestTable';
import { requestsAPI } from '../services/api';

const RequestsPage = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({});
    const [filters, setFilters] = useState({
        status: 'all',
        search: '',
        page: 1,
    });
    const lastLatestId = useRef(null);

    const fetchRequests = useCallback(async (isPolling = false) => {
        if (!isPolling) setLoading(true);
        try {
            const params = {
                page: filters.page,
                limit: 20,
                sort: '-createdAt',
            };
            if (filters.status !== 'all') params.status = filters.status;
            if (filters.search) params.search = filters.search;

            const res = await requestsAPI.getAll(params);

            const newRequests = res.data.requests;

            // Only fire toast if we are on page 1 and no active search
            if (filters.page === 1 && !filters.search && newRequests.length > 0) {
                const latestNewId = newRequests[0].id;
                if (lastLatestId.current && lastLatestId.current !== latestNewId) {
                    toast.success(
                        `📧 New email from ${newRequests[0].from_name || newRequests[0].from_email}\n"${newRequests[0].subject}"`,
                        { duration: 5000, id: 'sys-new-email-req' }
                    );
                }
                lastLatestId.current = latestNewId;
            }

            setRequests(newRequests);
            setPagination(res.data.pagination);
        } catch (error) {
            console.error('Failed to fetch requests:', error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchRequests(false);
        const interval = setInterval(() => {
            fetchRequests(true);
        }, 5000);
        return () => clearInterval(interval);
    }, [fetchRequests]);

    const statusTabs = [
        { key: 'all', label: 'All' },
        { key: 'pending', label: 'Pending' },
        { key: 'approved', label: 'Approved' },
        { key: 'rejected', label: 'Rejected' },
    ];

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
                <h1 className="page-title">Email Requests</h1>
                <p className="page-subtitle">Review and manage incoming customer emails</p>
            </div>

            {/* Filter Bar */}
            <div className="filter-bar">
                <div className="search-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search by sender, subject, or company..."
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

            {/* Request Table */}
            <div className="glass-card">
                <RequestTable requests={requests} loading={loading} />

                {/* Pagination */}
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
                            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
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
            </div>
        </div>
    );
};

export default RequestsPage;
