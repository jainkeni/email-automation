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
            const errData = error.response?.data;
            toast.error(errData?.error || errData?.message || 'Failed to send reply');
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
            const errData = error.response?.data;
            toast.error(errData?.error || errData?.message || 'Failed to reject request');
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
            const errData = error.response?.data;
            toast.error(errData?.error || errData?.message || 'Failed to regenerate draft');
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleGenerateQuotation = async () => {
        setIsGeneratingQuotation(true);
        try {
            const res = await quotationsAPI.analyze(id);
            toast.success('Quotation draft generated successfully!');
            navigate(`/quotations/${res.data.quotation.id}`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to generate quotation');
        } finally {
            setIsGeneratingQuotation(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleString('en-IN', {
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
                ← Back to Requests
            </button>

            <div className="page-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <h1 className="page-title" style={{ fontSize: '22px' }}>
                        {request.subject}
                    </h1>
                    <span className={`badge badge-${request.status}`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                    {request.status === 'pending' && (
                        <button
                            className="btn btn-primary"
                            style={{ marginLeft: 'auto' }}
                            onClick={handleGenerateQuotation}
                            disabled={isGeneratingQuotation}
                        >
                            {isGeneratingQuotation ? 'Generating...' : '📄 Generate Quotation'}
                        </button>
                    )}
                </div>
            </div>

            <div className="detail-layout">
                {/* Left Column: Email Content + Draft Reply */}
                <div>
                    {/* Original Email */}
                    <div className="glass-card" style={{ marginBottom: '24px' }}>
                        <div className="card-header">
                            <span className="card-header-title">📧 Original Email</span>
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
