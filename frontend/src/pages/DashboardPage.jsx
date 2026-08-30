import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import StatsCards from '../components/StatsCards';
import RequestTable from '../components/RequestTable';
import { requestsAPI, quotationsAPI } from '../services/api';

const DashboardPage = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [recentRequests, setRecentRequests] = useState([]);
    const [quotationMetrics, setQuotationMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const lastLatestId = useRef(null);

    const fetchDashboardData = useCallback(async () => {
        try {
            const [statsRes, requestsRes, quotationRes] = await Promise.all([
                requestsAPI.getStats(),
                requestsAPI.getAll({ limit: 10, sort: '-createdAt' }),
                quotationsAPI.getMetrics().catch(() => ({ data: null }))
            ]);
            setStats(statsRes.data);

            const newRequests = requestsRes.data.requests;
            if (newRequests.length > 0) {
                const latestNewId = newRequests[0].id;
                if (lastLatestId.current && lastLatestId.current !== latestNewId) {
                    toast.success(
                        `New email: "${newRequests[0].subject}"`,
                        { duration: 5000, id: 'sys-new-email' }
                    );
                }
                lastLatestId.current = latestNewId;
            }
            setRecentRequests(newRequests);

            if (quotationRes.data) setQuotationMetrics(quotationRes.data);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(() => {
            fetchDashboardData();
        }, 5000);
        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">
                    <span className="pulse-dot"></span>
                    Live overview of your email automation pipeline
                </p>
            </div>

            {loading ? (
                <div className="loading-spinner">
                    <div className="spinner" />
                    <span className="loading-text">Loading dashboard...</span>
                </div>
            ) : (
                <>
                    <StatsCards stats={stats} />

                    {/* Quotation Metrics */}
                    {quotationMetrics && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                            <div className="metric-card" onClick={() => navigate('/quotations')}>
                                <div className="metric-card-label">Pending Quotations</div>
                                <div className="metric-card-value" style={{ color: 'var(--text-primary)' }}>
                                    {quotationMetrics.draft + quotationMetrics.needsReview}
                                </div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-card-label">AI Match Accuracy</div>
                                <div className="metric-card-value" style={{ color: 'var(--success)' }}>
                                    {quotationMetrics.aiMatchRate}%
                                </div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-card-label">Human Corrections</div>
                                <div className="metric-card-value" style={{ color: 'var(--warning)' }}>
                                    {quotationMetrics.correctionRate}%
                                </div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-card-label">Total Value Generated</div>
                                <div className="metric-card-value" style={{ color: 'var(--accent-primary)' }}>
                                    ${quotationMetrics.totalValue.toLocaleString('en-US')}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Category & Urgency Breakdown */}
                    {stats && (stats.categoryStats || stats.urgencyStats) && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                            {/* Category Breakdown */}
                            {stats.categoryStats && Object.keys(stats.categoryStats).length > 0 && (
                                <div className="glass-card">
                                    <div className="card-header">
                                        <span className="card-header-title">
                                            <svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                                            By Category
                                        </span>
                                    </div>
                                    <div className="card-body">
                                        {Object.entries(stats.categoryStats).map(([category, count]) => (
                                            <div key={category} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px 0',
                                                borderBottom: '1px solid var(--border-subtle)',
                                            }}>
                                                <span className="badge badge-category">{category}</span>
                                                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Urgency Breakdown */}
                            {stats.urgencyStats && Object.keys(stats.urgencyStats).length > 0 && (
                                <div className="glass-card">
                                    <div className="card-header">
                                        <span className="card-header-title">
                                            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                            By Urgency
                                        </span>
                                    </div>
                                    <div className="card-body">
                                        {Object.entries(stats.urgencyStats).map(([urgency, count]) => (
                                            <div key={urgency} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px 0',
                                                borderBottom: '1px solid var(--border-subtle)',
                                            }}>
                                                <span className={`badge badge-urgency-${urgency}`}>
                                                    {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                                                </span>
                                                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Recent Requests */}
                    <div className="glass-card">
                        <div className="card-header">
                            <span className="card-header-title">
                                <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="22,6 12,13 2,6" /></svg>
                                Recent Requests
                            </span>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => navigate('/requests')}
                            >
                                View All →
                            </button>
                        </div>
                        <RequestTable requests={recentRequests} loading={false} />
                    </div>
                </>
            )}
        </div>
    );
};

export default DashboardPage;
