import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import StatsCards from '../components/StatsCards';
import RequestTable from '../components/RequestTable';
import { requestsAPI } from '../services/api';
import useSocket from '../hooks/useSocket';

const DashboardPage = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [recentRequests, setRecentRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = useCallback(async () => {
        try {
            const [statsRes, requestsRes] = await Promise.all([
                requestsAPI.getStats(),
                requestsAPI.getAll({ limit: 10, sort: '-createdAt' }),
            ]);
            setStats(statsRes.data);
            setRecentRequests(requestsRes.data.requests);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Real-time: refresh dashboard instantly when a new email arrives
    useSocket('new_email', useCallback((data) => {
        fetchDashboardData();
        toast.success(
            `📧 New email: "${data.subject}"`,
            { duration: 5000, id: 'new-email-dash' }
        );
    }, [fetchDashboardData]));

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
