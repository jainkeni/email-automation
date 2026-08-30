import { useNavigate } from 'react-router-dom';

const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

const RequestTable = ({ requests, loading }) => {
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="loading-spinner">
                <div className="spinner" />
                <span className="loading-text">Loading requests...</span>
            </div>
        );
    }

    if (!requests || requests.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                        <rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="22,6 12,13 2,6" />
                        <line x1="2" y1="20" x2="8" y2="14" />
                        <line x1="22" y1="20" x2="16" y2="14" />
                    </svg>
                </div>
                <div className="empty-state-text">No requests found</div>
                <div className="empty-state-sub">
                    New customer emails will appear here automatically
                </div>
            </div>
        );
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table className="request-table">
                <thead>
                    <tr>
                        <th>Sender</th>
                        <th>Subject</th>
                        <th>Category</th>
                        <th>Urgency</th>
                        <th>Status</th>
                        <th>Received</th>
                    </tr>
                </thead>
                <tbody>
                    {requests.map((req, index) => (
                        <tr
                            key={req.id || req._id || index}
                            className="stagger-item"
                            style={{ animationDelay: `${index * 0.05}s` }}
                            onClick={() => navigate(`/requests/${req.id || req._id}`)}
                        >
                            <td>
                                <div className="request-sender">
                                    <span className="request-sender-name">
                                        {req.ai_analysis?.customerName !== 'Not specified' && req.ai_analysis?.customerName
                                            ? req.ai_analysis.customerName
                                            : req.from_name || req.fromName || (req.from_email || req.from)?.split('@')[0]}
                                    </span>
                                    <span className="request-sender-email">
                                        {req.ai_analysis?.company !== 'Not specified' && req.ai_analysis?.company
                                            ? req.ai_analysis.company
                                            : req.from_email || req.from}
                                    </span>
                                </div>
                            </td>
                            <td>
                                <div className="request-subject">{req.subject}</div>
                                <div className="request-summary">
                                    {req.ai_analysis?.summary?.substring(0, 80) || req.aiAnalysis?.summary?.substring(0, 80) || ''}
                                </div>
                            </td>
                            <td>
                                <span className="badge badge-category">
                                    {req.ai_analysis?.category || req.aiAnalysis?.category || 'General'}
                                </span>
                            </td>
                            <td>
                                <span className={`badge badge-urgency-${req.ai_analysis?.urgency || req.aiAnalysis?.urgency || 'medium'}`}>
                                    {(req.ai_analysis?.urgency || req.aiAnalysis?.urgency || 'medium').charAt(0).toUpperCase() +
                                        (req.ai_analysis?.urgency || req.aiAnalysis?.urgency || 'medium').slice(1)}
                                </span>
                            </td>
                            <td>
                                <span className={`badge badge-${req.status}`}>
                                    {req.status ? req.status.charAt(0).toUpperCase() + req.status.slice(1).toLowerCase() : 'Pending'}
                                </span>
                            </td>
                            <td>
                                <span className="time-ago">{formatTimeAgo(req.received_at || req.receivedAt || req.created_at || req.createdAt)}</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default RequestTable;
