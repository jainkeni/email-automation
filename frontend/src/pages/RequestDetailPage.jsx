import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AiAnalysisCard from '../components/AiAnalysisCard';
import DraftReplyEditor from '../components/DraftReplyEditor';
import FormattedEmailBody from '../components/FormattedEmailBody';
import { requestsAPI, quotationsAPI } from '../services/api';

const RequestDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isGeneratingQuotation, setIsGeneratingQuotation] = useState(false);
    const [quotationId, setQuotationId] = useState(null); // set after quotation is created

    useEffect(() => {
        fetchRequest();
    }, [id]);

    const fetchRequest = async () => {
        try {
            const res = await requestsAPI.getById(id);
            setRequest(res.data);
        } catch (error) {
            console.error('Failed to fetch request:', error);
            toast.error('Request not found');
            navigate('/requests');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (replyText) => {
        setIsApproving(true);
        try {
            const res = await requestsAPI.approve(id, replyText);
            setRequest(res.data.request);
            toast.success('Reply sent successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send reply');
        } finally {
            setIsApproving(false);
        }
    };

    const handleReject = async (reason) => {
        setIsRejecting(true);
        try {
            const res = await requestsAPI.reject(id, reason);
            setRequest(res.data.request);
            toast.success('Request rejected');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to reject request');
        } finally {
            setIsRejecting(false);
        }
    };

    const handleRegenerate = async () => {
        setIsRegenerating(true);
        try {
            const res = await requestsAPI.regenerate(id);
            setRequest(res.data.request);
            toast.success('AI draft regenerated!');
            return res.data.request.aiDraftReply;
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to regenerate draft');
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleGenerateQuotation = async () => {
        setIsGeneratingQuotation(true);
        try {
            const res = await quotationsAPI.analyze(id);
            const newQuotationId = res.data.quotation.id;
            setQuotationId(newQuotationId);
            toast.success('Quotation draft created! Redirecting...');
            setTimeout(() => navigate(`/quotations/${newQuotationId}`), 1200);
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to generate quotation';
            if (error.response?.status === 409) {
                toast.error('A quotation already exists for this request.');
            } else {
                toast.error(msg);
            }
        } finally {
            setIsGeneratingQuotation(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="loading-spinner">
                <div className="spinner" />
                <span className="loading-text">Loading request details...</span>
            </div>
        );
    }

    if (!request) return null;

    return (
        <div className="fade-in">
            <button className="detail-back" onClick={() => navigate(-1)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                </svg>
                Back to Requests
            </button>

            <div className="page-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <h1 className="page-title" style={{ fontSize: '22px' }}>
                        {request.subject}
                    </h1>
                    <span className={`badge badge-${request.status}`}>
                        {request.status === 'approved' ? 'Reply Sent' : request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                    {request.status === 'approved' && !quotationId && (
                        <button
                            className="btn btn-primary"
                            style={{ marginLeft: 'auto' }}
                            onClick={handleGenerateQuotation}
                            disabled={isGeneratingQuotation}
                        >
                            {isGeneratingQuotation ? (
                                <>
                                    <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                                    Creating Quotation...
                                </>
                            ) : (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                                    </svg>
                                    Customer Confirmed — Create Quotation
                                </>
                            )}
                        </button>
                    )}
                    {request.status === 'approved' && quotationId && (
                        <button
                            className="btn btn-ghost"
                            style={{ marginLeft: 'auto' }}
                            onClick={() => navigate(`/quotations/${quotationId}`)}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                            </svg>
                            View Quotation
                        </button>
                    )}
                </div>
                {request.status === 'approved' && !quotationId && (
                    <div style={{
                        marginTop: '12px',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        background: 'rgba(59,130,246,0.08)',
                        border: '1px solid rgba(59,130,246,0.25)',
                        color: 'var(--text-secondary)',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        Initial reply sent to customer. Once the customer confirms their requirement, click <strong style={{ color: 'var(--text-primary)', margin: '0 4px' }}>Customer Confirmed — Create Quotation</strong> to generate the formal quotation.
                    </div>
                )}
                {request.status === 'approved' && quotationId && (
                    <div style={{
                        marginTop: '12px',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        background: 'rgba(34,197,94,0.08)',
                        border: '1px solid rgba(34,197,94,0.25)',
                        color: 'var(--text-secondary)',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        Quotation created successfully. Review and approve it before sending to the customer.
                    </div>
                )}
            </div>

            <div className="detail-layout">
                {/* Left Column: Email Content + Draft Reply */}
                <div>
                    {/* Original Email */}
                    <div className="glass-card" style={{ marginBottom: '24px' }}>
                        <div className="card-header">
                            <span className="card-header-title">
                                <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="22,6 12,13 2,6" /></svg>
                                Original Email
                            </span>
                            <span className="time-ago">{formatDate(request.receivedAt)}</span>
                        </div>
                        <div className="email-content-box">
                            <div className="email-meta">
                                <span className="email-meta-label">From</span>
                                <span className="email-meta-value">
                                    {request.fromName ? `${request.fromName} <${request.from}>` : request.from}
                                </span>
                                <span className="email-meta-label">Subject</span>
                                <span className="email-meta-value">{request.subject}</span>
                                <span className="email-meta-label">Received</span>
                                <span className="email-meta-value">{formatDate(request.receivedAt)}</span>
                                {request.repliedAt && (
                                    <>
                                        <span className="email-meta-label">Replied</span>
                                        <span className="email-meta-value">{formatDate(request.repliedAt)}</span>
                                    </>
                                )}
                            </div>
                            <FormattedEmailBody body={request.body} />
                        </div>
                    </div>

                    {/* Draft Reply Editor */}
                    <DraftReplyEditor
                        draftReply={request.aiDraftReply}
                        status={request.status}
                        adminReply={request.adminReply}
                        rejectionReason={request.rejectionReason}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onRegenerate={handleRegenerate}
                        isApproving={isApproving}
                        isRejecting={isRejecting}
                        isRegenerating={isRegenerating}
                    />
                </div>

                {/* Right Column: AI Analysis */}
                <div>
                    <AiAnalysisCard analysis={request.aiAnalysis} />
                </div>
            </div>
        </div>
    );
};

export default RequestDetailPage;
