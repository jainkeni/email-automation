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
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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
                <div className="empty-state-icon">📭</div>
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
                            key={req._id}
                            className="stagger-item"
                            style={{ animationDelay: `${index * 0.05}s` }}
                            onClick={() => navigate(`/requests/${req._id}`)}
                        >
                            <td>
                                <div className="request-sender">
                                    <span className="request-sender-name">
                                        {req.aiAnalysis?.customerName !== 'Not specified'
                                            ? req.aiAnalysis.customerName
                                            : req.fromName || req.from.split('@')[0]}
                                    </span>
                                    <span className="request-sender-email">
                                        {req.aiAnalysis?.company !== 'Not specified'
                                            ? req.aiAnalysis.company
                                            : req.from}
                                    </span>
                                </div>
                            </td>
                            <td>
                                <div className="request-subject">{req.subject}</div>
                                <div className="request-summary">
                                    {req.aiAnalysis?.summary?.substring(0, 80) || ''}
                                </div>
                            </td>
                            <td>
                                <span className="badge badge-category">
                                    {req.aiAnalysis?.category || 'General'}
                                </span>
                            </td>
                            <td>
                                <span className={`badge badge-urgency-${req.aiAnalysis?.urgency || 'medium'}`}>
                                    {req.aiAnalysis?.urgency === 'high' && '🔴 '}
                                    {req.aiAnalysis?.urgency === 'medium' && '🟡 '}
                                    {req.aiAnalysis?.urgency === 'low' && '🟢 '}
                                    {(req.aiAnalysis?.urgency || 'medium').charAt(0).toUpperCase() +
                                        (req.aiAnalysis?.urgency || 'medium').slice(1)}
                                </span>
                            </td>
                            <td>
                                <span className={`badge badge-${req.status}`}>
                                    {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                                </span>
                            </td>
                            <td>
                                <span className="time-ago">{formatTimeAgo(req.receivedAt || req.createdAt)}</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default RequestTable;
