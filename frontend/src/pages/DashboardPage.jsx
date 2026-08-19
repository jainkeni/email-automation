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
                // If we already tracked an ID, and the top one changed, it's a new email!
                if (lastLatestId.current && lastLatestId.current !== latestNewId) {
                    toast.success(
                        `📧 New email: "${newRequests[0].subject}"`,
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
        // Poll every 5 seconds instead of using WebSockets
        const interval = setInterval(() => {
            fetchDashboardData();
        }, 5000);
        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Overview of your email automation pipeline</p>
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
                            <div className="glass-card card-body" onClick={() => navigate('/quotations')} style={{ cursor: 'pointer' }}>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Pending Quotations</div>
                                <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px' }}>{quotationMetrics.draft + quotationMetrics.needsReview}</div>
                            </div>
                            <div className="glass-card card-body">
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>AI Match Accuracy</div>
                                <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px', color: 'var(--success)' }}>{quotationMetrics.aiMatchRate}%</div>
                            </div>
                            <div className="glass-card card-body">
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Human Corrections</div>
                                <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px', color: 'var(--warning)' }}>{quotationMetrics.correctionRate}%</div>
                            </div>
                            <div className="glass-card card-body">
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Value Generated</div>
                                <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px', color: 'var(--accent-primary)' }}>${quotationMetrics.totalValue.toLocaleString('en-US')}</div>
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
                                        <span className="card-header-title">📂 By Category</span>
                                    </div>
                                    <div className="card-body">
                                        {Object.entries(stats.categoryStats).map(([category, count]) => (
                                            <div key={category} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '10px 0',
                                                borderBottom: '1px solid var(--border-primary)',
                                            }}>
                                                <span className="badge badge-category">{category}</span>
                                                <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Urgency Breakdown */}
                            {stats.urgencyStats && Object.keys(stats.urgencyStats).length > 0 && (
                                <div className="glass-card">
                                    <div className="card-header">
                                        <span className="card-header-title">🎯 By Urgency</span>
                                    </div>
                                    <div className="card-body">
                                        {Object.entries(stats.urgencyStats).map(([urgency, count]) => (
                                            <div key={urgency} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '10px 0',
                                                borderBottom: '1px solid var(--border-primary)',
                                            }}>
                                                <span className={`badge badge-urgency-${urgency}`}>
                                                    {urgency === 'high' && '🔴 '}
                                                    {urgency === 'medium' && '🟡 '}
                                                    {urgency === 'low' && '🟢 '}
                                                    {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
                                                </span>
                                                <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{count}</span>
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
                            <span className="card-header-title">📧 Recent Requests</span>
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
